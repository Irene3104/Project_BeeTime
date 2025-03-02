import { Router } from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/authenticate';
import { format, parse } from 'date-fns';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    console.log('받은 요청 데이터:', {
      userId,
      startDate,
      endDate
    });
    
    // yyyy-MM-dd 형식을 dd-MM-yyyy 형식으로 변환
    const formatDateForDB = (dateStr: string) => {
      const parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
      return format(parsedDate, 'dd-MM-yyyy');
    };

    const whereClause: any = {
      userId: userId
    };

    if (startDate && endDate) {
      const dbStartDate = formatDateForDB(startDate as string);
      const dbEndDate = formatDateForDB(endDate as string);
      
      console.log('변환된 DB 날짜:', {
        시작일: dbStartDate,
        종료일: dbEndDate
      });

      whereClause.date = {
        gte: dbStartDate,
        lte: dbEndDate
      };
    }
    
    console.log('DB 쿼리 조건:', whereClause);

    const timeRecords = await prisma.timeRecord.findMany({
      where: whereClause,
      select: {
        date: true,
        clockInTime: true,
        clockOutTime: true,
        breakStartTime1: true,
        breakEndTime1: true,
        breakStartTime2: true,
        breakEndTime2: true,
        breakStartTime3: true,
        breakEndTime3: true,
        workingHours: true,
        breakMinutes: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    console.log(`✅ 조회된 기록 수: ${timeRecords.length}`);
    
    if (timeRecords.length > 0) {
      console.log('📝 첫 번째 기록:', timeRecords[0]);
    }

    // 클라이언트에 보내기 전에 날짜 형식을 yyyy-MM-dd로 변환
    const formattedRecords = timeRecords.map(record => ({
      ...record,
      date: format(parse(record.date, 'dd-MM-yyyy', new Date()), 'yyyy-MM-dd')
    }));

    res.json(formattedRecords);
    
  } catch (error) {
    console.error('❌ 근무 기록 조회 중 오류 발생:', error);
    console.error('상세 에러:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: '근무 기록 조회 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { field, time } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 유효한 필드인지 확인
    const validFields = [
      'clockInTime', 'clockOutTime',
      'breakStartTime1', 'breakEndTime1',
      'breakStartTime2', 'breakEndTime2',
      'breakStartTime3', 'breakEndTime3'
    ];

    if (!validFields.includes(field)) {
      return res.status(400).json({ error: 'Invalid field name' });
    }

    // 시간 형식 검증 (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ error: 'Invalid time format' });
    }

    const record = await prisma.timeRecord.findUnique({
      where: { id: parseInt(id) }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (record.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this record' });
    }

    const updateData = {
      [field]: time
    };

    const updatedRecord = await prisma.timeRecord.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating time record:', error);
    res.status(500).json({ error: 'Failed to update time record' });
  }
});

// 새 시간 기록 생성
router.post('/', authenticate, async (req, res) => {
  try {
    const { date, status, ...timeFields } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 사용자 정보 조회하여 locationId 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { locationId: true }
    });

    if (!user || !user.locationId) {
      return res.status(400).json({ error: 'User location not found' });
    }

    console.log('Creating time record with data:', {
      userId,
      date,
      status,
      locationId: user.locationId,
      ...timeFields
    });

    // 해당 날짜의 기존 기록 확인
    let timeRecord = await prisma.timeRecord.findFirst({
      where: {
        userId,
        date
      }
    });

    // 기존 기록이 없으면 새로 생성
    if (!timeRecord) {
      timeRecord = await prisma.timeRecord.create({
        data: {
          userId,
          date,
          status: status || 'ACTIVE',
          locationId: user.locationId,
          ...timeFields
        }
      });
    } else {
      // 기존 기록이 있으면 업데이트
      timeRecord = await prisma.timeRecord.update({
        where: {
          id: timeRecord.id
        },
        data: {
          ...timeFields
        }
      });
    }

    res.status(201).json(timeRecord);
  } catch (error) {
    console.error('Error creating time record:', error);
    // 에러 상세 정보 로깅
    if (error.name === 'PrismaClientValidationError') {
      console.error('Prisma validation error details:', error.message);
    }
    res.status(500).json({ 
      error: 'Failed to create time record',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;