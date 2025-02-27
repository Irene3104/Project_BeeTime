import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import { toNSWTime, fromNSWTime, getCurrentNSWTime } from '../../utils/dateTime';
import { formatInTimeZone } from 'date-fns-tz';

const router = Router();
const TIMEZONE = 'Australia/Sydney';

// 시간 기록 조회 스키마
const timeRecordsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// 시간 기록 생성 스키마
const timeRecordCreateSchema = z.object({
  date: z.string(),
  clockInTime: z.string(),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional(),
  clockOutTime: z.string().optional()
});

// 시간 기록 업데이트 스키마
const timeRecordUpdateSchema = z.object({
  clockInTime: z.string().optional(),
  breakStartTime: z.string().optional(),
  breakEndTime: z.string().optional(),
  clockOutTime: z.string().optional()
});

// 시간 기록 조회 API
router.get('/', validateRequest(timeRecordsQuerySchema, 'query'), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
    
    // 날짜 필터 조건 설정
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // 시간 기록 조회
    const timeRecords = await prisma.timeRecord.findMany({
      where: { 
        userId: req.user.id,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      },
      include: { breaks: true },
      orderBy: { date: 'asc' }
    });
    
    // 프론트엔드에 맞게 데이터 포맷팅
    const formattedRecords = timeRecords.map(record => {
      // 첫 번째 휴식 시간 가져오기 (프론트엔드에서는 하나의 휴식만 처리)
      const firstBreak = record.breaks[0];
      
      return {
        date: record.date.toISOString().split('T')[0], // YYYY-MM-DD 형식
        clockInTime: record.clockIn ? formatInTimeZone(record.clockIn, TIMEZONE, 'HH:mm') : null,
        breakStartTime: firstBreak?.startTime ? formatInTimeZone(firstBreak.startTime, TIMEZONE, 'HH:mm') : null,
        breakEndTime: firstBreak?.endTime ? formatInTimeZone(firstBreak.endTime, TIMEZONE, 'HH:mm') : null,
        clockOutTime: record.clockOut ? formatInTimeZone(record.clockOut, TIMEZONE, 'HH:mm') : null
      };
    });
    
    res.json(formattedRecords);
  } catch (error) {
    console.error('시간 기록 조회 오류:', error);
    res.status(500).json({ error: '시간 기록을 조회하는 중 오류가 발생했습니다.' });
  }
});

// 시간 기록 생성 API
router.post('/', validateRequest(timeRecordCreateSchema), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const { date, clockInTime, breakStartTime, breakEndTime, clockOutTime } = req.body;
    
    // 날짜 변환
    const recordDate = new Date(date);
    
    // 시간 문자열을 Date 객체로 변환하는 함수
    const parseTimeToDate = (dateStr: string, timeStr: string | undefined) => {
      if (!timeStr) return null;
      
      const [hours, minutes] = timeStr.split(':').map(Number);
      const newDate = new Date(dateStr);
      newDate.setHours(hours, minutes, 0, 0);
      return newDate;
    };
    
    // 시간 기록 생성
    const timeRecord = await prisma.timeRecord.create({
      data: {
        userId: req.user.id,
        locationId: req.user.locationId || 1, // 기본 위치 ID 설정
        date: recordDate,
        clockIn: parseTimeToDate(date, clockInTime),
        clockOut: parseTimeToDate(date, clockOutTime),
      }
    });
    
    // 휴식 시간이 있는 경우 생성
    if (breakStartTime) {
      await prisma.breakRecord.create({
        data: {
          timeRecordId: timeRecord.id,
          startTime: parseTimeToDate(date, breakStartTime) as Date,
          endTime: parseTimeToDate(date, breakEndTime)
        }
      });
    }
    
    res.status(201).json({ message: '시간 기록이 생성되었습니다.' });
  } catch (error) {
    console.error('시간 기록 생성 오류:', error);
    res.status(500).json({ error: '시간 기록을 생성하는 중 오류가 발생했습니다.' });
  }
});

// 시간 기록 업데이트 API
router.patch('/:id', validateRequest(timeRecordUpdateSchema), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const { id } = req.params;
    const { clockInTime, breakStartTime, breakEndTime, clockOutTime } = req.body;
    
    // 기존 시간 기록 조회
    const existingRecord = await prisma.timeRecord.findFirst({
      where: { id: Number(id), userId: req.user.id },
      include: { breaks: true }
    });
    
    if (!existingRecord) {
      return res.status(404).json({ error: '시간 기록을 찾을 수 없습니다.' });
    }
    
    // 시간 문자열을 Date 객체로 변환하는 함수
    const parseTimeToDate = (baseDate: Date, timeStr: string | undefined) => {
      if (!timeStr) return null;
      
      const [hours, minutes] = timeStr.split(':').map(Number);
      const newDate = new Date(baseDate);
      newDate.setHours(hours, minutes, 0, 0);
      return newDate;
    };
    
    // 시간 기록 업데이트
    const updatedRecord = await prisma.timeRecord.update({
      where: { id: Number(id) },
      data: {
        clockIn: clockInTime ? parseTimeToDate(existingRecord.date, clockInTime) : existingRecord.clockIn,
        clockOut: clockOutTime ? parseTimeToDate(existingRecord.date, clockOutTime) : existingRecord.clockOut
      }
    });
    
    // 휴식 시간 업데이트
    if (breakStartTime || breakEndTime) {
      // 기존 휴식 시간이 있는지 확인
      const existingBreak = existingRecord.breaks[0];
      
      if (existingBreak) {
        // 기존 휴식 시간 업데이트
        await prisma.breakRecord.update({
          where: { id: existingBreak.id },
          data: {
            startTime: breakStartTime ? parseTimeToDate(existingRecord.date, breakStartTime) as Date : existingBreak.startTime,
            endTime: breakEndTime ? parseTimeToDate(existingRecord.date, breakEndTime) : existingBreak.endTime
          }
        });
      } else if (breakStartTime) {
        // 새 휴식 시간 생성
        await prisma.breakRecord.create({
          data: {
            timeRecordId: existingRecord.id,
            startTime: parseTimeToDate(existingRecord.date, breakStartTime) as Date,
            endTime: breakEndTime ? parseTimeToDate(existingRecord.date, breakEndTime) : null
          }
        });
      }
    }
    
    res.json({ message: '시간 기록이 업데이트되었습니다.' });
  } catch (error) {
    console.error('시간 기록 업데이트 오류:', error);
    res.status(500).json({ error: '시간 기록을 업데이트하는 중 오류가 발생했습니다.' });
  }
});

// 시간 기록 삭제 API
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const { id } = req.params;
    
    // 기존 시간 기록 조회
    const existingRecord = await prisma.timeRecord.findFirst({
      where: { id: Number(id), userId: req.user.id }
    });
    
    if (!existingRecord) {
      return res.status(404).json({ error: '시간 기록을 찾을 수 없습니다.' });
    }
    
    // 관련 휴식 시간 삭제
    await prisma.breakRecord.deleteMany({
      where: { timeRecordId: Number(id) }
    });
    
    // 시간 기록 삭제
    await prisma.timeRecord.delete({
      where: { id: Number(id) }
    });
    
    res.json({ message: '시간 기록이 삭제되었습니다.' });
  } catch (error) {
    console.error('시간 기록 삭제 오류:', error);
    res.status(500).json({ error: '시간 기록을 삭제하는 중 오류가 발생했습니다.' });
  }
});

export { router as timeRecordsRouter }; 