import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import { toNSWTime, fromNSWTime, getCurrentNSWTime } from '../../utils/dateTime';
import { googleMapsClient } from '../services/googleMapsClient';
import { Prisma, Location, TimeRecord } from '@prisma/client';

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

    console.log('Received verification request:', {
      placeId,
      latitude,
      longitude,
      type,
      userId,
      timestamp
    });

    // Step 1: Find the workplace location using raw query to avoid type issues
    const locations = await prisma.$queryRaw<Location[]>`
      SELECT * FROM "Location" WHERE "placeId" = ${placeId} LIMIT 1
    `;

    if (!locations.length) {
      console.error('Location not found:', placeId);
      return res.status(400).json({
        error: 'Invalid workplace location',
        details: 'Location not found in database'
      });
    }

    const location = locations[0];
    console.log('Found workplace location:', {
      id: location.id,
      name: location.name,
      address: location.address
    });

    // Step 2: Get location coordinates from Google Maps
    try {
      console.log('Fetching place details from Google Maps:', {
        placeId,
        apiKey: process.env.GOOGLE_MAPS_API_KEY ? 'present' : 'missing'
      });

      const placeDetails = await googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          fields: ['geometry'],
          key: process.env.GOOGLE_MAPS_API_KEY!
        }
      });

      console.log('Google Maps API response:', {
        status: placeDetails.data.status,
        hasResult: !!placeDetails.data.result,
        hasGeometry: !!placeDetails.data.result?.geometry,
        hasLocation: !!placeDetails.data.result?.geometry?.location
      });

      if (!placeDetails.data.result?.geometry?.location) {
        console.error('No geometry in place details:', placeDetails.data);
        return res.status(400).json({
          error: 'Invalid location data',
          details: `Could not get location coordinates for ${location.name}`,
          placeId,
          googleMapsStatus: placeDetails.data.status
        });
      }

      const workplace = placeDetails.data.result.geometry.location;
      console.log('Workplace coordinates:', workplace);
      console.log('User coordinates:', { latitude, longitude });

      // Step 3: Calculate and verify distance
      const distance = calculateDistance(
        latitude,
        longitude,
        workplace.lat,
        workplace.lng
      );

      console.log('Distance calculation:', {
        workplace: {
          name: location.name,
          coordinates: workplace,
          placeId: placeId
        },
        user: {
          coordinates: { latitude, longitude },
          accuracy: req.body.accuracy
        },
        distance: Math.round(distance)
      });

      const MAX_DISTANCE = 200; // Increased to 200 meters to account for GPS inaccuracy
      if (distance > MAX_DISTANCE) {
        const errorResponse = {
          error: `You must be within ${MAX_DISTANCE} meters of the workplace to register time`,
          distance: Math.round(distance),
          maxAllowed: MAX_DISTANCE,
          details: `You are ${Math.round(distance)}m away from ${location.name}`,
          coordinates: {
            workplace: { 
              lat: workplace.lat, 
              lng: workplace.lng,
              name: location.name,
              address: location.address,
              placeId: placeId
            },
            user: { 
              lat: latitude, 
              lng: longitude,
              accuracy: req.body.accuracy || 'unknown'
            }
          }
        };
        console.log('Location verification failed:', errorResponse);
        return res.status(400).json(errorResponse);
      }

      // Step 4: Record the time entry
      const nswTimestamp = fromNSWTime(new Date(timestamp));
      const today = new Date(nswTimestamp);
      today.setHours(0, 0, 0, 0);

      // Find existing entry for today using raw query
      const existingEntries = await prisma.$queryRaw<TimeRecord[]>`
        SELECT * FROM "TimeRecord"
        WHERE "userId" = ${userId.toString()}
        AND DATE("date") = ${today}::date
        LIMIT 1
      `;

      let timeEntry;

      if (existingEntries.length) {
        // Update existing entry using raw query
        const updateField = type;
        timeEntry = await prisma.$executeRaw`
          UPDATE "TimeRecord"
          SET ${Prisma.raw(`"${updateField}"`)} = ${nswTimestamp}
          WHERE id = ${existingEntries[0].id}
          RETURNING *
        `;
      } else {
        // Create new entry using raw query
        timeEntry = await prisma.$executeRaw`
          INSERT INTO "TimeRecord" ("userId", "locationId", "date", "${type}", "status")
          VALUES (${userId.toString()}, ${location.id}, ${today}, ${nswTimestamp}, 'active')
          RETURNING *
        `;
      }

      console.log('Time entry recorded:', timeEntry);

      return res.json({
        success: true,
        message: 'Location verified and time recorded',
        data: {
          timeEntry,
          distance: Math.round(distance)
        }
      });

    } catch (error) {
      console.error('Google Maps API error:', error);
      return res.status(500).json({
        error: 'Failed to verify location with Google Maps',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      error: 'Failed to verify location',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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