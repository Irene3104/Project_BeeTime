import { PrismaClient } from '@prisma/client'
import { Client, PlaceInputType } from '@googlemaps/google-maps-services-js'

const prisma = new PrismaClient()
const googleMapsClient = new Client({})

interface LocationData {
  name: string
  branch?: string
  company: string
  address: string
}

async function getPlaceIdAndUpsert(locationData: LocationData) {
  try {
    console.log(`위치 정보 처리 중: ${locationData.name} ${locationData.branch || ''}`);
    
    // 먼저 이미 존재하는 위치 정보 확인
    const existingLocation = await prisma.location.findFirst({
      where: {
        name: locationData.name,
        branch: locationData.branch || null
      }
    });
    
    if (existingLocation) {
      console.log(`이미 존재하는 위치 정보: ${locationData.name} ${locationData.branch || ''} (ID: ${existingLocation.id})`);
      return existingLocation;
    }
    
    // 새 위치 정보 생성
    console.log(`새 위치 정보 생성 중: ${locationData.name} ${locationData.branch || ''}`);
    
    // Google Maps API를 사용하여 placeId 가져오기
    const response = await googleMapsClient.findPlaceFromText({
      params: {
        input: `${locationData.name} ${locationData.address}`,
        inputtype: PlaceInputType.textQuery,
        fields: ['place_id'],
        key: process.env.GOOGLE_MAPS_API_KEY || ''
      }
    });

    const placeId = response.data.candidates[0]?.place_id;
    if (!placeId) {
      console.error(`위치 ID를 찾을 수 없음: ${locationData.name}`);
      throw new Error(`Could not find place ID for ${locationData.name}`);
    }

    // 새 위치 정보 생성
    const newLocation = await prisma.location.create({
      data: {
        name: locationData.name,
        branch: locationData.branch,
        company: locationData.company,
        address: locationData.address,
        placeId: placeId
      }
    });
    
    console.log(`새 위치 정보 생성 완료: ${locationData.name} ${locationData.branch || ''} (ID: ${newLocation.id})`);
    return newLocation;
  } catch (error) {
    console.error(`위치 정보 처리 중 오류 발생: ${locationData.name} ${locationData.branch || ''}`, error);
    throw error;
  }
}

async function main() {
  console.log('위치 정보 업데이트 시작...');
  
  // 관련 레코드 삭제하지 않고 upsert로 처리
  console.log('기존 위치 정보 유지, 새 위치 정보만 추가됩니다.');
  
  try {
    // 위치 정보 생성 또는 확인
    const locations = await Promise.all([
      // getPlaceIdAndUpsert({
      //   name: 'Sorrel Cafe & Bar',
      //   company: 'Juncafe Opera Pty Ltd',
      //   address: 'Broadway Shopping Centre, Bay Street, Broadway NSW 2007'
      // }),
      // getPlaceIdAndUpsert({
      //   name: 'Baskin Robbins',
      //   branch: 'Circular Quay',
      //   company: 'Ice Opera Pty Ltd',
      //   address: '61-63 Macquarie Street, Sydney NSW 2000'
      // }),
      // getPlaceIdAndUpsert({
      //   name: 'Baskin Robbins',
      //   branch: 'Manly',
      //   company: 'Ice Opera Pty Ltd',
      //   address: '53 East Esplanade, Manly NSW 2095'
      // }),
      // getPlaceIdAndUpsert({
      //   name: 'Sushi Roll',
      //   company: 'Top Ryde Sushiroll Pty Ltd',
      //   address: 'Top Ryde City Shopping Centre, Devlin Street, Ryde NSW 2112'
      // }),
      getPlaceIdAndUpsert({
        name: 'Home',
        company: 'Stephen & Irene Co',
        address: '50 Audley Street, Petersham NSW 2049'
      })
    ]);

    console.log('처리된 위치 정보:', locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      branch: loc.branch
    })));
    
    console.log('위치 정보 업데이트 완료!');
  } catch (error) {
    console.error('위치 정보 업데이트 중 오류 발생:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('위치 정보 업데이트 오류:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 

