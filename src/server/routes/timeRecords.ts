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

    if (startDate && endDate) {
      // Prisma에서 raw SQL 쿼리 사용
      const records = await prisma.$queryRaw`
        SELECT 
          id, 
          date, 
          "clockInTime", 
          "clockOutTime", 
          "breakStartTime1", 
          "breakEndTime1", 
          "breakStartTime2", 
          "breakEndTime2", 
          "breakStartTime3", 
          "breakEndTime3", 
          "workingHours", 
          "breakMinutes"
        FROM "TimeRecord"
        WHERE "userId" = ${userId}
        AND TO_DATE(date, 'DD-MM-YYYY') BETWEEN ${startDate}::date AND ${endDate}::date
        ORDER BY TO_DATE(date, 'DD-MM-YYYY') DESC
      ` as any[];
      
      console.log(`✅ 조회된 기록 수: ${records.length}`);
      
      if (records.length > 0) {
        console.log('📝 첫 번째 기록:', JSON.stringify(records[0], null, 2));
      } else {
        console.log('❗ 조회된 기록 없음. 조건:', {
          userId,
          startDate,
          endDate
        });
      }
      
      return res.json(records);
    } else {
      // 날짜 범위가 없는 경우 기본 쿼리 실행
      const records = await prisma.timeRecord.findMany({
        where: { userId },
        select: {
          id: true,
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
      
      console.log(`✅ 조회된 기록 수: ${records.length}`);
      
      return res.json(records);
    }

    // 클라이언트에 보내기 전에 날짜 형식을 yyyy-MM-dd로 변환
    const formattedRecords = records.map(record => {
      try {
        // 디버깅을 위한 로그 추가
        console.log('변환 전 날짜:', record.date);
        
        // 날짜 파싱 및 변환
        const parsedDate = parse(record.date, 'dd-MM-yyyy', new Date());
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        
        console.log('변환 후 날짜:', formattedDate);
        
        return {
          ...record,
          date: formattedDate
        };
      } catch (error) {
        console.error(`날짜 변환 오류 (${record.date}):`, error);
        // 오류 발생 시 원본 날짜 반환
        return record;
      }
    });

    res.json(formattedRecords);
    
  } catch (error) {
    console.error('❌ 근무 기록 조회 중 오류 발생:', error);
    console.error('상세 에러:', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      error: '근무 기록 조회 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

//============================ admin 계정 관련 API =====================================

//

export default router;