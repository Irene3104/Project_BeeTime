import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import { toNSWTime, fromNSWTime, getCurrentNSWTime } from '../../utils/dateTime';
import { googleMapsClient } from '../services/googleMapsClient';
import { Prisma, Location, TimeRecord } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';

const router = Router();
const TIMEZONE = 'Australia/Sydney';

const timeEntrySchema = z.object({
  date: z.string(),
  clockIn: z.string(),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  clockOut: z.string().optional(),
});

const locationVerificationSchema = z.object({
  placeId: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional(),
  type: z.enum(['clockIn', 'breakStart', 'breakEnd', 'clockOut']),
  timestamp: z.string()
});

router.post('/', validateRequest(timeEntrySchema), async (req, res) => {
  const nswTime = getCurrentNSWTime();
  
  if (!req.user || !req.user.locationId) {
    return res.status(400).json({ error: '근무지 정보가 없습니다.' });
  }

  const timeEntry = await prisma.timeRecord.create({
    data: {
      userId: req.user.id,
      locationId: req.user.locationId,
      date: fromNSWTime(nswTime),
      clockIn: fromNSWTime(nswTime),
    }
  });
  
  res.json(timeEntry);
});

router.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const timeEntries = await prisma.timeRecord.findMany({
    where: { userId: req.user.id },
    include: { breaks: true }
  });
  
  // NSW 시간대로 변환하여 응답
  const formattedEntries = timeEntries.map(entry => ({
    ...entry,
    date: toNSWTime(entry.date),
    clockIn: toNSWTime(entry.clockIn),
    clockOut: entry.clockOut ? toNSWTime(entry.clockOut) : null,
    breaks: entry.breaks.map(breakRecord => ({
      ...breakRecord,
      startTime: toNSWTime(breakRecord.startTime),
      endTime: breakRecord.endTime ? toNSWTime(breakRecord.endTime) : null
    }))
  }));
  
  res.json(formattedEntries);
});

router.patch('/:id', validateRequest(timeEntrySchema.partial()), async (req, res) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const timeEntry = await prisma.timeRecord.update({
    where: { id: Number(id), userId },
    data: req.body,
  });
  res.json(timeEntry);
});

router.post('/verify-location', validateRequest(locationVerificationSchema), async (req, res) => {
  try {
    const { placeId, latitude, longitude, type, timestamp } = req.body;
    const userId = req.user!.id;
    
    // Convert incoming timestamp to Sydney time
    const sydneyTime = new Date(formatInTimeZone(
      new Date(timestamp),
      TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    ));
    
    console.log('Received timestamp (UTC):', timestamp);
    console.log('Sydney time:', sydneyTime);
    console.log('Request type:', type);

    // Get start of day in Sydney time
    const sydneyStartOfDay = new Date(sydneyTime);
    sydneyStartOfDay.setHours(0, 0, 0, 0);
    
    console.log('Start of day (Sydney):', sydneyStartOfDay);

    // First check if there's an existing time record for today
    const existingTimeRecord = await prisma.timeRecord.findFirst({
      where: {
        userId,
        date: {
          // Use proper date comparison for Prisma
          gte: sydneyStartOfDay,
          lt: new Date(sydneyStartOfDay.getTime() + 24 * 60 * 60 * 1000) // Add 24 hours
        }
      }
    });

    if (type === 'clockIn') {
      if (existingTimeRecord) {
        return res.status(400).json({
          error: 'Already clocked in for today',
          details: 'You already have a time record for today'
        });
      }

      // Find the location by placeId
      const location = await prisma.location.findUnique({
        where: { placeId }
      });

      if (!location) {
        return res.status(404).json({
          error: 'Location not found',
          details: 'The specified location does not exist'
        });
      }

      // Convert timestamp to UTC for storage
      const utcTimestamp = new Date(sydneyTime);
      
      // Create new time record if none exists
      const timeRecord = await prisma.timeRecord.create({
        data: {
          userId,
          locationId: location.id,
          date: sydneyStartOfDay,
          clockIn: utcTimestamp,
          status: 'active'
        }
      });
      
      return res.json({ 
        success: true, 
        message: 'Successfully clocked in',
        data: {
          ...timeRecord,
          clockIn: toNSWTime(timeRecord.clockIn), // Convert back to Sydney time for response
          date: toNSWTime(timeRecord.date)
        }
      });
    }

    // For BREAK_START, similar conversion needed
    if (type === 'breakStart') {
      // Check if there's an existing time record
      if (!existingTimeRecord) {
        return res.status(400).json({
          error: 'No active time record',
          details: 'You need to clock in first before starting a break'
        });
      }

      const utcTimestamp = new Date(sydneyTime);
      
      const breakRecord = await prisma.breakRecord.create({
        data: {
          timeRecordId: existingTimeRecord.id,
          startTime: utcTimestamp
        }
      });

      return res.json({
        success: true,
        message: 'Break started successfully',
        data: {
          ...breakRecord,
          startTime: toNSWTime(breakRecord.startTime)
        }
      });
    }

    // For breakEnd
    if (type === 'breakEnd') {
      // Check if there's an existing time record
      if (!existingTimeRecord) {
        return res.status(400).json({
          error: 'No active time record',
          details: 'You need to clock in first before ending a break'
        });
      }

      // Find the most recent break that hasn't ended yet
      const activeBreak = await prisma.breakRecord.findFirst({
        where: {
          timeRecordId: existingTimeRecord.id,
          endTime: null
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      if (!activeBreak) {
        return res.status(400).json({
          error: 'No active break',
          details: 'You need to start a break before ending it'
        });
      }

      const utcTimestamp = new Date(sydneyTime);
      
      // Update the break record with end time
      const updatedBreak = await prisma.breakRecord.update({
        where: { id: activeBreak.id },
        data: { endTime: utcTimestamp }
      });

      return res.json({
        success: true,
        message: 'Break ended successfully',
        data: {
          ...updatedBreak,
          startTime: toNSWTime(updatedBreak.startTime),
          endTime: toNSWTime(updatedBreak.endTime!)
        }
      });
    }

    // For clockOut
    if (type === 'clockOut') {
      // Check if there's an existing time record
      if (!existingTimeRecord) {
        return res.status(400).json({
          error: 'No active time record',
          details: 'You need to clock in first before clocking out'
        });
      }

      // Check if there are any active breaks
      const activeBreak = await prisma.breakRecord.findFirst({
        where: {
          timeRecordId: existingTimeRecord.id,
          endTime: null
        }
      });

      if (activeBreak) {
        return res.status(400).json({
          error: 'Active break',
          details: 'You need to end your break before clocking out'
        });
      }

      const utcTimestamp = new Date(sydneyTime);
      
      // Update the time record with clock out time
      const updatedTimeRecord = await prisma.timeRecord.update({
        where: { id: existingTimeRecord.id },
        data: { 
          clockOut: utcTimestamp,
          status: 'completed'
        }
      });

      return res.json({
        success: true,
        message: 'Clocked out successfully',
        data: {
          ...updatedTimeRecord,
          clockIn: toNSWTime(updatedTimeRecord.clockIn),
          clockOut: toNSWTime(updatedTimeRecord.clockOut!),
          date: toNSWTime(updatedTimeRecord.date)
        }
      });
    }

    // If we get here, the action type wasn't handled
    return res.status(400).json({
      error: 'Invalid action type',
      details: `Action type '${type}' is not supported`
    });

  } catch (error) {
    console.error('Error in verify-location:', error);
    
    // Add more detailed error information
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error message:', error.message);
      console.error('Prisma error meta:', error.meta);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('Prisma validation error:', error.message);
    }
    
    return res.status(500).json({
      error: 'Failed to process time entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to get current time record
async function getCurrentTimeRecord(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return await prisma.timeRecord.findFirst({
    where: {
      userId,
      date: { 
        gte: today,
        lt: tomorrow
      },
      clockOut: { equals: null }
    }
  });
}

// Helper function to calculate distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Test endpoint for date handling
router.get('/test-date', async (req, res) => {
  try {
    const now = new Date();
    const sydneyTime = formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    
    const sydneyDate = new Date(sydneyTime);
    sydneyDate.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(sydneyDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Test query to check date handling
    const testQuery = await prisma.timeRecord.findMany({
      where: {
        date: {
          gte: sydneyDate,
          lt: tomorrow
        }
      },
      take: 5
    });
    
    res.json({
      currentTime: {
        utc: now.toISOString(),
        sydney: sydneyTime
      },
      sydneyDate: sydneyDate.toISOString(),
      tomorrow: tomorrow.toISOString(),
      testQueryResults: testQuery.length,
      testQuerySample: testQuery
    });
  } catch (error) {
    console.error('Error in test-date endpoint:', error);
    res.status(500).json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as timeEntriesRouter };