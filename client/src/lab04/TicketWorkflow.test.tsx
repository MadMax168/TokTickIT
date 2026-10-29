import { describe, expect, it } from 'vitest'
import { statusPayload } from '../lab03/StaffWorkspace'

describe('UI-02: Ticket workflow', () => {
  it('documents the permitted transition set used by Ticket Detail', () => {
    const transitions: Record<string, string[]> = { NEW: ['OPEN', 'CANCELLED'], CLOSED: [], CANCELLED: [] }
    expect(transitions.NEW).toEqual(['OPEN', 'CANCELLED'])
    expect(transitions.CLOSED).toEqual([])
  })

  it('UI-02: omits reasons for non-terminal transition requests', () => {
    expect(statusPayload({ currentStatus: 'OPEN', reason: 'Staff workflow update', version: 1 })).toEqual({ currentStatus: 'OPEN', version: 1 })
    expect(statusPayload({ currentStatus: 'RESOLVED', reason: 'Resolved with confirmation', version: 1 })).toEqual({ currentStatus: 'RESOLVED', reason: 'Resolved with confirmation', version: 1 })
  })
})
