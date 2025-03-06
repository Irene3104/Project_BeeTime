import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateWorkingHours() {
  try {
    console.log('workingHours 업데이트 시작...');

    // 사진에 표시된 레코드들 정보
    const records = [
      {
        userId: '3a4959d1-7793-47d1-ab3c-463946ca12a4', // Jaeyoung
        date: '05-03-2025',
        workingHours: 8.32
      },
      {
        userId: '400d8242-b598-49aa-85de-3cd0cf2a6e1b', // Sol
        date: '05-03-2025',
        workingHours: 5.32
      },
      {
        userId: '5ce9526b-ec44-4cb8-b1c2-53d0a150789b', // Sakura
        date: '05-03-2025',
        workingHours: 8.31
      },
      {
        userId: '94e2a2f7-fc78-43fd-a860-a5f8390cda9a', // Nicholas
        date: '05-03-2025',
        workingHours: 5.33
      },
      {
        userId: '25bd10f3-5d46-40a2-9351-88e66072fddb', // Heidi
        date: '06-03-2025',
        workingHours: 8.39
      },
      {
        userId: '94e2a2f7-fc78-43fd-a860-a5f8390cda9a', // Nicholas
        date: '06-03-2025',
        workingHours: 8.39
      },
      {
        userId: '5ce9526b-ec44-4cb8-b1c2-53d0a150789b', // Sakura
        date: '06-03-2025',
        workingHours: 6.35
      },
      {
        userId: '6480f13a-e189-496d-9bdc-932d40e7e5ac', // Ayoung
        date: '06-03-2025',
        workingHours: 6.38
      }
    ];

    // 각 레코드 업데이트
    let updatedCount = 0;
    for (const record of records) {
      // userId와 date로 해당 레코드 찾기
      const result = await prisma.timeRecord.updateMany({
        where: {
          userId: record.userId,
          date: record.date
        },
        data: {
          workingHours: record.workingHours
        }
      });

      if (result.count > 0) {
        updatedCount += result.count;
        console.log(`사용자 ${record.userId}, 날짜 ${record.date}의 workingHours를 ${record.workingHours}로 업데이트 완료`);
      } else {
        console.log(`사용자 ${record.userId}, 날짜 ${record.date}의 레코드를 찾을 수 없습니다.`);
      }
    }

    console.log(`총 ${updatedCount}개의 레코드 workingHours 업데이트 완료!`);
  } catch (error) {
    console.error('workingHours 업데이트 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateWorkingHours()
  .then(() => console.log('스크립트 실행 완료'))
  .catch(e => console.error('스크립트 실행 오류:', e)); 