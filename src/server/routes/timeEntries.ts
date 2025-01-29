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

export { router as timeEntriesRouter };