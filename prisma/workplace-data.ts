import { PrismaClient } from '@prisma/client'
import { Client } from '@googlemaps/google-maps-services-js';

const prisma = new PrismaClient()
const googleMapsClient = new Client({});

async function initializeWorkplaces() {
  // 기존 데이터 삭제 (선택사항)
  await prisma.location.deleteMany();

  // Get Place IDs for each location
  const workplaces = await Promise.all([
    getPlaceIdAndCreate({
      name: 'Sorrel Cafe & Bar',
      company: 'Juncafe Opera Pty Ltd',
      address: 'Broadway Shopping Centre K34, K34/1 Bay St, Glebe NSW 2037, Australia'
    }),
    getPlaceIdAndCreate({
      name: 'Baskin Robbins',
      branch: 'Circular Quay',
      company: 'Ice Opera Pty Ltd',
      address: 'Quay Grand, Lot 2/61-63 Macquarie St, Sydney NSW 2000, Australia'
    }),
    getPlaceIdAndCreate({
      name: 'Baskin Robbins',
      branch: 'Manly',
      company: 'Ice Opera Pty Ltd',
      address: '53 East Esplanade, The Corso, Manly NSW 2095, Australia'
    }),
    getPlaceIdAndCreate({
      name: 'Sushi Roll',
      company: 'Top Ryde Sushiroll Pty Ltd',
      address: 'Shop 3042, Ground Level, Devlin St, Ryde NSW 2112, Australia'
    }),
    getPlaceIdAndCreate({
      name: 'Home',
      company: 'Stephen & Irene Co',
      address: 'unit 12/50 Audley St, Petersham NSW 2049, Australia'
    })
  ]);

  console.log('지점 데이터 생성 완료:', workplaces);
}

async function getPlaceIdAndCreate(locationData: any) {
  const response = await googleMapsClient.findPlaceFromText({
    params: {
      input: `${locationData.name} ${locationData.address}`,
      inputtype: 'textquery' as const,
      key: process.env.GOOGLE_MAPS_API_KEY!
    }
  });

  const placeId = response.data.candidates[0]?.place_id;
  if (!placeId) throw new Error(`Could not find place ID for ${locationData.name}`);

  return prisma.location.create({
    data: {
      ...locationData,
      placeId
    }
  });
}

initializeWorkplaces()
  .catch((e) => {
    console.error('지점 데이터 생성 중 에러 발생:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 

