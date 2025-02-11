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

async function getPlaceIdAndCreate(locationData: LocationData) {
  const response = await googleMapsClient.findPlaceFromText({
    params: {
      input: `${locationData.name} ${locationData.address}`,
      inputtype: PlaceInputType.textQuery,
      fields: ['place_id'],
      key: process.env.GOOGLE_MAPS_API_KEY || ''
    }
  });

  const placeId = response.data.candidates[0]?.place_id;
  if (!placeId) throw new Error(`Could not find place ID for ${locationData.name}`);

  return prisma.location.create({
    data: {
      name: locationData.name,
      branch: locationData.branch,
      company: locationData.company,
      address: locationData.address,
      placeId: placeId
    }
  });
}

async function main() {
  // First delete related records
  await prisma.timeRecord.deleteMany();
  await prisma.locationUser.deleteMany();
  await prisma.location.deleteMany();

  // Then create new locations with more precise addresses
  const locations = await Promise.all([
    getPlaceIdAndCreate({
      name: 'Sorrel Cafe & Bar',
      company: 'Juncafe Opera Pty Ltd',
      address: 'Broadway Shopping Centre, Bay Street, Broadway NSW 2007'
    }),
    getPlaceIdAndCreate({
      name: 'Baskin Robbins',
      branch: 'Circular Quay',
      company: 'Ice Opera Pty Ltd',
      address: '61-63 Macquarie Street, Sydney NSW 2000'
    }),
    getPlaceIdAndCreate({
      name: 'Baskin Robbins',
      branch: 'Manly',
      company: 'Ice Opera Pty Ltd',
      address: '53 East Esplanade, Manly NSW 2095'
    }),
    getPlaceIdAndCreate({
      name: 'Sushi Roll',
      company: 'Top Ryde Sushiroll Pty Ltd',
      address: 'Top Ryde City Shopping Centre, Devlin Street, Ryde NSW 2112'
    }),
    getPlaceIdAndCreate({
      name: 'Home',
      company: 'Stephen & Irene Co',
      address: '50 Audley Street, Petersham NSW 2049'
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

