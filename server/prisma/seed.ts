import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
]

async function main() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log('Seed complete')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
