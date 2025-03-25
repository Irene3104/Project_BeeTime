import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateLocationBranch(
  // 찾을 조건 (이름, 주소 등)
  findCondition: { name: string, address?: string }, 
  // 새로운 branch 값
  newBranch: string
) {
  try {
    console.log(`'${findCondition.name}' 위치 정보 업데이트 시작...`);
    
    // 먼저 수정할 위치 찾기
    const location = await prisma.location.findFirst({
      where: {
        name: findCondition.name,
        ...(findCondition.address ? { address: findCondition.address } : {})
      }
    });
    
    if (!location) {
      console.log(`해당 위치를 찾을 수 없습니다: ${findCondition.name}`);
      return null;
    }
    
    // branch 필드 업데이트
    const updatedLocation = await prisma.location.update({
      where: { id: location.id },
      data: { branch: newBranch }
    });
    
    console.log(`위치 정보 업데이트 완료: ${updatedLocation.name} (branch: ${updatedLocation.branch})`);
    return updatedLocation;
  } catch (error) {
    console.error('위치 정보 업데이트 중 오류 발생:', error);
    throw error;
  }
}

async function main() {
  try {
    // 예시: 'Home' 위치의 branch를 'Main'으로 업데이트
    await updateLocationBranch(
      { name: 'Sorrel Cafe & Bar' }, // 찾을 조건
      'Broadway' // 새 branch 값
    );
    
    console.log('업데이트 완료!');
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();