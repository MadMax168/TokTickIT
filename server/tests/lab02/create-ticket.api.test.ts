import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app'
import requesterContext from '../../src/requester-context'
import prisma from '../../src/prisma'

const validInput = {
  clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
  categoryId: 1,
  relatedSystemId: 2,
  requestedPriority: 'MEDIUM',
  summary: 'A valid ticket summary',
  description: 'A valid ticket description with twenty characters.',
}

const ticketRecord = {
  id: 10,
  ticketNumber: 'TT-20260903-ABCDEF',
  clientRequestId: validInput.clientRequestId,
  ticketDate: new Date('2026-09-03T00:00:00.000Z'),
  requesterId: 7,
  categoryId: 1,
  relatedSystemId: 2,
  requestedPriority: 'MEDIUM',
  summary: validInput.summary,
  description: validInput.description,
  currentStatus: 'NEW',
  createdAt: new Date('2026-09-03T00:00:00.000Z'),
  updatedAt: new Date('2026-09-03T00:00:00.000Z'),
  requester: { id: 7, name: 'Aree Chai' },
  category: { id: 1, name: 'Account and Access' },
  relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
  attachments: [],
}

function mockActiveRequester() {
  vi.mocked(prisma.developmentRequester.findUnique).mockResolvedValue({ id: 7, active: true } as never)
}

describe('API-01: Development Requesters', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns only active requesters in ascending ID order and no active field', async () => {
    vi.mocked(prisma.developmentRequester.findMany).mockResolvedValue([
      { id: 2, name: 'Aree Chai', email: 'aree.chai@example.test' },
      { id: 4, name: 'Thanawat Arun', email: 'thanawat.arun@example.test' },
    ] as never)

    const response = await request(app).get('/api/development-requesters')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      items: [
        { id: 2, name: 'Aree Chai', email: 'aree.chai@example.test' },
        { id: 4, name: 'Thanawat Arun', email: 'thanawat.arun@example.test' },
      ],
    })
    expect(prisma.developmentRequester.findMany).toHaveBeenCalledWith({
      where: { active: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, email: true },
    })
  })

  it.each([
    [Object.assign(new Error('database unavailable'), { code: 'P1001' }), 503, 'REFERENCE_DATA_UNAVAILABLE'],
    [new Error('unexpected database failure'), 500, 'REFERENCE_DATA_FAILED'],
  ])('returns the documented safe error for reference-data failure', async (failure, status, code) => {
    vi.mocked(prisma.developmentRequester.findMany).mockRejectedValue(failure)

    const response = await request(app).get('/api/development-requesters')

    expect(response.status).toBe(status)
    expect(response.body).toEqual({ error: { code, message: expect.any(String) } })
  })
})

describe('requester-context middleware', () => {
  const contextApp = express()
  contextApp.get('/context-check', requesterContext, (_request, response) => {
    response.status(204).end()
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it.each([
    [undefined, 'REQUESTER_CONTEXT_REQUIRED'],
    ['abc', 'REQUESTER_CONTEXT_INVALID'],
    ['1.5', 'REQUESTER_CONTEXT_INVALID'],
  ])('rejects missing or malformed requester context', async (header, code) => {
    const response = await request(contextApp)
      .get('/context-check')
      .set('X-Development-Requester-Id', header ?? '')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: { code, message: expect.any(String) } })
  })

  it('rejects an unknown or inactive requester', async () => {
    vi.mocked(prisma.developmentRequester.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 2, active: false } as never)

    const unknown = await request(contextApp)
      .get('/context-check')
      .set('X-Development-Requester-Id', '99')
    const inactive = await request(contextApp)
      .get('/context-check')
      .set('X-Development-Requester-Id', '2')

    expect(unknown.status).toBe(400)
    expect(unknown.body.error.code).toBe('REQUESTER_CONTEXT_INVALID')
    expect(inactive.status).toBe(400)
    expect(inactive.body.error.code).toBe('REQUESTER_CONTEXT_INVALID')
  })

  it('allows a request with an active requester', async () => {
    vi.mocked(prisma.developmentRequester.findUnique)
      .mockResolvedValue({ id: 2, active: true } as never)

    const response = await request(contextApp)
      .get('/context-check')
      .set('X-Development-Requester-Id', '2')

    expect(response.status).toBe(204)
  })
})

describe('API-02: Create Ticket', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockActiveRequester()
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 1, active: true } as never)
    vi.mocked(prisma.relatedSystem.findUnique).mockResolvedValue({ id: 2, active: true } as never)
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.ticket.create).mockResolvedValue(ticketRecord as never)
  })

  it('creates exactly one Ticket from the requester header with generated server fields', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', '7')
      .send({ ...validInput, summary: `  ${validInput.summary}  ` })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: 10,
      ticketNumber: 'TT-20260903-ABCDEF',
      ticketDate: '2026-09-03T00:00:00.000Z',
      requester: { id: 7, name: 'Aree Chai' },
      category: { id: 1, name: 'Account and Access' },
      relatedSystem: { id: 2, name: 'Campus Wi-Fi' },
      requestedPriority: 'MEDIUM',
      summary: validInput.summary,
      description: validInput.description,
      currentStatus: 'NEW',
      createdAt: '2026-09-03T00:00:00.000Z',
      lastUpdated: '2026-09-03T00:00:00.000Z',
      attachments: [],
    })
    expect(prisma.ticket.create).toHaveBeenCalledTimes(1)
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requesterId: 7,
        summary: validInput.summary,
        currentStatus: 'NEW',
      }),
    }))
  })
})

describe('API-03: Create Ticket validation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockActiveRequester()
  })

  it.each([
    { ...validInput, requestedPriority: 'URGENT' },
    { ...validInput, summary: 'tiny' },
    { ...validInput, requesterId: 99 },
  ])('rejects invalid input without creating a Ticket', async (input) => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', '7')
      .send(input)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ error: { code: 'TICKET_INPUT_INVALID' } })
    expect(prisma.ticket.create).not.toHaveBeenCalled()
  })

  it.each([
    [undefined, 'REQUESTER_CONTEXT_REQUIRED'],
    ['unknown', 'REQUESTER_CONTEXT_INVALID'],
  ])('rejects %s requester context before reading Ticket data', async (header, code) => {
    const requestBuilder = request(app).post('/api/tickets').send(validInput)
    if (header) {
      requestBuilder.set('X-Development-Requester-Id', header)
    }

    const response = await requestBuilder

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ error: { code } })
    expect(prisma.ticket.create).not.toHaveBeenCalled()
  })

  it('returns a safe server failure when requester-context lookup fails', async () => {
    vi.mocked(prisma.developmentRequester.findUnique).mockRejectedValue(new Error('database unavailable'))

    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', '7')
      .send(validInput)

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: { code: 'TICKET_CREATE_FAILED', message: expect.any(String) },
    })
    expect(prisma.ticket.create).not.toHaveBeenCalled()
  })

  it.each([
    ['category', null, { id: 2, active: true }, 'CATEGORY_NOT_FOUND'],
    ['category', { id: 1, active: false }, { id: 2, active: true }, 'CATEGORY_NOT_FOUND'],
    ['related system', { id: 1, active: true }, null, 'RELATED_SYSTEM_NOT_FOUND'],
    ['related system', { id: 1, active: true }, { id: 2, active: false }, 'RELATED_SYSTEM_NOT_FOUND'],
  ])('returns 404 when the requested %s is absent or inactive', async (_reference, category, relatedSystem, code) => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(category as never)
    vi.mocked(prisma.relatedSystem.findUnique).mockResolvedValue(relatedSystem as never)

    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', '7')
      .send(validInput)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({ error: { code } })
    expect(prisma.ticket.create).not.toHaveBeenCalled()
  })

  it('returns the documented safe error for an unexpected create failure', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 1, active: true } as never)
    vi.mocked(prisma.relatedSystem.findUnique).mockResolvedValue({ id: 2, active: true } as never)
    vi.mocked(prisma.ticket.findUnique).mockRejectedValue(new Error('database failure'))

    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', '7')
      .send(validInput)

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: { code: 'TICKET_CREATE_FAILED', message: expect.any(String) },
    })
  })
})

describe('API-04: Create Ticket idempotency', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockActiveRequester()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(ticketRecord as never)
  })

  it('returns the existing Ticket for an equivalent normalized retry', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', '7')
      .send({ ...validInput, summary: `  ${validInput.summary}  ` })

    expect(response.status).toBe(200)
    expect(response.body.ticketNumber).toBe(ticketRecord.ticketNumber)
    expect(prisma.ticket.create).not.toHaveBeenCalled()
  })

  it('returns a conflict when the idempotency key is reused with a changed payload', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('X-Development-Requester-Id', '7')
      .send({ ...validInput, summary: 'A different valid summary' })

    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({ error: { code: 'IDEMPOTENCY_KEY_REUSED' } })
    expect(prisma.ticket.create).not.toHaveBeenCalled()
  })
})
