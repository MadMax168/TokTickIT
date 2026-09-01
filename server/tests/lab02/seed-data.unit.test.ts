import { describe, expect, it, vi } from 'vitest'
import { seedDatabase, type SeedClient } from '../../prisma/seed'

function createSeedClient() {
  return {
    category: { upsert: vi.fn().mockResolvedValue({}) },
    relatedSystem: { upsert: vi.fn().mockResolvedValue({}) },
    developmentRequester: { upsert: vi.fn().mockResolvedValue({}) },
  }
}

describe('BR-22: Lab 2 seed data', () => {
  it('uses unique-key upserts and remains idempotent across repeated runs', async () => {
    const prisma = createSeedClient()

    await seedDatabase(prisma as unknown as SeedClient)
    await seedDatabase(prisma as unknown as SeedClient)

    expect(prisma.category.upsert).toHaveBeenCalledTimes(8)
    expect(prisma.category.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: 'Account and Access' },
      create: { name: 'Account and Access', active: true },
    }))
    expect(prisma.relatedSystem.upsert).toHaveBeenCalledTimes(14)
    expect(prisma.relatedSystem.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: 'Campus Wi-Fi' },
      create: { name: 'Campus Wi-Fi', active: true },
    }))
    expect(prisma.developmentRequester.upsert).toHaveBeenCalledTimes(10)
    expect(prisma.developmentRequester.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'niran.somchai@example.test' },
      create: expect.objectContaining({ active: true }),
    }))
    expect(prisma.developmentRequester.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'pimchanok.inactive@example.test' },
      create: expect.objectContaining({ active: false }),
    }))
  })
})
