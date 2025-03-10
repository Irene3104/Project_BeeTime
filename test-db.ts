import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Location 데이터 생성
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: 'Sorrel Cafe & Bar',
        company: 'Juncafe Opera Pty Ltd',
        address: 'Shop K333-334, Level 3, Broadway Sydney1 Bay St. Broadway NSW 2007'
      }
    }),
    prisma.location.create({
      data: {
        name: 'Baskin Robbins',
        branch: 'Circular Quay',
        company: 'Ice Opera Pty Ltd',
        address: 'Shop 4, Lot 2 Quay Grand 61-63 Macquarie St. Sydney NSW 2000'
      }
    }),
    prisma.location.create({
      data: {
        name: 'Baskin Robbins',
        branch: 'Manly',
        company: 'Ice Opera Pty Ltd',
        address: '53 East Esplanade, The Corso, Manly NSW 2095'
      }
    }),
    prisma.location.create({
      data: {
        name: 'Sushi Roll',
        company: 'Top Ryde Sushiroll Pty Ltd',
        address: 'Shop R3402, Ground Level Piazza Dining, Top Ryde City Shopping Centre 109-129 Blaxland Rd. Ryde NSW 2112'
      }
    })
  ]);

  console.log('생성된 지점들:', locations);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })