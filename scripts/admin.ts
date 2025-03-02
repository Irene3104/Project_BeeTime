// prisma/seed.ts 또는 관련 스크립트
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // master admin 계정 생성
  await prisma.user.upsert({
    where: { email: 'beetimeapp@gmail.com' },
    update: { 
      role: 'ADMIN',
      isProfileComplete: true
    },
    create: {
      email: 'beetimeapp@gmail.com',
      role: 'ADMIN',
      isProfileComplete: true
    }
  })

  // Google 로그인용 admin 계정 생성
  await prisma.user.upsert({
    where: { email: 'imeugenejun@gmail.com' },
    update: {
      role: 'ADMIN', 
      isProfileComplete: true
    },
    create: {
      email: 'imeugenejun@gmail.com',
      role: 'ADMIN',
      isProfileComplete: true
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })