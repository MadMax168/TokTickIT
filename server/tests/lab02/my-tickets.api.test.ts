import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app'
import prisma from '../../src/prisma'

const ticket = {
  id: 10, ticketNumber: 'TT-20260905-ABCDEF', ticketDate: new Date('2026-09-05T00:00:00.000Z'),
  requestedPriority: 'MEDIUM', summary: 'Network connection unavailable', currentStatus: 'NEW',
  updatedAt: new Date('2026-09-05T01:00:00.000Z'), requester: { id: 7, name: 'Aree Chai' },
  category: { id: 1, name: 'Network' }, relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
}

function activeRequester() {
  vi.mocked(prisma.developmentRequester.findUnique).mockResolvedValue({ id: 7, active: true } as never)
}

describe('My Tickets API', () => {
  beforeEach(() => { vi.resetAllMocks(); activeRequester() })

  it('returns only the selected requester tickets with deterministic query options', async () => {
    vi.mocked(prisma.ticket.count).mockResolvedValue(1)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([ticket] as never)
    const response = await request(app).get('/api/tickets?search=%20network%20&categoryId=1&relatedSystemId=2&requestedPriority=MEDIUM&currentStatus=NEW&sortBy=summary&sortDirection=asc&page=2&pageSize=20').set('X-Development-Requester-Id', '7')
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ page: 2, pageSize: 20, totalItems: 1, totalPages: 1, items: [{ id: 10, ticketNumber: ticket.ticketNumber, summary: ticket.summary }] })
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ requesterId: 7, categoryId: 1, relatedSystemId: 2, requestedPriority: 'MEDIUM', currentStatus: 'NEW', OR: expect.any(Array) }), orderBy: [{ summary: 'asc' }, { id: 'desc' }], skip: 20, take: 20 }))
  })

  it('rejects invalid query input without reading tickets', async () => {
    const response = await request(app).get('/api/tickets?page=0&requestedPriority=URGENT').set('X-Development-Requester-Id', '7')
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('TICKET_QUERY_INVALID')
    expect(prisma.ticket.findMany).not.toHaveBeenCalled()
  })

  it('uses the identical empty response shape for no owned tickets and no matches', async () => {
    vi.mocked(prisma.ticket.count).mockResolvedValue(0)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([])
    const emptyOwned = await request(app).get('/api/tickets').set('X-Development-Requester-Id', '7')
    const noMatches = await request(app).get('/api/tickets?search=missing').set('X-Development-Requester-Id', '7')
    expect(emptyOwned.body).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 })
    expect(noMatches.body).toEqual(emptyOwned.body)
  })

  it('returns a safe list failure without leaking database detail', async () => {
    vi.mocked(prisma.ticket.count).mockRejectedValue(new Error('database password leaked'))
    const response = await request(app).get('/api/tickets').set('X-Development-Requester-Id', '7')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: { code: 'TICKET_LIST_FAILED', message: 'Tickets could not be loaded.' } })
  })

  it('reports requester-context lookup outages as the documented list failure', async () => {
    vi.mocked(prisma.developmentRequester.findUnique).mockRejectedValue(new Error('database password leaked'))
    const response = await request(app).get('/api/tickets').set('X-Development-Requester-Id', '7')
    expect(response.status).toBe(500)
    expect(response.body).toEqual({ error: { code: 'TICKET_LIST_FAILED', message: 'Tickets could not be loaded.' } })
  })
})
