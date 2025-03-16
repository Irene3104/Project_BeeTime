import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 시드니 시간대 생성 함수
const getNSWDateWithTimezone = (): Date => {
  const now = new Date();
  // 시드니 시간대 오프셋: +11:00 (서머타임 시) 또는 +10:00
  const sydneyOffsetHours = 11; 
  
  // 현재 UTC 시간에 시드니 오프셋 적용
  now.setHours(now.getHours() + sydneyOffsetHours);
  
  console.log('시드니 시간 변환:', {
    원본UTC: new Date().toISOString(),
    변환시드니: now.toISOString()
  });
  
  return now;
};

async function createTestRecord() {
  try {
    console.log('근무 시간 기록 생성 시작...');

    // tsjyono@gmail.com 사용자 정보
    const userId = '25bd10f3-5d46-40a2-9351-88e66072fddb';
    const testDate = '16-03-2025'; // 오늘 날짜 DD-MM-YYYY 형식
    
    // 시간 정보
    const clockInTime = '08:28';
    const clockOutTime = '17:00';
    const breakStartTime1 = '12:35';
    const breakEndTime1 = '13:04';
    
    console.log(`Date: ${testDate}`);
    
    // 시간 문자열을 분으로 변환하는 함수
    const convertTimeToMinutes = (time: string): number => {
      if (!time) return 0;
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // 휴식 시간 계산 함수
    const calculateBreakMinutes = (timeRecord: any): number => {
      let totalBreakMinutes = 0;
      
      // Break 1 계산
      if (timeRecord.breakStartTime1 && timeRecord.breakEndTime1) {
        const breakStart1 = convertTimeToMinutes(timeRecord.breakStartTime1);
        const breakEnd1 = convertTimeToMinutes(timeRecord.breakEndTime1);
        const break1Minutes = breakEnd1 - breakStart1;
        if (break1Minutes > 0) totalBreakMinutes += break1Minutes;
      }
      
      // Break 2 계산
      if (timeRecord.breakStartTime2 && timeRecord.breakEndTime2) {
        const breakStart2 = convertTimeToMinutes(timeRecord.breakStartTime2);
        const breakEnd2 = convertTimeToMinutes(timeRecord.breakEndTime2);
        const break2Minutes = breakEnd2 - breakStart2;
        if (break2Minutes > 0) totalBreakMinutes += break2Minutes;
      }
      
      // Break 3 계산
      if (timeRecord.breakStartTime3 && timeRecord.breakEndTime3) {
        const breakStart3 = convertTimeToMinutes(timeRecord.breakStartTime3);
        const breakEnd3 = convertTimeToMinutes(timeRecord.breakEndTime3);
        const break3Minutes = breakEnd3 - breakStart3;
        if (break3Minutes > 0) totalBreakMinutes += break3Minutes;
      }
      
      return Math.max(0, totalBreakMinutes);
    };

    // workingHours 계산 함수
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
      
      // 분 부분 계산 (나머지 분)
      const minutes = totalWorkingMinutes % 60;
      
      // 시간.분 형식으로 결합 (예: 8시간 1분 = 8.01)
      return parseFloat(`${hours}.${minutes.toString().padStart(2, '0')}`);
    };

    // 임시 레코드 생성하여 breakMinutes 및 workingHours 계산
    const tempRecord = {
      clockInTime,
      clockOutTime,
      breakStartTime1,
      breakEndTime1
    };

    const breakMinutes = calculateBreakMinutes(tempRecord);
    const workingHours = calculateWorkingHours(tempRecord);

    console.log(`계산된 휴식 시간: ${breakMinutes}분`);
    console.log(`계산된 근무 시간: ${workingHours} (${Math.floor(workingHours)}시간 ${Math.round((workingHours - Math.floor(workingHours)) * 100)}분)`);

    // upsert를 사용하여 기존 레코드가 있으면 업데이트하고, 없으면 생성
    const timeRecord = await prisma.timeRecord.upsert({
      where: {
        userId_date: {
          userId,
          date: testDate
        }
      },
      update: {
        locationId: 10, // 위치 ID 10 사용
        clockInTime,
        clockOutTime,
        breakStartTime1,
        breakEndTime1,
        breakMinutes,
        workingHours,
        status: 'completed'
        // createdAt은 업데이트하지 않음
      },
      create: {
        userId,
        date: testDate,
        locationId: 10, // 위치 ID 10 사용
        clockInTime,
        clockOutTime,
        breakStartTime1,
        breakEndTime1,
        breakMinutes,
        workingHours,
        status: 'completed',
        createdAt: getNSWDateWithTimezone()
      }
    });

    console.log('생성/업데이트된 근무시간 레코드:', timeRecord);
  } catch (error) {
    console.error('근무시간 레코드 생성 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestRecord()
  .then(() => console.log('근무시간 레코드 생성 완료'))
  .catch(e => console.error('스크립트 실행 오류:', e)); 