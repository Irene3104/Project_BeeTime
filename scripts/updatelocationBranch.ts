import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateLocationPlaceId(
  // 찾을 조건 (id)
  locationId: number, 
  // 새로운 placeId 값
  newPlaceId: string
) {
  try {
    console.log(`ID ${locationId} 위치 정보 업데이트 시작...`);
    
    // 먼저 수정할 위치 찾기
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });
    
    if (!location) {
      console.log(`해당 위치를 찾을 수 없습니다: ID ${locationId}`);
      return null;
    }
    
    // placeId 필드 업데이트
    const updatedLocation = await prisma.location.update({
      where: { id: locationId },
      data: { placeId: newPlaceId }
    });
    
    console.log(`위치 정보 업데이트 완료: ${updatedLocation.name} (placeId: ${updatedLocation.placeId})`);
    return updatedLocation;
  } catch (error) {
    console.error('위치 정보 업데이트 중 오류 발생:', error);
    throw error;
  }
}

async function main() {
  try {
    // 예시: ID 1 위치의 placeId를 'ChIJ...'로 업데이트
    await updateLocationPlaceId(
      14, // 찾을 조건 (id)
      'ChIJqZCDi6-lEmsRgRfhUvSiZAU' // 새 placeId 값
    );
    
    console.log('업데이트 완료!');
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();