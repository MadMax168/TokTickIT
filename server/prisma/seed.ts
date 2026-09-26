import { readFileSync } from 'node:fs'
import { seedLab03 } from './seed-lab03'
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

export type SeedClient = Pick<
  PrismaClient,
  'category' | 'relatedSystem' | 'developmentRequester'
> & Partial<Pick<PrismaClient, 'user'>>

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
      update: {},
      create: { name, active: true },
    })
  }

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name, active: true },
    })
  }

  for (const requester of developmentRequesters) {
    const legacy = await prisma.developmentRequester.upsert({
      where: { email: requester.email },
      update: {},
      create: requester,
    })
    // Legacy-only E2E fixtures still need the migrated User FK; no usable credential is created.
    if (prisma.user) await prisma.user.upsert({
      where: { id: legacy.id }, update: {},
      create: { id: legacy.id, name: legacy.name, email: legacy.email.trim().toLowerCase(), active: legacy.active, role: 'REQUESTER', passwordHash: '!UNPROVISIONED' },
    })
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    if (process.env.LAB02_SEED !== 'true') {
      const file = process.env.LAB03_CREDENTIALS_FILE
      if (!file) throw new Error('LAB03_CREDENTIALS_FILE is required for local-only Lab 3 seed')
      const passwords = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>
      await seedLab03(prisma, email => passwords[email])
    } else {
      await seedDatabase(prisma)
    }
    console.log('Seed complete')
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch(() => {
    console.error('Seed failed; check the credential file and database configuration.')
    process.exitCode = 1
  })
}
