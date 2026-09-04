import { vi } from 'vitest'

vi.mock('../src/prisma', () => ({
  default: {
    category: {
      findMany: vi.fn().mockResolvedValue([
        { id: 1, name: 'Account and Access' },
        { id: 2, name: 'Hardware' },
        { id: 3, name: 'Software' },
        { id: 4, name: 'Network' },
      ]),
      findUnique: vi.fn(),
    },
    relatedSystem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    developmentRequester: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    ticket: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    attachment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))
