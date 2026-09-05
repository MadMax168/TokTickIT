import { describe, expect, it } from 'vitest'
import { validateCreateTicketInput } from '../../src/ticket-validation'

const validInput = {
  clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
  categoryId: 1,
  relatedSystemId: 2,
  requestedPriority: 'MEDIUM',
  summary: 'A valid ticket summary',
  description: 'A valid ticket description with twenty characters.',
}

describe('UNIT-02: Create Ticket validation and normalization', () => {
  it('trims text and accepts inclusive summary and description boundaries', () => {
    const result = validateCreateTicketInput({
      ...validInput,
      summary: `  ${'s'.repeat(5)}  `,
      description: `  ${'d'.repeat(20)}  `,
    })

    expect(result).toEqual({
      ok: true,
      value: {
        ...validInput,
        summary: 's'.repeat(5),
        description: 'd'.repeat(20),
      },
    })
  })

  it('accepts the maximum inclusive text lengths', () => {
    expect(validateCreateTicketInput({
      ...validInput,
      summary: 's'.repeat(120),
      description: 'd'.repeat(4000),
    })).toMatchObject({ ok: true })
  })

  it.each([
    [{ ...validInput, summary: ' four' }],
    [{ ...validInput, summary: 's'.repeat(121) }],
    [{ ...validInput, summary: '   ' }],
    [{ ...validInput, description: 'd'.repeat(19) }],
    [{ ...validInput, description: 'd'.repeat(4001) }],
    [{ ...validInput, description: '   ' }],
    [{ ...validInput, requestedPriority: 'URGENT' }],
    [{ ...validInput, categoryId: 0 }],
    [{ ...validInput, relatedSystemId: 1.5 }],
    [{ ...validInput, clientRequestId: 'not-a-uuid' }],
    [{ ...validInput, ticketNumber: 'TT-20260903-ABCDEF' }],
  ])('rejects invalid values and server-generated fields', (input) => {
    expect(validateCreateTicketInput(input)).toEqual({ ok: false })
  })

  it('rejects unknown extra request-body fields', () => {
    expect(validateCreateTicketInput({ ...validInput, unexpected: true })).toEqual({ ok: false })
  })

  it('accepts each documented Requested Priority value', () => {
    for (const requestedPriority of ['LOW', 'MEDIUM', 'HIGH']) {
      expect(validateCreateTicketInput({ ...validInput, requestedPriority })).toMatchObject({
        ok: true,
        value: { requestedPriority },
      })
    }
  })
})
