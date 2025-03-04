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
    
    // // 첫 번째 사용자의 출퇴근 기록 생성
    // const user1BreakStart = '11:28';
    // const user1BreakEnd = '11:58';
    
    // // 휴식 시간 계산 (분 단위)
    // const [breakStartHour1, breakStartMin1] = user1BreakStart.split(':').map(Number);
    // const [breakEndHour1, breakEndMin1] = user1BreakEnd.split(':').map(Number);
    // const breakMinutes1 = (breakEndHour1 * 60 + breakEndMin1) - (breakStartHour1 * 60 + breakStartMin1);
    
    // // 근무 시간 계산 (clockOutTime 기준)
    // const [clockInHour1, clockInMin1] = '07:29'.split(':').map(Number);
    // const [clockOutHour1, clockOutMin1] = '16:00'.split(':').map(Number);
    // const totalMinutesWorked1 = (clockOutHour1 * 60 + clockOutMin1) - (clockInHour1 * 60 + clockInMin1) - breakMinutes1;
    // const workingHours1 = Math.floor(totalMinutesWorked1 / 60); // 시간 부분
    
    // const timeRecord1 = await prisma.timeRecord.create({
    //   data: {
    //     userId: USER_ID.HEIDI,
    //     locationId: 7,
    //     date: '03-03-2025',
    //     clockInTime: '07:29',
    //     breakStartTime1: user1BreakStart,
    //     breakEndTime1: user1BreakEnd,
    //     clockOutTime: '16:00',
    //     breakMinutes: 30, // 0h 30m
    //     workingHours: 8.0, // 8h 0m
    //     status: 'completed',
    //     createdAt: now
    //   }
    // });
    
    // console.log(`${USER_NAME.HEIDI} 출퇴근 기록 생성 완료:`, timeRecord1);
    
    // // 두 번째 사용자의 출퇴근 기록 생성
    // const user2BreakStart = '10:33';
    // const user2BreakEnd = '11:03';
    
    // // 휴식 시간 계산 (분 단위)
    // const [breakStartHour2, breakStartMin2] = user2BreakStart.split(':').map(Number);
    // const [breakEndHour2, breakEndMin2] = user2BreakEnd.split(':').map(Number);
    // const breakMinutes2 = (breakEndHour2 * 60 + breakEndMin2) - (breakStartHour2 * 60 + breakStartMin2);
    
    // // 근무 시간 계산 (clockOutTime 기준)
    // const [clockInHour2, clockInMin2] = '07:29'.split(':').map(Number);
    // const [clockOutHour2, clockOutMin2] = '16:00'.split(':').map(Number);
    // const totalMinutesWorked2 = (clockOutHour2 * 60 + clockOutMin2) - (clockInHour2 * 60 + clockInMin2) - breakMinutes2;
    // const workingHours2 = Math.floor(totalMinutesWorked2 / 60); // 시간 부분
    
    // const timeRecord2 = await prisma.timeRecord.create({
    //   data: {
    //     userId: USER_ID.JAEYOUNG,
    //     locationId: 7,
    //     date: '03-03-2025',
    //     clockInTime: '07:29',
    //     breakStartTime1: user2BreakStart,
    //     breakEndTime1: user2BreakEnd,
    //     clockOutTime: '16:00',
    //     breakMinutes: 30, // 0h 30m
    //     workingHours: 8.0, // 8h 0m
    //     status: 'completed',
    //     createdAt: now
    //   }
    // });
    
    // console.log(`${USER_NAME.JAEYOUNG} 출퇴근 기록 생성 완료:`, timeRecord2);
    
    // // 세 번째 사용자의 출퇴근 기록 생성
    // const user3BreakStart = '09:56';
    // const user3BreakEnd = '10:25';
    
    // // 휴식 시간 계산 (분 단위)
    // const [breakStartHour3, breakStartMin3] = user3BreakStart.split(':').map(Number);
    // const [breakEndHour3, breakEndMin3] = user3BreakEnd.split(':').map(Number);
    // const breakMinutes3 = (breakEndHour3 * 60 + breakEndMin3) - (breakStartHour3 * 60 + breakStartMin3);
    
    // // 근무 시간 계산 (clockOutTime 기준)
    // const [clockInHour3, clockInMin3] = '07:29'.split(':').map(Number);
    // const [clockOutHour3, clockOutMin3] = '14:00'.split(':').map(Number);
    // const totalMinutesWorked3 = (clockOutHour3 * 60 + clockOutMin3) - (clockInHour3 * 60 + clockInMin3) - breakMinutes3;
    // const workingHours3 = Math.floor(totalMinutesWorked3 / 60); // 시간 부분
    
    // const timeRecord3 = await prisma.timeRecord.create({
    //   data: {
    //     userId: USER_ID.SEOYOON,
    //     locationId: 7,
    //     date: '03-03-2025',
    //     clockInTime: '07:29',
    //     breakStartTime1: user3BreakStart,
    //     breakEndTime1: user3BreakEnd,
    //     clockOutTime: '14:00',
    //     breakMinutes: 29, // 0h 29m (계산된 값)
    //     workingHours: 6.0, // 6h 2m -> 반올림하여 6.0
    //     status: 'completed',
    //     createdAt: now
    //   }
    // });
    
    // console.log(`${USER_NAME.SEOYOON} 출퇴근 기록 생성 완료:`, timeRecord3);
    
    
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
      
      // 시간.분 형식으로 결합 (예: 8시간 5분 = 8.05)
      return parseFloat(`${hours}.${minutes.toString().padStart(2, '0')}`);
    };

    //  사용자의 출퇴근 기록 생성 또는 업데이트
    const userClockIn = '20:28';
    const userClockOut = '22:27';
    const userBreakStart = '21:06';
    const userBreakEnd = '21:58';
    
    const Home = 4;
    const Sorrel = 7;


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
          userId: USER_ID.IRENE,
          date: '04-03-2025'
        }
      },
      update: {
        locationId: Home,
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
        userId: USER_ID.IRENE,
        locationId: 7,
        date: '03-03-2025',
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

    console.log(`${USER_NAME.IRENE} 출퇴근 기록 생성/업데이트 완료:`, timeRecord4);
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