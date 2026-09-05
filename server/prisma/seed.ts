import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

export type SeedClient = Pick<
  PrismaClient,
  'category' | 'relatedSystem' | 'developmentRequester'
>

const categories = [
  'Account and Access',
  'Hardware',
  'Software',
  'Network',
]

const relatedSystems = [
  'Email',
  'Campus Wi-Fi',
  'VPN',
  'LEB2 App',
  'Grade Submission App',
  'Printer',
  'Corporate Laptop',
]

const developmentRequesters = [
  { name: 'Niran Somchai', email: 'niran.somchai@example.test', active: true },
  { name: 'Aree Chai', email: 'aree.chai@example.test', active: true },
  { name: 'Kanya Suksai', email: 'kanya.suksai@example.test', active: true },
  { name: 'Thanawat Arun', email: 'thanawat.arun@example.test', active: true },
  { name: 'Pimchanok Inactive', email: 'pimchanok.inactive@example.test', active: false },
]

export async function seedDatabase(prisma: SeedClient) {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    })
  }

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    })
  }

  for (const requester of developmentRequesters) {
    await prisma.developmentRequester.upsert({
      where: { email: requester.email },
      update: { name: requester.name, active: requester.active },
      create: requester,
    })
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    await seedDatabase(prisma)
    console.log('Seed complete')
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
