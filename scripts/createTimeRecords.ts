import { PrismaClient } from '@prisma/client';
import { USER_ID, USER_NAME } from '../src/constants/users';

const prisma = new PrismaClient();

// 시드니 시간대 생성 함수 추가
const getNSWDateWithTimezone = (): Date => {
  const now = new Date();
  // 시드니 시간대 오프셋: +11:00 (서머타임 시) 또는 +10:00
  const sydneyOffsetHours = 11; // 서머타임일 경우
  
  // 현재 UTC 시간에 시드니 오프셋 적용
  now.setHours(now.getHours() + sydneyOffsetHours);
  
  console.log('시드니 시간 변환:', {
    원본UTC: new Date().toISOString(),
    변환시드니: now.toISOString()
  });
  
  return now;
};

async function createTimeRecords() {
  try {
    const now = new Date();

    const convertTimeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const calculateBreakMinutes = (timeRecord: any): number => {
      let totalBreakMinutes = 0;
      
      // Break 1 계산
      if (timeRecord.breakStartTime1 && timeRecord.breakEndTime1) {
        const breakStart1 = convertTimeToMinutes(timeRecord.breakStartTime1);
        const breakEnd1 = convertTimeToMinutes(timeRecord.breakEndTime1);
        const break1Minutes = breakEnd1 - breakStart1;
        if (break1Minutes > 0) totalBreakMinutes += break1Minutes;
      }
      
      // Break 2 계산 (필요시)
      if (timeRecord.breakStartTime2 && timeRecord.breakEndTime2) {
        const breakStart2 = convertTimeToMinutes(timeRecord.breakStartTime2);
        const breakEnd2 = convertTimeToMinutes(timeRecord.breakEndTime2);
        const break2Minutes = breakEnd2 - breakStart2;
        if (break2Minutes > 0) totalBreakMinutes += break2Minutes;
      }
      
      // Break 3 계산 (필요시)
      if (timeRecord.breakStartTime3 && timeRecord.breakEndTime3) {
        const breakStart3 = convertTimeToMinutes(timeRecord.breakStartTime3);
        const breakEnd3 = convertTimeToMinutes(timeRecord.breakEndTime3);
        const break3Minutes = breakEnd3 - breakStart3;
        if (break3Minutes > 0) totalBreakMinutes += break3Minutes;
      }
      
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
      
      // 분 부분 계산 (나머지 분)
      const minutes = totalWorkingMinutes % 60;
      
      // 시간.분 형식으로 결합 (예: 8시간 1분 = 8.01)
      return parseFloat(`${hours}.${minutes.toString().padStart(2, '0')}`);
    };

    //  사용자의 출퇴근 기록 생성 또는 업데이트
    const userClockIn = '08:28';
    const userClockOut = '17:00';
    const userBreakStart = '11:21';
    const userBreakEnd = '11:51';
    
    const Home = 9;
    const Sorrel = 10;


    // 기존 계산 코드 대신 새 함수 사용
    const timeRecordData = {
      clockInTime: userClockIn,
      clockOutTime: userClockOut,
      breakStartTime1: userBreakStart,
      breakEndTime1: userBreakEnd,
      // 다른 휴식 시간 필드는 필요시 추가
    };

    const breakMinutes4 = calculateBreakMinutes(timeRecordData);
    const workingHours4 = calculateWorkingHours(timeRecordData);

    // 시간과 분 표시를 위한 계산 (로깅용)
    const hours = Math.floor(workingHours4);
    const minutes = Math.round((workingHours4 - hours) * 100);

    // upsert 사용: 기존 레코드가 있으면 업데이트, 없으면 생성
    const timeRecord4 = await prisma.timeRecord.upsert({
      where: {
        userId_date: {
          userId: USER_ID.JAEYOUNG,
          date: '05-03-2025'
        }
      },
      update: {
        locationId: Sorrel,
        clockInTime: userClockIn,
        breakStartTime1: userBreakStart,
        breakEndTime1: userBreakEnd,
        clockOutTime: userClockOut,
        breakMinutes: breakMinutes4,
        workingHours: workingHours4,
        status: 'completed',
        createdAt: getNSWDateWithTimezone()
      },
      create: {
        userId: USER_ID.JAEYOUNG,
        locationId: Sorrel,
        date: '05-03-2025',
        clockInTime: userClockIn,
        breakStartTime1: userBreakStart,
        breakEndTime1: userBreakEnd,
        clockOutTime: userClockOut,
        breakMinutes: breakMinutes4,
        workingHours: workingHours4,
        status: 'completed',
        createdAt: getNSWDateWithTimezone()
      }
    });

    console.log(`${USER_NAME.JAEYOUNG} 출퇴근 기록 생성/업데이트 완료:`, timeRecord4);
    console.log(`근무 시간: ${hours}시간 ${minutes}분 (${workingHours4})`);
    
  } catch (error) {
    console.error('출퇴근 기록 생성 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTimeRecords()
  .then(() => console.log('출퇴근 기록 생성 완료'))
  .catch(e => console.error(e)); 