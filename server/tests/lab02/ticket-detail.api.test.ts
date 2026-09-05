import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app'
import prisma from '../../src/prisma'

const ticket = {
  id: 10, ticketNumber: 'TT-20260905-ABCDEF', ticketDate: new Date('2026-09-05T00:00:00.000Z'),
  requesterId: 7, requestedPriority: 'MEDIUM', summary: 'Network connection unavailable', description: 'Campus Wi-Fi has been unavailable for more than twenty minutes.', currentStatus: 'NEW',
  createdAt: new Date('2026-09-05T00:00:00.000Z'), updatedAt: new Date('2026-09-05T01:00:00.000Z'),
  requester: { id: 7, name: 'Aree Chai' }, category: { id: 1, name: 'Network' }, relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
  attachments: [{ id: 3, ticketId: 10, storageKey: 'private-key', displayName: 'evidence.pdf', mimeType: 'application/pdf', sizeBytes: 120, uploadedAt: new Date('2026-09-05T00:00:00.000Z'), removedAt: null, removalReason: null }],
}

describe('Owned Ticket Detail API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.developmentRequester.findUnique).mockResolvedValue({ id: 7, active: true } as never)
  })

  it('returns the complete owned detail shape and safe attachment metadata', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(ticket as never)
    const response = await request(app).get('/api/tickets/10').set('X-Development-Requester-Id', '7')
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 10, ticketNumber: ticket.ticketNumber, requester: ticket.requester, description: ticket.description, attachments: [{ id: 3, displayName: 'evidence.pdf', isActive: true, downloadUrl: '/api/tickets/10/attachments/3/download' }] })
    expect(response.body.attachments[0].storageKey).toBeUndefined()
  })

  it('rejects an invalid ticket ID before lookup', async () => {
    const response = await request(app).get('/api/tickets/nope').set('X-Development-Requester-Id', '7')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('TICKET_ID_INVALID')
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled()
  })

  it('uses the same not-found response for missing and cross-requester Tickets', async () => {
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null)
    const missing = await request(app).get('/api/tickets/10').set('X-Development-Requester-Id', '7')
    const crossOwner = await request(app).get('/api/tickets/11').set('X-Development-Requester-Id', '7')
    expect(missing.body).toEqual({ error: { code: 'TICKET_NOT_FOUND', message: 'Ticket was not found.' } })
    expect(crossOwner.body).toEqual(missing.body)
  })

  it('returns a safe detail failure', async () => {
    vi.mocked(prisma.ticket.findFirst).mockRejectedValue(new Error('database detail'))
    const response = await request(app).get('/api/tickets/10').set('X-Development-Requester-Id', '7')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: { code: 'TICKET_DETAIL_FAILED', message: 'Ticket could not be loaded.' } })
  })
})
