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
  clockInTime: z.string(),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional(),
  clockOutTime: z.string().optional(),
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
      clockInTime: fromNSWTime(nswTime),
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
    clockInTime: toNSWTime(entry.clockInTime),
    clockOutTime: entry.clockOutTime ? toNSWTime(entry.clockOutTime) : null,
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

    // Format date as string in DD-MM-YYYY format for the database (changed from YYYY-MM-DD)
    const dateString = formatInTimeZone(sydneyTime, TIMEZONE, 'dd-MM-yyyy');
    const timeString = formatInTimeZone(sydneyTime, TIMEZONE, 'HH:mm');
    console.log('Date string for query:', dateString);
    console.log('Time string for storage:', timeString);

    // First check if there's an existing time record for today
    const existingTimeRecord = await prisma.timeRecord.findFirst({
      where: {
        userId,
        date: dateString // Use string format instead of DateTime object
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
      
      // Create new time record if none exists
      const timeRecord = await prisma.timeRecord.create({
        data: {
          userId,
          locationId: location.id,
          date: dateString,
          clockInTime: timeString,
          status: 'active'
        }
      });
      
      return res.json({ 
        success: true, 
        message: 'Successfully clocked in',
        data: timeRecord
      });
    }
    
    // For breakStart
    if (type === 'breakStart') {
      // Check if there's an existing time record
      if (!existingTimeRecord) {
        return res.status(400).json({
          error: 'No active time record',
          details: 'You need to clock in first before starting a break'
        });
      }
      
      // Check if break is already active
      if (existingTimeRecord.breakStartTime && !existingTimeRecord.breakEndTime) {
        return res.status(400).json({
          error: 'Break already active',
          details: 'You already have an active break'
        });
      }
      
      // Update the time record with break start time
      const updatedTimeRecord = await prisma.timeRecord.update({
        where: { id: existingTimeRecord.id },
        data: { 
          breakStartTime: timeString,
          status: 'break'
        }
      });
      
      return res.json({
        success: true,
        message: 'Break started successfully',
        data: updatedTimeRecord
      });
    }
    
    // For breakEnd
    if (type === 'breakEnd') {
      // Check if there's an existing time record
      if (!existingTimeRecord) {
        return res.status(400).json({
          error: 'No active time record',
          details: 'You need to clock in and start a break first before ending a break'
        });
      }
      
      // Check if break is active
      if (!existingTimeRecord.breakStartTime) {
        return res.status(400).json({
          error: 'No active break',
          details: 'You need to start a break first before ending it'
        });
      }
      
      // Check if break is already ended
      if (existingTimeRecord.breakStartTime && existingTimeRecord.breakEndTime) {
        return res.status(400).json({
          error: 'Break already ended',
          details: 'This break has already been ended'
        });
      }
      
      try {
        // Calculate break minutes
        const breakStart = new Date(`${dateString}T${existingTimeRecord.breakStartTime}:00`);
        const breakEnd = new Date(`${dateString}T${timeString}:00`);
        
        // Ensure both dates are valid
        if (isNaN(breakStart.getTime()) || isNaN(breakEnd.getTime())) {
          console.error('Invalid date calculation:', {
            dateString,
            breakStartTime: existingTimeRecord.breakStartTime,
            timeString
          });
          return res.status(400).json({
            error: 'Invalid time format',
            details: 'Could not calculate break duration due to invalid time format'
          });
        }
        
        // Handle case where break ends on the next day
        let breakMinutes = Math.round((breakEnd.getTime() - breakStart.getTime()) / 60000);
        
        // If breakMinutes is negative, assume break ended on the next day
        if (breakMinutes < 0) {
          const nextDayBreakEnd = new Date(`${dateString}T${timeString}:00`);
          nextDayBreakEnd.setDate(nextDayBreakEnd.getDate() + 1);
          breakMinutes = Math.round((nextDayBreakEnd.getTime() - breakStart.getTime()) / 60000);
        }
        
        // Ensure breakMinutes is at least 1 minute
        breakMinutes = Math.max(1, breakMinutes);
        
        console.log('Calculated break minutes:', breakMinutes);
        
        // Update the time record with break end time
        const updatedTimeRecord = await prisma.timeRecord.update({
          where: { id: existingTimeRecord.id },
          data: { 
            breakEndTime: timeString,
            breakMinutes: breakMinutes,
            status: 'active'
          }
        });
        
        return res.json({
          success: true,
          message: 'Break ended successfully',
          data: updatedTimeRecord
        });
      } catch (error) {
        console.error('Error processing breakEnd:', error);
        return res.status(500).json({
          error: 'Failed to process time entry',
          details: 'An error occurred while calculating break duration'
        });
      }
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

      // Check if break is still active
      if (existingTimeRecord.breakStartTime && !existingTimeRecord.breakEndTime) {
        return res.status(400).json({
          error: 'Active break',
          details: 'You need to end your break before clocking out'
        });
      }
      
      // Calculate working hours
      const clockIn = new Date(`${dateString}T${existingTimeRecord.clockInTime}:00`);
      const clockOut = new Date(`${dateString}T${timeString}:00`);
      let workingMinutes = (clockOut.getTime() - clockIn.getTime()) / 60000;
      
      // Subtract break time if there was a break
      if (existingTimeRecord.breakMinutes) {
        workingMinutes -= existingTimeRecord.breakMinutes;
      }
      
      const workingHours = Math.round(workingMinutes / 60 * 10) / 10; // Round to 1 decimal place
      
      // Update the time record with clock out time
      const updatedTimeRecord = await prisma.timeRecord.update({
        where: { id: existingTimeRecord.id },
        data: { 
          clockOutTime: timeString,
          workingHours: workingHours,
          status: 'completed'
        }
      });

      return res.json({
        success: true,
        message: 'Clocked out successfully',
        data: updatedTimeRecord
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
  const dateString = formatInTimeZone(today, TIMEZONE, 'dd-MM-yyyy');
  
  return await prisma.timeRecord.findFirst({
    where: {
      userId,
      date: dateString,
      clockOutTime: null
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
    const dateString = formatInTimeZone(now, TIMEZONE, "dd-MM-yyyy");
    
    // Test query to check date handling
    const testQuery = await prisma.timeRecord.findMany({
      where: {
        date: dateString
      },
      take: 5
    });
    
    res.json({
      currentTime: {
        utc: now.toISOString(),
        sydney: sydneyTime
      },
      dateString,
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

// Endpoint to clear today's time record (for testing purposes)
router.post('/clear-today', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const today = new Date();
    const dateString = formatInTimeZone(today, TIMEZONE, 'dd-MM-yyyy');
    
    console.log(`Attempting to clear time record for user ${userId} on date ${dateString}`);
    
    // Find and delete today's time record
    const deletedRecord = await prisma.timeRecord.deleteMany({
      where: {
        userId,
        date: dateString
      }
    });
    
    console.log('Delete operation result:', deletedRecord);
    
    return res.json({
      success: true,
      message: `Cleared ${deletedRecord.count} time records for today`,
      count: deletedRecord.count
    });
  } catch (error) {
    console.error('Error clearing today\'s time record:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code);
      console.error('Prisma error message:', error.message);
    }
    
    return res.status(500).json({
      error: 'Failed to clear time record',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Diagnostic endpoint to check TimeRecord model structure
router.get('/debug-model', async (req, res) => {
  try {
    // Get a sample record
    const sampleRecord = await prisma.timeRecord.findFirst();
    
    // Get the Prisma model metadata
    const modelInfo = {
      modelName: 'TimeRecord',
      fields: Object.keys(prisma.timeRecord.fields),
      sample: sampleRecord ? {
        id: sampleRecord.id,
        date: sampleRecord.date,
        userId: sampleRecord.userId,
        status: sampleRecord.status,
        fieldTypes: {
          date: typeof sampleRecord.date,
          clockInTime: typeof sampleRecord.clockInTime,
          clockOutTime: typeof sampleRecord.clockOutTime,
          breakStartTime: typeof sampleRecord.breakStartTime,
          breakEndTime: typeof sampleRecord.breakEndTime,
          workingHours: typeof sampleRecord.workingHours,
          breakMinutes: typeof sampleRecord.breakMinutes
        }
      } : null
    };
    
    res.json({
      modelInfo,
      prismaClientVersion: prisma._engineConfig.version
    });
  } catch (error) {
    console.error('Error in debug-model endpoint:', error);
    res.status(500).json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as timeEntriesRouter };