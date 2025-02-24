import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import { toNSWTime, fromNSWTime, getCurrentNSWTime } from '../../utils/dateTime';
import { googleMapsClient } from '../services/googleMapsClient';
import { Prisma, Location, TimeRecord } from '@prisma/client';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const router = Router();

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
    
    // Convert the timestamp to Sydney timezone
    const TIMEZONE = 'Australia/Sydney';
    const sydneyTime = utcToZonedTime(new Date(timestamp), TIMEZONE);
    
    // Get the start of day in Sydney time
    const currentDate = new Date(sydneyTime);
    currentDate.setHours(0, 0, 0, 0);
    
    console.log('Timestamp received:', timestamp);
    console.log('Sydney time:', sydneyTime);
    console.log('Current date:', currentDate);

    // First check if there's an existing time record for today
    const existingTimeRecord = await prisma.timeRecord.findFirst({
      where: {
        userId,
        date: currentDate
      }
    });

    if (type === 'CLOCK_IN') {
      if (existingTimeRecord) {
        return res.status(400).json({
          error: 'Already clocked in for today',
          details: 'You already have a time record for today'
        });
      }

      // Create new time record if none exists
      const timeRecord = await prisma.timeRecord.create({
        data: {
          userId,
          locationId: location.id,
          date: currentDate,
          clockIn: new Date(timestamp),
          status: 'active'
        }
      });
      
      return res.json({ 
        success: true, 
        message: 'Successfully clocked in',
        data: timeRecord 
      });
    }

    // For other actions (BREAK_START, BREAK_END, CLOCK_OUT), we need an existing record
    if (!existingTimeRecord) {
      return res.status(400).json({
        error: 'No time record found',
        details: 'Please clock in first'
      });
    }

    // Handle other types based on existing record
    switch (type) {
      case 'BREAK_START':
        // Check if there's an active break
        const activeBreak = await prisma.breakRecord.findFirst({
          where: {
            timeRecordId: existingTimeRecord.id,
            endTime: null
          }
        });

        if (activeBreak) {
          return res.status(400).json({
            error: 'Break already started',
            details: 'Please end your current break first'
          });
        }

        const breakRecord = await prisma.breakRecord.create({
          data: {
            timeRecordId: existingTimeRecord.id,
            startTime: new Date(timestamp)
          }
        });

        return res.json({
          success: true,
          message: 'Break started successfully',
          data: breakRecord
        });

      // Add other cases as needed
    }

  } catch (error) {
    console.error('Error in verify-location:', error);
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
  return await prisma.timeRecord.findFirst({
    where: {
      userId,
      date: { gte: today },
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

export { router as timeEntriesRouter };