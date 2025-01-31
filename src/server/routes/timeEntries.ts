import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import { toNSWTime, fromNSWTime, getCurrentNSWTime } from '../../utils/dateTime';

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

    // 1. Verify place with Google Maps
    const placeDetails = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        key: process.env.GOOGLE_MAPS_API_KEY!
      }
    });

    const place = placeDetails.data.result;
    
    // 2. Calculate distance
    const distance = calculateDistance(
      latitude,
      longitude,
      place.geometry.location.lat,
      place.geometry.location.lng
    );

    // 3. Verify distance (100 meters)
    if (distance > 100) {
      return res.status(400).json({ 
        error: 'You must be at the workplace to register time' 
      });
    }

    // 4. Record time entry based on type
    const nswTimestamp = fromNSWTime(new Date(timestamp));
    
    switch (type) {
      case 'clockIn':
        await prisma.timeRecord.create({
          data: {
            userId,
            locationId: parseInt(placeId),
            date: nswTimestamp,
            clockIn: nswTimestamp
          }
        });
        break;

      case 'breakStart':
        await prisma.breakRecord.create({
          data: {
            timeRecordId: (await getCurrentTimeRecord(userId))!.id,
            startTime: nswTimestamp
          }
        });
        break;

      case 'breakEnd':
        await prisma.breakRecord.updateMany({
          where: {
            timeRecordId: (await getCurrentTimeRecord(userId))!.id,
            endTime: null
          },
          data: { endTime: nswTimestamp }
        });
        break;

      case 'clockOut':
        await prisma.timeRecord.update({
          where: { id: (await getCurrentTimeRecord(userId))!.id },
          data: { clockOut: nswTimestamp }
        });
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Time entry error:', error);
    res.status(500).json({ error: 'Failed to record time' });
  }
});

// Helper function to get current time record
async function getCurrentTimeRecord(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.timeRecord.findFirst({
    where: {
      userId,
      date: {
        gte: today
      },
      clockOut: null
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