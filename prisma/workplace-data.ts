import { PrismaClient } from '@prisma/client'
import { googleMapsClient } from '../src/server/services/googleMapsClient'

const prisma = new PrismaClient()

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

async function main() {
  await prisma.location.deleteMany(); // Clear existing data

  const locations = await Promise.all([
    getPlaceIdAndCreate({
      name: 'Sorrel Cafe & Bar',
      company: 'Juncafe Opera Pty Ltd',
      address: 'Shop K333-334, Level 3, Broadway Sydney1 Bay St. Broadway NSW 2007'
    }),
    getPlaceIdAndCreate({
      name: 'Baskin Robbins',
      branch: 'Circular Quay',
      company: 'Ice Opera Pty Ltd',
      address: 'Shop 4, Lot 2 Quay Grand 61-63 Macquarie St. Sydney NSW 2000'
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

  console.log('Created locations:', locations);
}

main()
  .catch((e) => {
    console.error('Error creating locations:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 

