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
    },
    developmentRequester: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))
