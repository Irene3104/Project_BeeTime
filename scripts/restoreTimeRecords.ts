import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreTimeRecords() {
  try {
    console.log('TimeRecords 복원 시작...');

    // 기존 TimeRecords 먼저 삭제
    await prisma.timeRecord.deleteMany({});
    console.log('기존 TimeRecords 삭제 완료');

    // 화면에 표시된 TimeRecords 데이터
    const timeRecordsData = [
      {
        userId: '25bd10f3-5d46-40a2-9351-88e66072fddb', // Heidi
        date: '03-03-2025',
        clockInTime: '07:29',
        clockOutTime: '16:00',
        breakStartTime1: '11:28',
        breakEndTime1: '11:58',
        breakMinutes: 30,
        workingHours: 8.01,
        locationId: 10
      },
      {
        userId: '3a4959d1-7793-47d1-ab3c-463946ca12a4', // Jaeyoung
        date: '03-03-2025',
        clockInTime: '07:29',
        clockOutTime: '16:00',
        breakStartTime1: '10:33',
        breakEndTime1: '11:03',
        breakMinutes: 30,
        workingHours: 8.01,
        locationId: 10
      },
      {
        userId: 'ccf6ddde-3a05-4d72-bb2d-076fc60e0099', // Seoyoon
        date: '03-03-2025',
        clockInTime: '07:29',
        clockOutTime: '14:00',
        breakStartTime1: '09:56',
        breakEndTime1: '10:25',
        breakMinutes: 29,
        workingHours: 6.02,
        locationId: 10
      },
      {
        userId: '400d8242-b598-49aa-85de-3cd0cf2a6e1b', // Sol
        date: '03-03-2025',
        clockInTime: '09:29',
        clockOutTime: '15:00',
        breakStartTime1: '12:09',
        breakEndTime1: '12:40',
        breakMinutes: 31,
        workingHours: 5,
        locationId: 10
      },
      {
        userId: '25bd10f3-5d46-40a2-9351-88e66072fddb', // Heidi
        date: '04-03-2025',
        clockInTime: '08:28',
        clockOutTime: '16:59',
        breakStartTime1: '12:53',
        breakEndTime1: '13:23',
        breakMinutes: 30,
        workingHours: 8.01,
        locationId: 10
      },
      {
        userId: '3a4959d1-7793-47d1-ab3c-463946ca12a4', // Jaeyoung
        date: '04-03-2025',
        clockInTime: '08:28',
        clockOutTime: '16:59',
        breakStartTime1: '12:09',
        breakEndTime1: '12:38',
        breakMinutes: 29,
        workingHours: 8.02,
        locationId: 10
      },
      {
        userId: '5ce9526b-ec44-4cb8-b1c2-53d0a150789b', // Sakura
        date: '04-03-2025',
        clockInTime: '08:29',
        clockOutTime: '15:03',
        breakStartTime1: '10:50',
        breakEndTime1: '11:20',
        breakMinutes: 30,
        workingHours: 6.07,
        locationId: 10
      },
      {
        userId: '400d8242-b598-49aa-85de-3cd0cf2a6e1b', // Sol
        date: '04-03-2025',
        clockInTime: '10:29',
        clockOutTime: '17:00',
        breakStartTime1: '13:42',
        breakEndTime1: '14:12',
        breakMinutes: 30,
        workingHours: 6.01,
        locationId: 10
      },
      {
        userId: '3a4959d1-7793-47d1-ab3c-463946ca12a4', // Jaeyoung
        date: '05-03-2025',
        clockInTime: '08:28',
        clockOutTime: '17:00',
        breakStartTime1: '11:21',
        breakEndTime1: '11:51',
        breakMinutes: 30,
        workingHours: 8.32,
        locationId: 10
      },
      {
        userId: '400d8242-b598-49aa-85de-3cd0cf2a6e1b', // Sol
        date: '05-03-2025',
        clockInTime: '08:28',
        clockOutTime: '14:00',
        breakStartTime1: '10:42',
        breakEndTime1: '11:12',
        breakMinutes: 30,
        workingHours: 5.32,
        locationId: 10
      },
      {
        userId: '5ce9526b-ec44-4cb8-b1c2-53d0a150789b', // Sakura
        date: '05-03-2025',
        clockInTime: '08:29',
        clockOutTime: '17:00',
        breakStartTime1: '12:03',
        breakEndTime1: '12:33',
        breakMinutes: 30,
        workingHours: 8.31,
        locationId: 10
      },
      {
        userId: '94e2a2f7-fc78-43fd-a860-a5f8390cda9a', // Nicholas
        date: '05-03-2025',
        clockInTime: '10:28',
        clockOutTime: '16:01',
        breakStartTime1: '12:06',
        breakEndTime1: '12:35',
        breakMinutes: 29,
        workingHours: 5.33,
        locationId: 10
      },
      {
        userId: '25bd10f3-5d46-40a2-9351-88e66072fddb', // Heidi
        date: '06-03-2025',
        clockInTime: '08:28',
        clockOutTime: '17:07',
        breakStartTime1: '13:23',
        breakEndTime1: '13:53',
        breakMinutes: 30,
        workingHours: 8.39,
        locationId: 10
      },
      {
        userId: '94e2a2f7-fc78-43fd-a860-a5f8390cda9a', // Nicholas
        date: '06-03-2025',
        clockInTime: '08:29',
        clockOutTime: '17:08',
        breakStartTime1: '12:08',
        breakEndTime1: '12:37',
        breakMinutes: 29,
        workingHours: 8.39,
        locationId: 10
      },
      {
        userId: '5ce9526b-ec44-4cb8-b1c2-53d0a150789b', // Sakura
        date: '06-03-2025',
        clockInTime: '08:29',
        clockOutTime: '15:04',
        breakStartTime1: '11:26',
        breakEndTime1: '11:56',
        breakMinutes: 30,
        workingHours: 6.35,
        locationId: 10
      },
      {
        userId: '6480f13a-e189-496d-9bdc-932d40e7e5ac', // Ayoung
        date: '06-03-2025',
        clockInTime: '10:30',
        clockOutTime: '17:08',
        breakStartTime1: '14:10',
        breakEndTime1: '14:39',
        breakMinutes: 29,
        workingHours: 6.38,
        locationId: 10
      }
    ];

    // TimeRecords 생성
    for (const record of timeRecordsData) {
      await prisma.timeRecord.create({
        data: {
          userId: record.userId,
          date: record.date,
          clockInTime: record.clockInTime,
          clockOutTime: record.clockOutTime,
          breakStartTime1: record.breakStartTime1,
          breakEndTime1: record.breakEndTime1,
          breakMinutes: record.breakMinutes,
          workingHours: record.workingHours,
          locationId: record.locationId,
          status: 'completed'
        }
      });
    }

    console.log(`${timeRecordsData.length}개의 TimeRecords 복원 완료!`);
  } catch (error) {
    console.error('TimeRecords 복원 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreTimeRecords()
  .then(() => console.log('스크립트 실행 완료'))
  .catch(e => console.error('스크립트 실행 오류:', e)); 