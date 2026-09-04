import { describe, expect, it } from 'vitest'
import { createTicketNumberGenerator } from '../../src/ticket-number'

describe('UNIT-01: Ticket Number generator', () => {
  it('creates the documented number format using the server date', async () => {
    const generateTicketNumber = createTicketNumberGenerator({
      exists: async () => false,
      randomSuffix: () => 'ABCDEF',
    })

    await expect(generateTicketNumber(new Date('2026-09-03T12:34:56.000Z'))).resolves.toBe(
      'TT-20260903-ABCDEF',
    )
  })

  it('retries a collision and never returns the colliding number', async () => {
    const suffixes = ['ABCDEF', 'G234HJ']
    const checkedNumbers: string[] = []
    const generateTicketNumber = createTicketNumberGenerator({
      exists: async (ticketNumber) => {
        checkedNumbers.push(ticketNumber)
        return ticketNumber === 'TT-20260903-ABCDEF'
      },
      randomSuffix: () => suffixes.shift()!,
    })

    await expect(generateTicketNumber(new Date('2026-09-03T00:00:00.000Z'))).resolves.toBe(
      'TT-20260903-G234HJ',
    )
    expect(checkedNumbers).toEqual(['TT-20260903-ABCDEF', 'TT-20260903-G234HJ'])
  })

  it('uses only the approved unambiguous uppercase alphabet for generated suffixes', async () => {
    const generateTicketNumber = createTicketNumberGenerator({
      exists: async () => false,
      random: () => 0,
    })

    await expect(generateTicketNumber(new Date('2026-09-03T00:00:00.000Z'))).resolves.toMatch(
      /^TT-20260903-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/,
    )
  })
})
