import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTimeRecords() {
  try {
    const now = new Date();
    
    // 첫 번째 사용자의 출퇴근 기록 생성
    const user1Id = '25bd10f3-5d46-40a2-9351-88e66072fddb';
    const user1BreakStart = '11:28';
    const user1BreakEnd = '11:58';
    
    // 휴식 시간 계산 (분 단위)
    const [breakStartHour1, breakStartMin1] = user1BreakStart.split(':').map(Number);
    const [breakEndHour1, breakEndMin1] = user1BreakEnd.split(':').map(Number);
    const breakMinutes1 = (breakEndHour1 * 60 + breakEndMin1) - (breakStartHour1 * 60 + breakStartMin1);
    
    // 근무 시간 계산 (clockOutTime 기준)
    const [clockInHour1, clockInMin1] = '07:29'.split(':').map(Number);
    const [clockOutHour1, clockOutMin1] = '16:00'.split(':').map(Number);
    const totalMinutesWorked1 = (clockOutHour1 * 60 + clockOutMin1) - (clockInHour1 * 60 + clockInMin1) - breakMinutes1;
    const workingHours1 = Math.floor(totalMinutesWorked1 / 60); // 시간 부분
    
    const timeRecord1 = await prisma.timeRecord.create({
      data: {
        userId: user1Id,
        locationId: 7,
        date: '03-03-2025',
        clockInTime: '07:29',
        breakStartTime1: user1BreakStart,
        breakEndTime1: user1BreakEnd,
        clockOutTime: '16:00',
        breakMinutes: 30, // 0h 30m
        workingHours: 8.0, // 8h 0m
        status: 'completed',
        createdAt: now
      }
    });
    
    console.log('첫 번째 사용자 출퇴근 기록 생성 완료:', timeRecord1);
    
    // 두 번째 사용자의 출퇴근 기록 생성
    const user2Id = '3a4959d1-7793-47d1-ab3c-463946ca12a4';
    const user2BreakStart = '10:33';
    const user2BreakEnd = '11:03';
    
    // 휴식 시간 계산 (분 단위)
    const [breakStartHour2, breakStartMin2] = user2BreakStart.split(':').map(Number);
    const [breakEndHour2, breakEndMin2] = user2BreakEnd.split(':').map(Number);
    const breakMinutes2 = (breakEndHour2 * 60 + breakEndMin2) - (breakStartHour2 * 60 + breakStartMin2);
    
    // 근무 시간 계산 (clockOutTime 기준)
    const [clockInHour2, clockInMin2] = '07:29'.split(':').map(Number);
    const [clockOutHour2, clockOutMin2] = '16:00'.split(':').map(Number);
    const totalMinutesWorked2 = (clockOutHour2 * 60 + clockOutMin2) - (clockInHour2 * 60 + clockInMin2) - breakMinutes2;
    const workingHours2 = Math.floor(totalMinutesWorked2 / 60); // 시간 부분
    
    const timeRecord2 = await prisma.timeRecord.create({
      data: {
        userId: user2Id,
        locationId: 7,
        date: '03-03-2025',
        clockInTime: '07:29',
        breakStartTime1: user2BreakStart,
        breakEndTime1: user2BreakEnd,
        clockOutTime: '16:00',
        breakMinutes: 30, // 0h 30m
        workingHours: 8.0, // 8h 0m
        status: 'completed',
        createdAt: now
      }
    });
    
    console.log('두 번째 사용자 출퇴근 기록 생성 완료:', timeRecord2);
    
    // 세 번째 사용자의 출퇴근 기록 생성
    const user3Id = 'ccf6ddde-3a05-4d72-bb2d-076fc60e0099';
    const user3BreakStart = '09:56';
    const user3BreakEnd = '10:25';
    
    // 휴식 시간 계산 (분 단위)
    const [breakStartHour3, breakStartMin3] = user3BreakStart.split(':').map(Number);
    const [breakEndHour3, breakEndMin3] = user3BreakEnd.split(':').map(Number);
    const breakMinutes3 = (breakEndHour3 * 60 + breakEndMin3) - (breakStartHour3 * 60 + breakStartMin3);
    
    // 근무 시간 계산 (clockOutTime 기준)
    const [clockInHour3, clockInMin3] = '07:29'.split(':').map(Number);
    const [clockOutHour3, clockOutMin3] = '14:00'.split(':').map(Number);
    const totalMinutesWorked3 = (clockOutHour3 * 60 + clockOutMin3) - (clockInHour3 * 60 + clockInMin3) - breakMinutes3;
    const workingHours3 = Math.floor(totalMinutesWorked3 / 60); // 시간 부분
    
    const timeRecord3 = await prisma.timeRecord.create({
      data: {
        userId: user3Id,
        locationId: 7,
        date: '03-03-2025',
        clockInTime: '07:29',
        breakStartTime1: user3BreakStart,
        breakEndTime1: user3BreakEnd,
        clockOutTime: '14:00',
        breakMinutes: 29, // 0h 29m (계산된 값)
        workingHours: 6.0, // 6h 2m -> 반올림하여 6.0
        status: 'completed',
        createdAt: now
      }
    });
    
    console.log('세 번째 사용자 출퇴근 기록 생성 완료:', timeRecord3);
    
    // 네 번째 사용자의 출퇴근 기록 생성
    const user4Id = '400d8242-b598-49aa-85de-3cd0cf2a6e1b';
    const user4BreakStart = '12:09';
    const user4BreakEnd = '12:40';
    
    // 휴식 시간 계산 (분 단위)
    const [breakStartHour4, breakStartMin4] = user4BreakStart.split(':').map(Number);
    const [breakEndHour4, breakEndMin4] = user4BreakEnd.split(':').map(Number);
    const breakMinutes4 = (breakEndHour4 * 60 + breakEndMin4) - (breakStartHour4 * 60 + breakStartMin4);
    
    // 근무 시간 계산 (clockOutTime 기준)
    const [clockInHour4, clockInMin4] = '09:20'.split(':').map(Number);
    const [clockOutHour4, clockOutMin4] = '15:00'.split(':').map(Number);
    const totalMinutesWorked4 = (clockOutHour4 * 60 + clockOutMin4) - (clockInHour4 * 60 + clockInMin4) - breakMinutes4;
    const workingHours4 = Math.floor(totalMinutesWorked4 / 60); // 시간 부분
    
    const timeRecord4 = await prisma.timeRecord.create({
      data: {
        userId: user4Id,
        locationId: 7,
        date: '03-03-2025',
        clockInTime: '09:20',
        breakStartTime1: user4BreakStart,
        breakEndTime1: user4BreakEnd,
        clockOutTime: '15:00',
        breakMinutes: 31, // 0h 31m (계산된 값)
        workingHours: 5.0, // 5h 9m -> 반올림하여 5.0
        status: 'completed',
        createdAt: now
      }
    });
    
    console.log('네 번째 사용자 출퇴근 기록 생성 완료:', timeRecord4);
    
  } catch (error) {
    console.error('출퇴근 기록 생성 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTimeRecords()
  .then(() => console.log('출퇴근 기록 생성 완료'))
  .catch(e => console.error(e)); 