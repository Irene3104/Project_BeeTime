import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 모든 시간 기록을 삭제하는 함수
 */
// async function clearAllTimeRecords() {
//   try {
//     // TimeRecord 테이블의 모든 레코드 삭제
//     const deletedRecords = await prisma.timeRecord.deleteMany({});
    
//     console.log(`${deletedRecords.count}개의 시간 기록이 모두 삭제되었습니다.`);
//     console.log('TimeRecord 테이블 초기화가 완료되었습니다.');
//   } catch (error) {
//     console.error('TimeRecord 테이블 초기화 중 오류 발생:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

/**
 * 특정 사용자의 시간 기록만 삭제하는 함수
 * @param userId 삭제할 사용자의 ID
 */
async function clearTimeRecordsForUser(userId: string) {
  try {
    // 특정 사용자의 TimeRecord 레코드만 삭제
    const deletedRecords = await prisma.timeRecord.deleteMany({
      where: {
        userId: userId
      }
    });
    
    console.log(`사용자 ID ${userId}의 ${deletedRecords.count}개 시간 기록이 삭제되었습니다.`);
  } catch (error) {
    console.error(`사용자 ID ${userId}의 TimeRecord 삭제 중 오류 발생:`, error);
  } finally {
    await prisma.$disconnect();
  }
}

// =====================================================================
// 실행할 함수를 선택하세요. 필요하지 않은 부분은 주석 처리하세요.
// =====================================================================

// // 1. 모든 시간 기록 삭제
// clearAllTimeRecords()
//   .then(() => console.log('모든 TimeRecord 삭제 완료'))
//   .catch(e => console.error(e));

//2. 특정 사용자의 시간 기록만 삭제
const userId = "f97e67c1-5231-4775-8a08-2ff10f0ff738"; // 예: "user_123456"
clearTimeRecordsForUser(userId)
  .then(() => console.log(`사용자 ID ${userId}의 TimeRecord 삭제 완료`))
  .catch(e => console.error(e));

// 3. 명령줄 인수로 userId를 받아 특정 사용자의 시간 기록 삭제
// const userId = process.argv[2];
// if (userId) {
//   clearTimeRecordsForUser(userId)
//     .then(() => console.log(`사용자 ID ${userId}의 TimeRecord 삭제 완료`))
//     .catch(e => console.error(e));
// } else {
//   console.log('사용법: npx ts-node scripts/clearTimeRecords.ts <userId>');
//   console.log('userId가 제공되지 않아 작업이 취소되었습니다.');
// }