import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app'
import requesterContext from '../../src/requester-context'
import prisma from '../../src/prisma'

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
