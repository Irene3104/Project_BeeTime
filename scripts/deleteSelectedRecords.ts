import { PrismaClient } from '@prisma/client';

async function deleteSelectedRecords() {
  console.log('선택된 TimeRecord 삭제 시작...');
  const prisma = new PrismaClient();

  try {
    // 삭제할 레코드 정보 (이미지에서 파란색으로 표시된 데이터)
    const userId = '3fc99f4b-f0b8-4610-9a11-1232a5bff3ee';
    const date = '12-03-2025';
    
    console.log(`삭제 조건: userId=${userId}, date=${date}`);
    
    // 먼저 해당 레코드가 존재하는지 확인
    const record = await prisma.timeRecord.findFirst({
      where: {
        userId: userId,
        date: date
      }
    });
    
    if (!record) {
      console.log(`지정된 조건(userId=${userId}, date=${date})의 레코드를 찾을 수 없습니다.`);
      return { count: 0 };
    }
    
    console.log('삭제할 레코드 찾음:', record);
    
    // 레코드 삭제
    const deleteResult = await prisma.timeRecord.delete({
      where: {
        id: record.id
      }
    });
    
    console.log(`삭제 완료: ID ${record.id}인 레코드가 삭제되었습니다.`);
    return { count: 1 };
  } catch (error) {
    console.error('레코드 삭제 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
deleteSelectedRecords()
  .then((result) => {
    console.log(`스크립트 실행 완료: ${result.count}개 레코드 삭제됨`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('스크립트 실행 중 오류 발생:', error);
    process.exit(1);
  });