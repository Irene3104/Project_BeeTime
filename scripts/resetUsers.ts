import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    // 보존할 사용자 ID 목록
    const preserveUserIds = [
      '3a4959d1-7793-47d1-ab3c-463946ca12a4',
      '25bd10f3-5d46-40a2-9351-88e66072fddb',
      '400d8242-b598-49aa-85de-3cd0cf2a6e1b',
      '8ba2919b-a4fa-4d78-af04-bf97a1336ddf'
    ];

    // Admin 역할을 가진 사용자 찾기
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      }
    });

    // 보존할 Admin 사용자 ID 추가
    const adminUserIds = adminUsers.map(user => user.id);
    const allPreserveIds = [...new Set([...preserveUserIds, ...adminUserIds])]; // 중복 제거
    
    console.log('보존할 사용자 ID:', allPreserveIds);

    // 트랜잭션 없이 순서대로 삭제
    // 1. 모든 TimeRecord 삭제
    const deleteAllTimeRecords = await prisma.timeRecord.deleteMany({});
    console.log(`${deleteAllTimeRecords.count}개의 시간 기록이 모두 삭제되었습니다.`);
    
    // 2. LocationUser 테이블의 관계 삭제 (보존할 사용자 제외)
    const deleteLocationUsers = await prisma.locationUser.deleteMany({
      where: {
        userId: {
          notIn: allPreserveIds
        }
      }
    });
    console.log(`${deleteLocationUsers.count}개의 위치-사용자 관계가 삭제되었습니다.`);
    
    // 3. 보존할 사용자를 제외한 모든 사용자 삭제
    const deleteUsers = await prisma.user.deleteMany({
      where: {
        id: {
          notIn: allPreserveIds
        }
      }
    });
    console.log(`${deleteUsers.count}명의 사용자가 삭제되었습니다.`);
    
    // 4. 보존할 Location(id 7, 4)을 제외한 모든 Location 삭제
    const deleteLocations = await prisma.location.deleteMany({
      where: {
        id: {
          notIn: [7, 4]
        }
      }
    });
    console.log(`${deleteLocations.count}개의 위치 정보가 삭제되었습니다.`);

    console.log('데이터베이스 리셋이 완료되었습니다.');
  } catch (error) {
    console.error('데이터베이스 리셋 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .then(() => console.log('데이터베이스 리셋 완료'))
  .catch(e => console.error(e));