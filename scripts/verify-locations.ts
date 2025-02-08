import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyLocations() {
  const locations = await prisma.location.findMany();
  console.log('Current locations with Place IDs:');
  locations.forEach(loc => {
    console.log(`${loc.name}: ${loc.placeId || 'NO PLACE ID'}`);
  });
  await prisma.$disconnect();
}

verifyLocations();