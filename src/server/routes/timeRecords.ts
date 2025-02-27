import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import { formatInTimeZone } from 'date-fns-tz';
import { format } from 'date-fns';

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
    
    console.log(`[TimeRecords] 조회 요청 - 사용자: ${req.user.id}, 기간: ${startDate} ~ ${endDate}`);
    
    // 날짜 필터 조건 설정
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
        OR: [
          {
            date: {
              gte: startDate,
              ...(endDate ? { lte: endDate } : {})
            }
          }
        ]
      };
    }

    // 시간 기록 조회
    const timeRecords = await prisma.timeRecord.findMany({
      where: { 
        userId: req.user.id,
        ...dateFilter
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`[TimeRecords] 조회 결과 - ${timeRecords.length}개 기록 찾음`);
    
    // 프론트엔드에 맞게 데이터 포맷팅
    const formattedRecords = timeRecords.map(record => {
      return {
        id: record.id,
        date: record.date,
        clockInTime: record.clockInTime,
        breakStartTime: record.breakStartTime || null,
        breakEndTime: record.breakEndTime || null,
        clockOutTime: record.clockOutTime || null,
        workingHours: record.workingHours
      };
    });
    
    res.json(formattedRecords);
  } catch (error) {
    console.error('[TimeRecords] 시간 기록 조회 오류:', error);
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
    
    console.log(`[TimeRecords] 생성 요청 - 사용자: ${req.user.id}, 날짜: ${date}`);
    
    // 이미 해당 날짜에 기록이 있는지 확인
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        userId: req.user.id,
        date: date
      }
    });

    if (existingRecord) {
      return res.status(400).json({ error: '해당 날짜에 이미 시간 기록이 존재합니다.' });
    }
    
    // 근무 시간 계산
    let workingHours = 0;
    if (clockInTime && clockOutTime) {
      const [inHour, inMinute] = clockInTime.split(':').map(Number);
      const [outHour, outMinute] = clockOutTime.split(':').map(Number);
      
      let totalMinutes = (outHour * 60 + outMinute) - (inHour * 60 + inMinute);
      
      // 휴식 시간 계산
      if (breakStartTime && breakEndTime) {
        const [breakInHour, breakInMinute] = breakStartTime.split(':').map(Number);
        const [breakOutHour, breakOutMinute] = breakEndTime.split(':').map(Number);
        
        const breakMinutes = (breakOutHour * 60 + breakOutMinute) - (breakInHour * 60 + breakInMinute);
        totalMinutes -= breakMinutes;
      }
      
      workingHours = totalMinutes / 60;
    }
    
    // 시간 기록 생성
    const timeRecord = await prisma.timeRecord.create({
      data: {
        userId: req.user.id,
        locationId: req.user.locationId || 1, // 기본 위치 ID 설정
        date: date,
        clockInTime: clockInTime,
        clockOutTime: clockOutTime || null,
        breakStartTime: breakStartTime || null,
        breakEndTime: breakEndTime || null,
        breakMinutes: breakStartTime && breakEndTime ? calculateBreakMinutes(breakStartTime, breakEndTime) : 0,
        workingHours: workingHours,
        status: clockOutTime ? 'completed' : 'active',
        note: `Created on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`
      }
    });
    
    console.log(`[TimeRecords] 생성 완료 - ID: ${timeRecord.id}`);
    
    res.status(201).json({
      id: timeRecord.id,
      date: timeRecord.date,
      clockInTime: timeRecord.clockInTime,
      breakStartTime: timeRecord.breakStartTime,
      breakEndTime: timeRecord.breakEndTime,
      clockOutTime: timeRecord.clockOutTime,
      workingHours: timeRecord.workingHours
    });
  } catch (error) {
    console.error('[TimeRecords] 시간 기록 생성 오류:', error);
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
    
    console.log(`[TimeRecords] 업데이트 요청 - ID: ${id}, 사용자: ${req.user.id}`);
    
    // 기존 시간 기록 조회
    const existingRecord = await prisma.timeRecord.findFirst({
      where: { id: Number(id), userId: req.user.id }
    });
    
    if (!existingRecord) {
      return res.status(404).json({ error: '시간 기록을 찾을 수 없습니다.' });
    }
    
    // 업데이트할 데이터 준비
    const updateData: any = {};
    
    if (clockInTime) updateData.clockInTime = clockInTime;
    if (breakStartTime) updateData.breakStartTime = breakStartTime;
    if (breakEndTime) updateData.breakEndTime = breakEndTime;
    if (clockOutTime) updateData.clockOutTime = clockOutTime;
    
    // 근무 시간 계산
    const finalClockInTime = clockInTime || existingRecord.clockInTime;
    const finalClockOutTime = clockOutTime || existingRecord.clockOutTime;
    const finalBreakStartTime = breakStartTime || existingRecord.breakStartTime;
    const finalBreakEndTime = breakEndTime || existingRecord.breakEndTime;
    
    if (finalClockInTime && finalClockOutTime) {
      let workingHours = calculateWorkingHours(
        finalClockInTime, 
        finalClockOutTime, 
        finalBreakStartTime, 
        finalBreakEndTime
      );
      updateData.workingHours = workingHours;
      
      // 휴식 시간 계산
      if (finalBreakStartTime && finalBreakEndTime) {
        updateData.breakMinutes = calculateBreakMinutes(finalBreakStartTime, finalBreakEndTime);
      }
    }
    
    // 상태 업데이트
    if (clockOutTime && !existingRecord.clockOutTime) {
      updateData.status = 'completed';
    }
    
    // 시간 기록 업데이트
    const updatedRecord = await prisma.timeRecord.update({
      where: { id: Number(id) },
      data: updateData
    });
    
    console.log(`[TimeRecords] 업데이트 완료 - ID: ${id}`);
    
    res.json({
      id: updatedRecord.id,
      date: updatedRecord.date,
      clockInTime: updatedRecord.clockInTime,
      breakStartTime: updatedRecord.breakStartTime,
      breakEndTime: updatedRecord.breakEndTime,
      clockOutTime: updatedRecord.clockOutTime,
      workingHours: updatedRecord.workingHours
    });
  } catch (error) {
    console.error('[TimeRecords] 시간 기록 업데이트 오류:', error);
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
    
    console.log(`[TimeRecords] 삭제 요청 - ID: ${id}, 사용자: ${req.user.id}`);
    
    // 기존 시간 기록 조회
    const existingRecord = await prisma.timeRecord.findFirst({
      where: { id: Number(id), userId: req.user.id }
    });
    
    if (!existingRecord) {
      return res.status(404).json({ error: '시간 기록을 찾을 수 없습니다.' });
    }
    
    // 시간 기록 삭제
    await prisma.timeRecord.delete({
      where: { id: Number(id) }
    });
    
    console.log(`[TimeRecords] 삭제 완료 - ID: ${id}`);
    
    res.json({ message: '시간 기록이 삭제되었습니다.' });
  } catch (error) {
    console.error('[TimeRecords] 시간 기록 삭제 오류:', error);
    res.status(500).json({ error: '시간 기록을 삭제하는 중 오류가 발생했습니다.' });
  }
});

// 휴식 시간 계산 (분 단위)
function calculateBreakMinutes(breakStartTime: string, breakEndTime: string): number {
  const [startHour, startMinute] = breakStartTime.split(':').map(Number);
  const [endHour, endMinute] = breakEndTime.split(':').map(Number);
  
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

// 근무 시간 계산 (시간 단위)
function calculateWorkingHours(
  clockInTime: string, 
  clockOutTime: string, 
  breakStartTime: string | null, 
  breakEndTime: string | null
): number {
  const [inHour, inMinute] = clockInTime.split(':').map(Number);
  const [outHour, outMinute] = clockOutTime.split(':').map(Number);
  
  let totalMinutes = (outHour * 60 + outMinute) - (inHour * 60 + inMinute);
  
  // 휴식 시간 제외
  if (breakStartTime && breakEndTime) {
    const breakMinutes = calculateBreakMinutes(breakStartTime, breakEndTime);
    totalMinutes -= breakMinutes;
  }
  
  return parseFloat((totalMinutes / 60).toFixed(1));
}

export { router as timeRecordsRouter };