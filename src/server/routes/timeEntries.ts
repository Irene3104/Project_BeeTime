import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { validateRequest } from '../middleware/validateRequest';
import { authenticate } from '../middleware/authenticate';
import { toNSWTime, fromNSWTime, getCurrentNSWTime } from '../../utils/dateTime';
import { googleMapsClient as googleMapsService } from '../services/googleMapsClient';
import { Prisma, Location, TimeRecord } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { Client } from '@googlemaps/google-maps-services-js';

const router = Router();
const TIMEZONE = 'Australia/Sydney';

// Google Maps 클라이언트 초기화 - 이름 변경
const mapsClient = new Client({});

// 헬퍼 함수들을 라우터 정의 전에 선언
const convertTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const convertMinutesToTimeString = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const calculateBreakMinutes = (timeRecord: any): number => {
  let totalBreakMinutes = 0;
  console.log("계산 전 레코드:", timeRecord); // 디버깅용

  // 시간 형식을 분으로 변환하는 내부 함수
  const convertTimeToMinutes = (time: string | null): number => {
    if (!time) return 0;
    
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Break 1
  if (timeRecord.breakStartTime1 && timeRecord.breakEndTime1) {
    const breakStart1 = convertTimeToMinutes(timeRecord.breakStartTime1);
    const breakEnd1 = convertTimeToMinutes(timeRecord.breakEndTime1);
    const break1Minutes = breakEnd1 - breakStart1;
    console.log(`Break 1: ${breakStart1}분 ~ ${breakEnd1}분 = ${break1Minutes}분`);
    if (break1Minutes > 0) totalBreakMinutes += break1Minutes;
  }

  // Break 2
  if (timeRecord.breakStartTime2 && timeRecord.breakEndTime2) {
    const breakStart2 = convertTimeToMinutes(timeRecord.breakStartTime2);
    const breakEnd2 = convertTimeToMinutes(timeRecord.breakEndTime2);
    const break2Minutes = breakEnd2 - breakStart2;
    console.log(`Break 2: ${breakStart2}분 ~ ${breakEnd2}분 = ${break2Minutes}분`);
    if (break2Minutes > 0) totalBreakMinutes += break2Minutes;
  }

  // Break 3
  if (timeRecord.breakStartTime3 && timeRecord.breakEndTime3) {
    const breakStart3 = convertTimeToMinutes(timeRecord.breakStartTime3);
    const breakEnd3 = convertTimeToMinutes(timeRecord.breakEndTime3);
    const break3Minutes = breakEnd3 - breakStart3;
    console.log(`Break 3: ${breakStart3}분 ~ ${breakEnd3}분 = ${break3Minutes}분`);
    if (break3Minutes > 0) totalBreakMinutes += break3Minutes;
  }

  console.log(`총 휴식 시간: ${totalBreakMinutes}분`);
  return Math.max(0, totalBreakMinutes);
};

const calculateWorkingHours = (timeRecord: any): number => {
  if (!timeRecord.clockInTime || !timeRecord.clockOutTime) {
    return 0;
  }

  const clockInMinutes = convertTimeToMinutes(timeRecord.clockInTime);
  const clockOutMinutes = convertTimeToMinutes(timeRecord.clockOutTime);
  const breakMinutes = calculateBreakMinutes(timeRecord);

  const totalWorkingMinutes = Math.max(0, clockOutMinutes - clockInMinutes - breakMinutes);
  
  // 시간 부분 계산 (정수 시간)
  const hours = Math.floor(totalWorkingMinutes / 60);
  
  // 분 부분 계산 (나머지 분, 0~59)
  const minutes = totalWorkingMinutes % 60;
  
  // hh.mm 형식으로 결합 (예: 8시간 1분 = 8.01)
  return parseFloat(`${hours}.${minutes.toString().padStart(2, '0')}`);
};

const timeEntrySchema = z.object({
  type: z.enum(['clockIn', 'clockOut', 'breakStart1', 'breakEnd1', 'breakStart2', 'breakEnd2', 'breakStart3', 'breakEnd3']),
  time: z.string(),
  date: z.string(),
  placeId: z.string()
});

const locationVerificationSchema = z.object({
  type: z.enum(['clockIn', 'clockOut', 'breakStart1', 'breakEnd1', 'breakStart2', 'breakEnd2', 'breakStart3', 'breakEnd3']),
  timestamp: z.string(),
  qrData: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional()
  })
});

// 더 정확한 NSW 시간대 변환 함수
const convertToNSWTime = (date: Date): Date => {
  // 정확한 시간대 변환을 위해 date-fns-tz 사용
  const sydneyDateStr = formatInTimeZone(
    date,
    'Australia/Sydney',
    "yyyy-MM-dd'T'HH:mm:ss.SSS"
  );
  return new Date(sydneyDateStr);
};

// NSW 시간대 문자열 생성 함수 개선
const getNSWTimeString = (): string => {
  // 현재 시간을 NSW 시간대로 포맷팅
  const now = new Date();
  
  // 시간대 오프셋을 포함한 ISO 문자열 생성
  const nswDateTimeStr = formatInTimeZone(
    now,
    'Australia/Sydney',
    "yyyy-MM-dd'T'HH:mm:ss.SSSxxx" // xxx는 시간대 오프셋을 포함
  );
  
  console.log('생성된 NSW 시간 문자열:', nswDateTimeStr);
  return nswDateTimeStr;
};

// 더 직접적인 방법으로 시드니 시간 생성
const getNSWDateWithTimezone = (): Date => {
  const now = new Date();
  // 시드니 시간대 오프셋: +11:00 (서머타임 시) 또는 +10:00
  const sydneyOffsetHours = 11; // 서머타임일 경우
  
  // 현재 UTC 시간에 시드니 오프셋 적용
  now.setHours(now.getHours() + sydneyOffsetHours);
  
  console.log('시드니 시간 변환:', {
    원본UTC: new Date().toISOString(),
    변환시드니: now.toISOString(),
    로컬문자열: now.toLocaleString('en-AU', {timeZone: 'Australia/Sydney'})
  });
  
  return now;
};

router.post('/', validateRequest(timeEntrySchema), async (req, res) => {
  try {
    const { type, time, date, placeId } = req.body;
    console.log('받은 요청 데이터:', { type, time, date, placeId });
    
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        userId: req.user.id,
        date: date
      }
    });

    let result;
    if (existingRecord) {
      const updateData: any = {
        [type === 'clockIn' ? 'clockInTime' : 
         type === 'clockOut' ? 'clockOutTime' :
         type === 'breakStart1' ? 'breakStartTime1' :
         type === 'breakEnd1' ? 'breakEndTime1' :
         type === 'breakStart2' ? 'breakStartTime2' :
         type === 'breakEnd2' ? 'breakEndTime2' :
         type === 'breakStart3' ? 'breakStartTime3' :
         type === 'breakEnd3' ? 'breakEndTime3' : type]: time,
        status: 'active'
      };

      if (type === 'clockOut') {
        const tempRecord = { ...existingRecord, clockOutTime: time };
        updateData.breakMinutes = calculateBreakMinutes(tempRecord);
        updateData.workingHours = calculateWorkingHours(tempRecord);
        updateData.status = 'completed';
      }

      result = await prisma.timeRecord.update({
        where: { id: existingRecord.id },
        data: updateData
      });
    } else {
      // 새 기록 생성 시 필드 매핑 수정
      const fieldMap: Record<string, string> = {
        'clockIn': 'clockInTime',
        'clockOut': 'clockOutTime',
        'breakStart1': 'breakStartTime1',
        'breakEnd1': 'breakEndTime1',
        'breakStart2': 'breakStartTime2',
        'breakEnd2': 'breakEndTime2',
        'breakStart3': 'breakStartTime3',
        'breakEnd3': 'breakEndTime3'
      };
      
      // 올바른 필드명으로 매핑
      const fieldToUpdate = fieldMap[type] || type;
      
      result = await prisma.timeRecord.create({
        data: {
          userId: req.user.id,
          locationId: req.user.locationId,
          date: date,
          [fieldToUpdate]: time,
          status: 'active',
          createdAt: getNSWDateWithTimezone(), // 시드니 시간대 직접 적용
          breakMinutes: 0,
          workingHours: 0
        }
      });
      
      console.log('생성된 기록:', result);
    }
    
    console.log('처리 결과:', result);
    return res.status(200).json({
      success: true,
      message: `Successfully processed ${type}`,
      data: result
    });
    
  } catch (error) {
    console.error('시간 기록 생성 오류:', error);
    return res.status(500).json({ 
      success: false,
      error: '서버 오류', 
      details: error instanceof Error ? error.message : '알 수 없는 오류' 
    });
  }
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
    const { type, timestamp, qrData } = req.body;
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
        // Convert DD-MM-YYYY to YYYY-MM-DD for JavaScript Date parsing
        const [day, month, year] = dateString.split('-');
        const isoDateString = `${year}-${month}-${day}`;
        
        console.log('BreakEnd - Original date string:', dateString);
        console.log('BreakEnd - Converted ISO date string:', isoDateString);
        console.log('BreakEnd - Break start time:', existingTimeRecord.breakStartTime);
        console.log('BreakEnd - Break end time:', timeString);
        
        const breakStart = new Date(`${isoDateString}T${existingTimeRecord.breakStartTime}:00`);
        const breakEnd = new Date(`${isoDateString}T${timeString}:00`);
        
        console.log('BreakEnd - Break start date object:', breakStart);
        console.log('BreakEnd - Break end date object:', breakEnd);
        
        // Ensure both dates are valid
        if (isNaN(breakStart.getTime()) || isNaN(breakEnd.getTime())) {
          console.error('Invalid date calculation for break end:', {
            dateString,
            isoDateString,
            breakStartTime: existingTimeRecord.breakStartTime,
            timeString
          });
          return res.status(400).json({
            error: 'Invalid time format',
            details: 'Could not calculate break minutes due to invalid time format'
          });
        }
        
        let breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / 60000;
        
        // If breakMinutes is negative, assume break ended on the next day
        if (breakMinutes < 0) {
          const nextDayBreakEnd = new Date(`${isoDateString}T${timeString}:00`);
          nextDayBreakEnd.setDate(nextDayBreakEnd.getDate() + 1);
          breakMinutes = (nextDayBreakEnd.getTime() - breakStart.getTime()) / 60000;
        }
        
        // Ensure breakMinutes is at least 1 minute
        breakMinutes = Math.max(1, Math.round(breakMinutes));
        
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
      
      // 임시 레코드 생성 (clockOutTime 추가)
      const tempRecord = {
        ...existingTimeRecord,
        clockOutTime: timeString
      };
      
      // calculateWorkingHours 함수를 사용하여 통일된 방식으로 workingHours 계산
      const workingHours = calculateWorkingHours(tempRecord);
      
      // breakMinutes 계산
      const breakMinutes = calculateBreakMinutes(tempRecord);
      
      // Update the time record with clock out time
      const updatedTimeRecord = await prisma.timeRecord.update({
        where: { id: existingTimeRecord.id },
        data: { 
          clockOutTime: timeString,
          breakMinutes: breakMinutes,
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

// QR 코드에서 위치 정보 파싱 함수 수정
function parseQRLocation(qrData: string): { placeId: string, latitude: number, longitude: number } | null {
  try {
    console.log('서버에서 파싱 시도할 QR 데이터:', qrData);
    
    // 데이터가 없거나 문자열이 아닌 경우 처리
    if (!qrData || typeof qrData !== 'string') {
      console.error('유효하지 않은 QR 데이터:', qrData);
      return null;
    }
    
    // 1. JSON 형식 시도
    if (qrData.startsWith('{')) {
      try {
        const data = JSON.parse(qrData);
        if (data.placeId && data.lat && data.lng) {
          const result = {
            placeId: data.placeId,
            latitude: parseFloat(data.lat),
            longitude: parseFloat(data.lng)
          };
          console.log('JSON 형식으로 파싱 성공:', result);
          return result;
        }
      } catch (e) {
        console.log('JSON 파싱 실패, 다른 형식 시도');
      }
    }
    
    // 2. "placeId:123,lat:37.123,lng:127.123" 형식 시도
    if (qrData.includes('placeId:') && qrData.includes('lat:') && qrData.includes('lng:')) {
      try {
        const parts = qrData.split(',');
        const placeId = parts[0].split(':')[1];
        const lat = parseFloat(parts[1].split(':')[1]);
        const lng = parseFloat(parts[2].split(':')[1]);
        
        const result = { placeId, latitude: lat, longitude: lng };
        console.log('쉼표 구분 형식으로 파싱 성공:', result);
        return result;
      } catch (e) {
        console.log('쉼표 구분 형식 파싱 실패, 다른 형식 시도');
      }
    }
    
    // 3. Google Place ID만 있는 경우 (예: "ChIJMVmxBW2wEmsROqYsviTainU")
    // 이 경우 서버에서 Place ID로 위치 정보를 조회
    if (/^Ch[A-Za-z0-9_-]{20,}$/.test(qrData)) {
      console.log('Google Place ID 형식 감지:', qrData);
      
      // Google Places API를 사용하여 위치 정보 조회
      // 실제 구현에서는 googleMapsClient를 사용하여 위치 정보를 조회해야 함
      try {
        // 여기에 Google Places API 호출 코드 추가
        // const placeDetails = await googleMapsClient.place({ placeid: qrData }).asPromise();
        // const location = placeDetails.json.result.geometry.location;
        
        // 테스트를 위해 하드코딩된 위치 반환 (실제로는 API 응답 사용)
        const result = {
          placeId: qrData,
          latitude: -33.8568,  // 테스트용 위도
          longitude: 151.2153  // 테스트용 경도
        };
        
        console.log('Place ID 파싱 성공 (테스트 위치 사용):', result);
        return result;
      } catch (e) {
        console.error('Google Places API 조회 실패:', e);
        return null;
      }
    }
    
    // 4. 기타 형식 (추가 형식이 있다면 여기에 구현)
    
    console.error('지원되지 않는 QR 코드 형식:', qrData);
    return null;
  } catch (error) {
    console.error('QR 코드 파싱 오류:', error);
    console.error('파싱 실패한 QR 데이터:', qrData);
    return null;
  }
}

// 시간 기록 생성/업데이트 엔드포인트 수정
router.post('/time-entries', validateRequest(timeEntrySchema), async (req, res) => {
  try {
    const { type, time, date, placeId } = req.body;
    console.log('시간 기록 요청:', { type, time, date, placeId });

    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    // 사용자 위치 정보 조회
    const userLocation = await prisma.location.findFirst({
      where: {
        userId: req.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!userLocation) {
      return res.status(400).json({
        error: '위치 정보 오류',
        details: '사용자 위치 정보를 찾을 수 없습니다.'
      });
    }

    // 해당 날짜의 기존 기록 조회
    let timeRecord = await prisma.timeRecord.findUnique({
      where: {
        userId_date: {
          userId: req.user.id,
          date: date
        }
      }
    });

    // 기록이 없으면 새로 생성
    if (!timeRecord) {
      // 현재 시간을 NSW 시간대로 생성
      const now = new Date();
      console.log('UTC 시간:', now.toISOString());
      
      const sydneyTime = new Date(getNSWTimeString());
      console.log('NSW 시간:', sydneyTime.toISOString());
      console.log('sydneyTime 상세 정보:', {
        toISOString: sydneyTime.toISOString(),
        toLocaleString: sydneyTime.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }),
        constructorType: sydneyTime.constructor.name,
        timezoneOffset: sydneyTime.getTimezoneOffset(),
        rawDate: String(sydneyTime)
      });
      
      // Prisma create 메서드로 타입 안전하게 생성
      timeRecord = await prisma.timeRecord.create({
        data: {
          userId: req.user.id,
          locationId: userLocation.id,
          status: 'active',
          date: date,
          createdAt: getNSWDateWithTimezone(), // 시드니 시간대 직접 적용
          breakMinutes: 0,
          workingHours: 0
        }
      });
      
      console.log('생성된 타임레코드:', timeRecord);
      console.log('생성된 타임레코드 createdAt 필드:', {
        createdAt: timeRecord.createdAt,
        type: typeof timeRecord.createdAt,
        isDate: timeRecord.createdAt instanceof Date
      });
    }

    // 타입에 따라 해당 필드 업데이트
    const updateData: any = {
      // updatedAt 제거
    };
    
    switch (type) {
      case 'clockIn':
        updateData.clockInTime = time;
        updateData.status = 'active';
        break;
      case 'clockOut':
        updateData.clockOutTime = time;
        updateData.status = 'completed';
        
        // 근무 시간 계산 (clockIn과 clockOut이 모두 있는 경우)
        if (timeRecord.clockInTime) {
          // 새로운 방식으로 workingHours 계산
          // timeRecord에 clockOutTime이 아직 없으므로 임시 객체 생성
          const tempRecord = { ...timeRecord, clockOutTime: time };
          
          // Break Minutes 계산 (각 Break 시간 직접 계산)
          const calculatedBreakMinutes = calculateBreakMinutes(tempRecord);
          updateData.breakMinutes = calculatedBreakMinutes;
          
          // workingHours 계산 (calculateWorkingHours 함수 사용)
          updateData.workingHours = calculateWorkingHours(tempRecord);
        }
        break;
      case 'breakStart1':
        updateData.breakStartTime1 = time;
        break;
      case 'breakEnd1':
        updateData.breakEndTime1 = time;
        break;
      case 'breakStart2':
        updateData.breakStartTime2 = time;
        break;
      case 'breakEnd2':
        updateData.breakEndTime2 = time;
        break;
      case 'breakStart3':
        updateData.breakStartTime3 = time;
        break;
      case 'breakEnd3':
        updateData.breakEndTime3 = time;
        break;
    }

    // 기록 업데이트
    const updatedRecord = await prisma.timeRecord.update({
      where: {
        id: timeRecord.id
      },
      data: updateData
    });

    return res.json(updatedRecord);
  } catch (error) {
    console.error('시간 기록 생성 오류:', error);
    return res.status(500).json({
      error: '서버 오류',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// 사용자의 시간 기록 조회 엔드포인트
router.get('/time-entries', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    const userId = req.user.id;
    
    // 쿼리 파라미터에서 날짜 범위 가져오기
    const { startDate, endDate } = req.query;
    
    let whereClause: any = { userId };
    
    // 날짜 범위가 지정된 경우 필터링
    if (startDate && endDate) {
      whereClause.date = {
        gte: startDate as string,
        lte: endDate as string
      };
    }
    
    // 시간 기록 조회
    const timeEntries = await prisma.timeRecord.findMany({
      where: whereClause,
      include: {
        breaks: true,
        location: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    return res.json(timeEntries);
  } catch (error) {
    console.error('시간 기록 조회 오류:', error);
    
    return res.status(500).json({
      error: '서버 오류',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// Place ID로 위치 정보 조회 엔드포인트 수정
router.get('/places/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    console.log('Place ID 조회 요청:', placeId);
    
    // Google Places API 호출
    const placeResponse = await mapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: ['geometry', 'name', 'formatted_address'],
        key: process.env.GOOGLE_MAPS_API_KEY || ''
      }
    });

    console.log('Google Places API 응답 상태:', placeResponse.data.status);
    
    // 응답 데이터의 구조를 자세히 로깅
    if (placeResponse.data.result && placeResponse.data.result.geometry) {
      console.log('위치 정보:', JSON.stringify(placeResponse.data.result.geometry.location));
    } else {
      console.log('전체 응답 구조:', JSON.stringify(placeResponse.data));
    }

    if (placeResponse.data.status !== 'OK' || !placeResponse.data.result?.geometry?.location) {
      console.error('Places API 오류 응답:', placeResponse.data);
      return res.status(404).json({
        error: '위치 정보 없음',
        details: '해당 Place ID의 위치 정보를 찾을 수 없습니다.'
      });
    }

    // 위치 정보 직접 접근
    const location = placeResponse.data.result.geometry.location;
    const lat = location.lat;
    const lng = location.lng;
    
    console.log('추출된 위치 정보:', { latitude: lat, longitude: lng });
    
    // 명시적으로 응답 객체 구성
    return res.json({
      placeId: placeId,
      latitude: lat,
      longitude: lng,
      name: placeResponse.data.result.name || '',
      address: placeResponse.data.result.formatted_address || ''
    });
  } catch (error) {
    console.error('Place ID 조회 오류:', error);
    return res.status(500).json({
      error: '서버 오류',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// 오늘 날짜의 시간 기록 조회 엔드포인트
router.get('/today', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    // 현재 날짜를 시드니 시간대 기준으로 가져오기
    const now = getCurrentNSWTime();
    const today = formatInTimeZone(now, TIMEZONE, 'dd-MM-yyyy');
    
    // 오늘 날짜의 시간 기록 조회
    const timeRecord = await prisma.timeRecord.findFirst({
      where: {
        userId: req.user.id,
        date: today
      }
    });
    
    return res.json(timeRecord);
  } catch (error) {
    console.error('오늘 시간 기록 조회 오류:', error);
    return res.status(500).json({
      error: '서버 오류',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    });
  }
});

// QR 코드를 통한 시간 기록 API
router.post('/qr-check', authenticate, async (req: any, res) => {
  try {
    const { qrData, type, date } = req.body;
    const userId = req.user?.id;
    
    console.log('[DEBUG/QR] 시간 기록 요청 원본 데이터:', JSON.stringify(req.body));
    console.log('[DEBUG/QR] 시간 기록 요청 헤더:', JSON.stringify(req.headers));
    console.log('[DEBUG/QR] 인증 사용자 정보:', req.user ? {
      id: req.user.id,
      email: req.user.email,
      locationId: req.user.locationId
    } : '인증 정보 없음');

    if (!userId) {
      console.log('[DEBUG/QR] 인증 실패: 사용자 ID 없음');
      return res.status(401).json({ 
        success: false, 
        message: '인증이 필요합니다' 
      });
    }

    console.log('[DEBUG/QR] 시간 기록 요청 파라미터:', { userId, qrData, type, date });

    // 1) QR 코드 유효성 검증
    if (!qrData) {
      console.log('[DEBUG/QR] QR 코드 데이터 누락');
      return res.status(400).json({ success: false, message: 'QR 코드 데이터가 필요합니다' });
    }

    if (!type || !['clockIn', 'clockOut', 'breakStart1', 'breakEnd1', 'breakStart2', 'breakEnd2', 'breakStart3', 'breakEnd3'].includes(type)) {
      console.log('[DEBUG/QR] 유효하지 않은 기록 타입:', type);
      return res.status(400).json({ success: false, message: '유효한 기록 유형이 필요합니다' });
    }

    // 2) 데이터베이스에서 위치 확인
    console.log('[DEBUG/QR] 위치 검색 시작, placeId:', qrData);
    const location = await prisma.location.findFirst({
      where: { placeId: qrData }
    });
    console.log('[DEBUG/QR] 위치 검색 결과:', location ? {
      id: location.id,
      name: location.name,
      placeId: location.placeId
    } : '찾을 수 없음');

    if (!location) {
      console.log('[DEBUG/QR] 유효하지 않은 QR 코드:', qrData);
      return res.status(404).json({ success: false, message: '유효하지 않은 QR 코드입니다' });
    }

    // 3) 사용자 검증
    console.log('[DEBUG/QR] 사용자 정보 조회 시작, userId:', userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        location: true,
        locationUsers: {
          include: { location: true }
        }
      }
    });
    console.log('[DEBUG/QR] 사용자 조회 결과:', user ? {
      id: user.id,
      email: user.email,
      locationId: user.locationId,
      hasDirectLocation: !!user.location,
      locationName: user.location?.name,
      locationUsers: user.locationUsers?.length || 0
    } : '사용자 찾을 수 없음');

    if (!user) {
      console.log('[DEBUG/QR] 사용자를 찾을 수 없음:', userId);
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
    }

    // 4) 사용자와 위치 관계 검증
    let isAuthorized = user.locationId === location.id;
    console.log('[DEBUG/QR] 기본 위치 권한 확인:', isAuthorized, 
      '(사용자:', user.locationId, '위치:', location.id, ')');
    
    if (!isAuthorized && user.locationUsers) {
      const locationUserMatches = user.locationUsers.filter(lu => 
        lu.locationId === location.id && (!lu.endDate || new Date(lu.endDate) > new Date())
      );
      isAuthorized = locationUserMatches.length > 0;
      
      console.log('[DEBUG/QR] 추가 위치 권한 확인:', {
        결과: isAuthorized,
        매칭수: locationUserMatches.length,
        위치목록: user.locationUsers.map(lu => ({
          위치ID: lu.locationId,
          시작일: lu.startDate,
          종료일: lu.endDate,
          활성상태: !lu.endDate || new Date(lu.endDate) > new Date()
        }))
      });
    }

    if (!isAuthorized) {
      console.log('[DEBUG/QR] 권한 없음. 사용자:', userId, '위치:', location.id);
      return res.status(403).json({ 
        success: false, 
        message: '이 위치에서 시간 기록을 할 권한이 없습니다' 
      });
    }

    // 5) 현재 시간 가져오기
    const now = new Date();
    const currentTime = formatInTimeZone(
      now,
      TIMEZONE,
      'HH:mm'
    );
    console.log('[DEBUG/QR] 현재 시간 계산:', {
      원본시간: now.toISOString(),
      현지시간: currentTime,
      타임존: TIMEZONE
    });

    // QR 코드로 인증된 시간대가 맞으면 시간 기록
    const recordDate = date || formatInTimeZone(
      now,
      TIMEZONE,
      'yyyy-MM-dd'
    );
    console.log('[DEBUG/QR] 기록 날짜:', recordDate);

    // 6) 이미 존재하는 기록이 있는지 확인
    console.log('[DEBUG/QR] 기존 기록 검색, 사용자:', userId, '날짜:', recordDate);
    const existingRecord = await prisma.timeRecord.findFirst({
      where: {
        userId: userId,
        date: recordDate
      }
    });
    console.log('[DEBUG/QR] 기존 기록 검색 결과:', existingRecord ? {
      id: existingRecord.id,
      상태: existingRecord.status,
      출근시간: existingRecord.clockInTime,
      퇴근시간: existingRecord.clockOutTime
    } : '기존 기록 없음');

    let result;
    if (existingRecord) {
      console.log('[DEBUG/QR] 기존 기록 업데이트 시작, 유형:', type);
      const updateData: Prisma.TimeRecordUpdateInput = {
        status: 'active'
      };

      // 동적 필드 설정
      if (type === 'clockIn') updateData.clockInTime = currentTime;
      else if (type === 'clockOut') updateData.clockOutTime = currentTime;
      else if (type === 'breakStart1') updateData.breakStartTime1 = currentTime;
      else if (type === 'breakEnd1') updateData.breakEndTime1 = currentTime;
      else if (type === 'breakStart2') updateData.breakStartTime2 = currentTime;
      else if (type === 'breakEnd2') updateData.breakEndTime2 = currentTime;
      else if (type === 'breakStart3') updateData.breakStartTime3 = currentTime;
      else if (type === 'breakEnd3') updateData.breakEndTime3 = currentTime;

      console.log('[DEBUG/QR] 업데이트 데이터:', JSON.stringify(updateData));

      if (type === 'clockOut') {
        const tempRecord = { 
          ...existingRecord, 
          clockOutTime: currentTime 
        };
        const breakMinutes = calculateBreakMinutes(tempRecord);
        const workHours = calculateWorkingHours(tempRecord);
        
        console.log('[DEBUG/QR] 퇴근 시간 계산 정보:', {
          출근시간: existingRecord.clockInTime, 
          퇴근시간: currentTime,
          휴식시간_분: breakMinutes,
          근무시간: workHours
        });
        
        updateData.breakMinutes = breakMinutes;
        updateData.workingHours = workHours;
        updateData.status = 'completed';
      }

      result = await prisma.timeRecord.update({
        where: { id: existingRecord.id },
        data: updateData
      });
      console.log('[DEBUG/QR] 기록 업데이트 완료:', {
        id: result.id,
        상태: result.status,
        출근시간: result.clockInTime,
        퇴근시간: result.clockOutTime,
        기록유형: type
      });
    } else {
      console.log('[DEBUG/QR] 새 기록 생성 시작, 유형:', type);
      // 새 기록 생성
      const newData: Prisma.TimeRecordCreateInput = {
        user: { connect: { id: userId } },
        location: { connect: { id: location.id } },
        date: recordDate,
        status: 'active',
        breakMinutes: 0,
        workingHours: 0
      };

      // 타입에 따라 해당 필드만 설정
      if (type === 'clockIn') newData.clockInTime = currentTime;
      else if (type === 'clockOut') newData.clockOutTime = currentTime;
      else if (type === 'breakStart1') newData.breakStartTime1 = currentTime;
      else if (type === 'breakEnd1') newData.breakEndTime1 = currentTime;
      else if (type === 'breakStart2') newData.breakStartTime2 = currentTime;
      else if (type === 'breakEnd2') newData.breakEndTime2 = currentTime;
      else if (type === 'breakStart3') newData.breakStartTime3 = currentTime;
      else if (type === 'breakEnd3') newData.breakEndTime3 = currentTime;

      console.log('[DEBUG/QR] 새 기록 데이터:', JSON.stringify(newData));

      result = await prisma.timeRecord.create({
        data: newData
      });
      console.log('[DEBUG/QR] 새 기록 생성 완료:', {
        id: result.id, 
        상태: result.status,
        출근시간: result.clockInTime,
        근무일자: result.date
      });
    }

    console.log('[DEBUG/QR] 시간 기록 API 완료:', {
      success: true,
      type: type,
      locationId: location.id,
      locationName: location.name
    });

    return res.json({
      success: true,
      message: `${type === 'clockIn' ? '출근' : 
                type === 'clockOut' ? '퇴근' : 
                type.includes('Start') ? '휴식 시작' : '휴식 종료'} 기록 완료`,
      data: result,
      location: {
        id: location.id,
        name: location.name
      }
    });

  } catch (error) {
    console.error('[DEBUG/QR] 시간 기록 API 오류:', error);
    // 오류 상세 정보 표시
    if (error instanceof Error) {
      console.error('[DEBUG/QR] 오류 메시지:', error.message);
      console.error('[DEBUG/QR] 오류 스택:', error.stack);
    }
    return res.status(500).json({ 
      success: false,
      message: '서버 오류가 발생했습니다'
    });
  }
});

export { router as timeEntriesRouter };