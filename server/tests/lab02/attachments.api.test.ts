import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../../src/app'
import prisma from '../../src/prisma'

vi.mock('../../src/attachment-storage', () => ({
  attachmentStorage: {
    save: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue(Buffer.from('pdf')),
    delete: vi.fn().mockResolvedValue(undefined),
  },
}))

const activeAttachment = {
  id: 3, ticketId: 10, storageKey: 'a-safe-key', displayName: 'evidence.pdf', mimeType: 'application/pdf', sizeBytes: 7,
  uploadedAt: new Date('2026-09-04T00:00:00.000Z'), removedAt: null, removalReason: null,
}

function mockOwner() {
  vi.mocked(prisma.developmentRequester.findUnique).mockResolvedValue({ id: 7, active: true } as never)
  vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: 10, requesterId: 7 } as never)
}

describe('Attachment lifecycle API', () => {
  beforeEach(() => { vi.resetAllMocks(); mockOwner() })

  it('uploads a permitted owned file and returns safe metadata', async () => {
    vi.mocked(prisma.attachment.findMany).mockResolvedValue([])
    vi.mocked(prisma.attachment.create).mockResolvedValue(activeAttachment as never)

    const response = await request(app).post('/api/tickets/10/attachments').set('X-Development-Requester-Id', '7')
      .attach('file', Buffer.from('pdf'), { filename: 'evidence.pdf', contentType: 'application/pdf' })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ id: 3, displayName: 'evidence.pdf', isActive: true, downloadUrl: '/api/tickets/10/attachments/3/download' })
    expect(response.body.storageKey).toBeUndefined()
  })

  it('returns active and removed metadata without a removed download URL', async () => {
    vi.mocked(prisma.attachment.findMany).mockResolvedValue([activeAttachment, { ...activeAttachment, id: 4, removedAt: new Date(), removalReason: 'No longer needed' }] as never)

    const response = await request(app).get('/api/tickets/10/attachments').set('X-Development-Requester-Id', '7')

    expect(response.status).toBe(200)
    expect(response.body[0]).toMatchObject({ isActive: true, downloadUrl: '/api/tickets/10/attachments/3/download' })
    expect(response.body[1]).toMatchObject({ isActive: false, downloadUrl: null, removalReason: 'No longer needed' })
  })

  it('downloads only an active owned attachment', async () => {
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue(activeAttachment as never)

    const response = await request(app).get('/api/tickets/10/attachments/3/download').set('X-Development-Requester-Id', '7')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain('application/pdf')
  })

  it('soft-removes an owned active attachment with a valid reason', async () => {
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue(activeAttachment as never)
    vi.mocked(prisma.attachment.update).mockResolvedValue({ ...activeAttachment, removedAt: new Date(), removalReason: 'No longer needed' } as never)

    const response = await request(app).delete('/api/tickets/10/attachments/3').set('X-Development-Requester-Id', '7').send({ removalReason: '  No longer needed  ' })

    expect(response.status).toBe(204)
    expect(prisma.attachment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ removalReason: 'No longer needed' }) }))
  })

  it('rejects unsupported, oversized, and sixth active uploads without persisting them', async () => {
    vi.mocked(prisma.attachment.findMany).mockResolvedValue(Array.from({ length: 5 }, (_, id) => ({ id })) as never)
    const unsupported = await request(app).post('/api/tickets/10/attachments').set('X-Development-Requester-Id', '7')
      .attach('file', Buffer.from('x'), { filename: 'unsafe.exe', contentType: 'application/octet-stream' })
    expect(unsupported.status).toBe(415)
    const sixth = await request(app).post('/api/tickets/10/attachments').set('X-Development-Requester-Id', '7')
      .attach('file', Buffer.from('pdf'), { filename: 'sixth.pdf', contentType: 'application/pdf' })
    expect(sixth.status).toBe(409)
    expect(prisma.attachment.create).not.toHaveBeenCalled()
  })

  it('blocks removed downloads and invalid or repeated removal safely', async () => {
    vi.mocked(prisma.attachment.findFirst).mockResolvedValue({ ...activeAttachment, removedAt: new Date(), removalReason: 'Outdated' } as never)
    const download = await request(app).get('/api/tickets/10/attachments/3/download').set('X-Development-Requester-Id', '7')
    expect(download.status).toBe(410)
    const invalid = await request(app).delete('/api/tickets/10/attachments/3').set('X-Development-Requester-Id', '7').send({ removalReason: 'x' })
    expect(invalid.status).toBe(400)
    const repeat = await request(app).delete('/api/tickets/10/attachments/3').set('X-Development-Requester-Id', '7').send({ removalReason: 'Outdated' })
    expect(repeat.status).toBe(409)
  })
})
