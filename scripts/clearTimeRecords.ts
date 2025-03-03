import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTimeRecords() {
  try {
    // TimeRecord 테이블의 모든 레코드 삭제
    const deletedRecords = await prisma.timeRecord.deleteMany({});
    
    console.log(`${deletedRecords.count}개의 시간 기록이 모두 삭제되었습니다.`);
    console.log('TimeRecord 테이블 초기화가 완료되었습니다.');
  } catch (error) {
    console.error('TimeRecord 테이블 초기화 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearTimeRecords()
  .then(() => console.log('TimeRecord 테이블 초기화 완료'))
  .catch(e => console.error(e)); 