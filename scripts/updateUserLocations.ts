import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserLocations() {
  try {
    console.log('사용자 위치 정보 업데이트 시작...');

    // 모든 사용자의 locationId를 10으로 업데이트
    const updateResult = await prisma.user.updateMany({
      data: {
        locationId: 10,
      },
    });

    console.log(`${updateResult.count}명의 사용자 locationId가 10으로 업데이트되었습니다.`);

    // 업데이트된 사용자 정보 확인
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        locationId: true,
      },
    });

    console.log('\n업데이트된 사용자 목록:');
    users.forEach(user => {
      console.log(`${user.name || user.email}: locationId = ${user.locationId}`);
    });

    console.log('\n사용자 위치 정보 업데이트 완료!');
  } catch (error) {
    console.error('사용자 위치 정보 업데이트 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserLocations()
  .then(() => console.log('스크립트 실행 완료'))
  .catch(e => console.error('스크립트 실행 오류:', e)); 