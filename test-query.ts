import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Querying locations...');
    const locations = await prisma.location.findMany();
    console.log('Locations:', JSON.stringify(locations, null, 2));
    
    console.log('\nQuerying users...');
    const users = await prisma.user.findMany();
    console.log('Users:', JSON.stringify(users, null, 2));
    
    console.log('\nQuerying time records...');
    const timeRecords = await prisma.timeRecord.findMany({
      include: {
        user: true,
        location: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    console.log('Time Records:', JSON.stringify(timeRecords, null, 2));
    console.log(`Found ${timeRecords.length} time records`);
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 