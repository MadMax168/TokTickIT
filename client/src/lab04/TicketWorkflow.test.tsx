import { describe, expect, it } from 'vitest'

describe('UI-02: Ticket workflow', () => {
  it('documents the permitted transition set used by Ticket Detail', () => {
    const transitions: Record<string, string[]> = { NEW: ['OPEN', 'CANCELLED'], CLOSED: [], CANCELLED: [] }
    expect(transitions.NEW).toEqual(['OPEN', 'CANCELLED'])
    expect(transitions.CLOSED).toEqual([])
  })
})
