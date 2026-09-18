import { createAuthRouter } from './auth/router'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import prisma from './prisma'
import { createSessionResolver } from './auth/router'
import { createAuthMiddleware, requireCsrf } from './auth/middleware'
import { attachmentStorage } from './attachment-storage'
import {
  generateAttachmentStorageKey,
  MAX_ACTIVE_ATTACHMENTS,
  safeDisplayName,
  validateAttachmentUpload,
  validateRemovalReason,
} from './attachment-policy'
import { createTicketNumberGenerator } from './ticket-number'
import { validateCreateTicketInput } from './ticket-validation'

const app = express()
app.use((req, res, next) => req.path.startsWith('/api/auth') ? next() : cors()(req, res, next))
app.use(express.json())
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path.startsWith('/api/auth')) { res.status(400).json({ error: { code: 'INPUT_INVALID', message: 'Invalid JSON request.' } }); return }
  next(error)
})
app.use('/api/auth', createAuthRouter(prisma, { origin: process.env.APP_ORIGIN ?? 'http://localhost:5173' }))
const appOrigin = process.env.APP_ORIGIN ?? 'http://localhost:5173'
const authenticated = createAuthMiddleware(createSessionResolver(prisma))
const requesterOnly = createAuthMiddleware(createSessionResolver(prisma), { roles: ['REQUESTER'] })
const supportOrRequester = createAuthMiddleware(createSessionResolver(prisma), { roles: ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] })

function referenceDataFailure(response: express.Response, error: unknown, resourceName: string) {
  const code = error instanceof Error && 'code' in error ? String(error.code) : undefined
  const unavailable = code === 'P1001' || code === 'ECONNREFUSED'

  response.status(unavailable ? 503 : 500).json({
    error: {
      code: unavailable ? 'REFERENCE_DATA_UNAVAILABLE' : 'REFERENCE_DATA_FAILED',
      message: unavailable
        ? `${resourceName} reference data is unavailable.`
        : `${resourceName} reference data could not be loaded.`,
    },
  })
}

app.get('/api/development-requesters', async (_request, response) => {
  response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } })
})

app.get('/api/related-systems', async (_request, response) => {
  try {
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    })

    response.status(200).json(relatedSystems)
  } catch (error) {
    referenceDataFailure(response, error, 'Related System')
  }
})

app.get('/api/categories', async (_request, response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    })

    response.status(200).json(categories)
  } catch (error) {
    referenceDataFailure(response, error, 'Category')
  }
})

type TicketDetailRecord = {
  id: number
  ticketNumber: string
  ticketDate: Date
  requesterId: number
  requestedPriority: string
  itPriority?: string
  assignedTo?: { id: number; name: string; role: string; active: boolean } | null
  problemAppearsResolved?: boolean
  version?: number
  summary: string
  description: string
  currentStatus: string
  createdAt: Date
  updatedAt: Date
  requester: { id: number; name: string }
  category: { id: number; name: string }
  relatedSystem: { id: number; name: string }
  attachments: Array<unknown>
}

function ticketDetail(ticket: TicketDetailRecord) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketDate: ticket.ticketDate.toISOString(),
    requester: ticket.requester,
    category: ticket.category,
    relatedSystem: ticket.relatedSystem,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    assignedTo: ticket.assignedTo ?? null,
    problemAppearsResolved: ticket.problemAppearsResolved ?? false,
    version: ticket.version ?? 1,
    summary: ticket.summary,
    description: ticket.description,
    currentStatus: ticket.currentStatus,
    createdAt: ticket.createdAt.toISOString(),
    lastUpdated: ticket.updatedAt.toISOString(),
    attachments: ticket.attachments,
  }
}

function ticketError(response: express.Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } })
}

const ticketDetailInclude = {
  requester: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, role: true, active: true } },
  attachments: true,
} as const

app.post('/api/tickets', requesterOnly, (request, response, next) => { if (!requireCsrf(request, response, appOrigin)) return; next() }, async (request, response) => {
  const input = validateCreateTicketInput(request.body)
  if (!input.ok) {
    response.status(400).json({
      error: {
        code: 'TICKET_INPUT_INVALID',
        message: 'Ticket input is invalid.',
        fields: [{ field: 'request', code: 'INVALID', message: 'Ticket input is invalid.' }],
      },
    })
    return
  }

  const requesterId = request.user!.id

  try {
    const existingTicket = await prisma.ticket.findUnique({
      where: { clientRequestId: input.value.clientRequestId },
      include: ticketDetailInclude,
    })

    if (existingTicket) {
      const equivalent =
        existingTicket.requesterId === requesterId &&
        existingTicket.categoryId === input.value.categoryId &&
        existingTicket.relatedSystemId === input.value.relatedSystemId &&
        existingTicket.requestedPriority === input.value.requestedPriority &&
        existingTicket.summary === input.value.summary &&
        existingTicket.description === input.value.description

      if (equivalent) {
        response.status(200).json(ticketDetail(existingTicket))
        return
      }

      ticketError(response, 409, 'IDEMPOTENCY_KEY_REUSED', 'This client request ID has already been used.')
      return
    }

    const category = await prisma.category.findUnique({
      where: { id: input.value.categoryId },
      select: { id: true, active: true },
    })
    if (!category || !category.active) {
      ticketError(response, 404, 'CATEGORY_NOT_FOUND', 'Category was not found.')
      return
    }

    const relatedSystem = await prisma.relatedSystem.findUnique({
      where: { id: input.value.relatedSystemId },
      select: { id: true, active: true },
    })
    if (!relatedSystem || !relatedSystem.active) {
      ticketError(response, 404, 'RELATED_SYSTEM_NOT_FOUND', 'Related System was not found.')
      return
    }

    const generateTicketNumber = createTicketNumberGenerator({
      exists: async (ticketNumber) =>
        (await prisma.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) !== null,
    })
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: await generateTicketNumber(new Date()),
        clientRequestId: input.value.clientRequestId,
        requesterId,
        categoryId: input.value.categoryId,
        relatedSystemId: input.value.relatedSystemId,
        requestedPriority: input.value.requestedPriority,
        itPriority: input.value.requestedPriority,
        summary: input.value.summary,
        description: input.value.description,
        currentStatus: 'NEW',
      },
      include: ticketDetailInclude,
    })

    response.status(201).json(ticketDetail(ticket))
  } catch {
    ticketError(response, 500, 'TICKET_CREATE_FAILED', 'Ticket could not be created.')
  }
})

type TicketListQuery = { search: string; categoryId?: number; relatedSystemId?: number; requestedPriority?: 'LOW' | 'MEDIUM' | 'HIGH'; currentStatus?: 'NEW'; sortBy: 'ticketDate' | 'updatedAt' | 'ticketNumber' | 'summary'; sortDirection: 'asc' | 'desc'; page: number; pageSize: 10 | 20 | 50 }

function parseTicketListQuery(query: express.Request['query']): TicketListQuery | null {
  if (Object.values(query).some((value) => Array.isArray(value))) return null
  const value = (name: string) => typeof query[name] === 'string' ? query[name] : undefined
  const positive = (raw: string | undefined) => raw !== undefined && /^\d+$/.test(raw) && Number(raw) > 0 && Number.isSafeInteger(Number(raw)) ? Number(raw) : undefined
  const search = (value('search') ?? '').trim(); const categoryId = value('categoryId') === undefined ? undefined : positive(value('categoryId')); const relatedSystemId = value('relatedSystemId') === undefined ? undefined : positive(value('relatedSystemId'))
  const page = value('page') === undefined ? 1 : positive(value('page')); const pageSize = value('pageSize') === undefined ? 10 : positive(value('pageSize'))
  const priority = value('requestedPriority'); const status = value('currentStatus'); const sortBy = value('sortBy') ?? 'ticketDate'; const sortDirection = value('sortDirection') ?? 'desc'
  if (search.length > 120 || (value('categoryId') !== undefined && categoryId === undefined) || (value('relatedSystemId') !== undefined && relatedSystemId === undefined) || page === undefined || ![10, 20, 50].includes(pageSize ?? 0) || (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH'].includes(priority)) || (status !== undefined && status !== 'NEW') || !['ticketDate', 'updatedAt', 'ticketNumber', 'summary'].includes(sortBy) || !['asc', 'desc'].includes(sortDirection)) return null
  return { search, categoryId, relatedSystemId, requestedPriority: priority as TicketListQuery['requestedPriority'], currentStatus: status as TicketListQuery['currentStatus'], sortBy: sortBy as TicketListQuery['sortBy'], sortDirection: sortDirection as TicketListQuery['sortDirection'], page, pageSize: pageSize as TicketListQuery['pageSize'] }
}

function listContextFailure(_request: express.Request, response: express.Response, next: express.NextFunction) {
  response.locals.requesterContextFailure = { code: 'TICKET_LIST_FAILED', message: 'Tickets could not be loaded.' }; next()
}

app.get('/api/tickets', listContextFailure, requesterOnly, async (request, response) => {
  const query = parseTicketListQuery(request.query)
  if (!query) { ticketError(response, 400, 'TICKET_QUERY_INVALID', 'Ticket query is invalid.'); return }
  const where = { requesterId: request.user!.id, ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }), ...(query.relatedSystemId === undefined ? {} : { relatedSystemId: query.relatedSystemId }), ...(query.requestedPriority === undefined ? {} : { requestedPriority: query.requestedPriority }), ...(query.currentStatus === undefined ? {} : { currentStatus: query.currentStatus }), ...(query.search === '' ? {} : { OR: [{ ticketNumber: { contains: query.search, mode: 'insensitive' as const } }, { summary: { contains: query.search, mode: 'insensitive' as const } }] }) }
  try {
    const [totalItems, tickets] = await Promise.all([prisma.ticket.count({ where }), prisma.ticket.findMany({ where, orderBy: [{ [query.sortBy]: query.sortDirection }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, select: { id: true, ticketNumber: true, ticketDate: true, requestedPriority: true, summary: true, currentStatus: true, updatedAt: true, requester: { select: { id: true, name: true } }, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } } } })])
    response.status(200).json({ items: tickets.map((ticket) => ({ id: ticket.id, ticketNumber: ticket.ticketNumber, ticketDate: ticket.ticketDate.toISOString(), requester: ticket.requester, category: ticket.category, relatedSystem: ticket.relatedSystem, requestedPriority: ticket.requestedPriority, summary: ticket.summary, currentStatus: ticket.currentStatus, lastUpdated: ticket.updatedAt.toISOString() })), page: query.page, pageSize: query.pageSize, totalItems, totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize) })
  } catch { ticketError(response, 500, 'TICKET_LIST_FAILED', 'Tickets could not be loaded.') }
})

type AttachmentRecord = {
  id: number
  ticketId: number
  storageKey: string
  displayName: string
  mimeType: string
  sizeBytes: number
  uploadedAt: Date
  removedAt: Date | null
  removalReason: string | null
}

function attachmentMetadata(attachment: AttachmentRecord) {
  const isActive = attachment.removedAt === null
  return {
    id: attachment.id,
    displayName: attachment.displayName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploadedAt: attachment.uploadedAt.toISOString(),
    removedAt: attachment.removedAt?.toISOString() ?? null,
    removalReason: attachment.removalReason,
    isActive,
    downloadUrl: isActive ? `/api/tickets/${attachment.ticketId}/attachments/${attachment.id}/download` : null,
  }
}

function attachmentError(response: express.Response, status: number, code: string, message: string) {
  response.status(status).json({ error: { code, message } })
}

function attachmentContextFailure(code: string, message: string): express.RequestHandler {
  return (_request, response, next) => {
    response.locals.requesterContextFailure = { code, message }
    next()
  }
}

function positiveId(value: string | string[] | undefined) {
  return typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0
    ? Number(value)
    : null
}

async function ownedTicket(ticketId: string | string[] | undefined, requesterId: number) {
  const id = positiveId(ticketId)
  if (!id) return null
  return prisma.ticket.findFirst({ where: { id, requesterId }, select: { id: true } })
}

app.get('/api/tickets/:ticketId', attachmentContextFailure('TICKET_DETAIL_FAILED', 'Ticket could not be loaded.'), supportOrRequester, async (request, response) => {
  const ticketId = positiveId(request.params.ticketId)
  if (!ticketId) {
    ticketError(response, 400, 'TICKET_ID_INVALID', 'Ticket ID is invalid.')
    return
  }
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, ...(request.user!.role === 'REQUESTER' ? { requesterId: request.user!.id } : {}) },
      select: {
        id: true, ticketNumber: true, ticketDate: true, requestedPriority: true, itPriority: true, problemAppearsResolved: true, version: true, summary: true, description: true, currentStatus: true, createdAt: true, updatedAt: true,
        requester: { select: { id: true, name: true } }, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } },
        attachments: { select: { id: true, ticketId: true, storageKey: true, displayName: true, mimeType: true, sizeBytes: true, uploadedAt: true, removedAt: true, removalReason: true } },
      },
    })
    if (!ticket) {
      ticketError(response, 404, 'TICKET_NOT_FOUND', 'Ticket was not found.')
      return
    }
    response.status(200).json({
      id: ticket.id, ticketNumber: ticket.ticketNumber, ticketDate: ticket.ticketDate.toISOString(), requester: ticket.requester, category: ticket.category, relatedSystem: ticket.relatedSystem,
      requestedPriority: ticket.requestedPriority, itPriority: ticket.itPriority, problemAppearsResolved: ticket.problemAppearsResolved, version: ticket.version, summary: ticket.summary, description: ticket.description, currentStatus: ticket.currentStatus,
      createdAt: ticket.createdAt.toISOString(), lastUpdated: ticket.updatedAt.toISOString(), attachments: ticket.attachments.map(attachmentMetadata),
    })
  } catch {
    ticketError(response, 500, 'TICKET_DETAIL_FAILED', 'Ticket could not be loaded.')
  }
})

function commentProjection(comment: { id: number; body: string; createdAt: Date; author: { id: number; name: string; role: string } }) {
  return { id: comment.id, body: comment.body, createdAt: comment.createdAt.toISOString(), author: comment.author }
}
async function accessibleTicket(request: express.Request) {
  const id = positiveId(request.params.ticketId)
  if (!id) return null
  return prisma.ticket.findFirst({ where: { id, ...(request.user!.role === 'REQUESTER' ? { requesterId: request.user!.id } : {}) }, select: { id: true } })
}
app.get('/api/tickets/:ticketId/comments', supportOrRequester, async (request, response) => {
  try {
    const ticket = await accessibleTicket(request)
    if (!ticket) { ticketError(response, 404, 'TICKET_NOT_FOUND', 'Ticket was not found.'); return }
    const items = await prisma.publicComment.findMany({ where: { ticketId: ticket.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } })
    response.json({ items: items.map(commentProjection) })
  } catch { ticketError(response, 500, 'COMMENT_LIST_FAILED', 'Comments could not be loaded.') }
})
app.post('/api/tickets/:ticketId/comments', supportOrRequester, (request, response, next) => { if (!requireCsrf(request, response, appOrigin)) return; next() }, async (request, response) => {
  const body = typeof request.body?.body === 'string' ? request.body.body.trim() : ''
  if (!body || [...body].length > 2000) { ticketError(response, 400, 'COMMENT_INVALID', 'Comment must be 1–2000 characters.'); return }
  try {
    const ticket = await accessibleTicket(request)
    if (!ticket) { ticketError(response, 404, 'TICKET_NOT_FOUND', 'Ticket was not found.'); return }
    const comment = await prisma.publicComment.create({ data: { ticketId: ticket.id, authorId: request.user!.id, body }, select: { id: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } })
    response.status(201).json(commentProjection(comment))
  } catch { ticketError(response, 500, 'COMMENT_CREATE_FAILED', 'Comment could not be created.') }
})
app.patch('/api/tickets/:ticketId/resolution-indicator', requesterOnly, (request, response, next) => { if (!requireCsrf(request, response, appOrigin)) return; next() }, async (request, response) => {
  const ticketId = positiveId(request.params.ticketId)
  const value = request.body?.problemAppearsResolved
  const version = request.body?.version
  if (!ticketId || typeof value !== 'boolean' || !Number.isInteger(version) || version < 1) { ticketError(response, 400, 'INPUT_INVALID', 'Indicator input is invalid.'); return }
  try {
    const updated = await prisma.ticket.updateMany({ where: { id: ticketId, requesterId: request.user!.id, version }, data: { problemAppearsResolved: value, version: { increment: value === undefined ? 0 : 1 } } })
    if (!updated.count) { const exists = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId: request.user!.id }, select: { id: true } }); ticketError(response, exists ? 409 : 404, exists ? 'TICKET_VERSION_CONFLICT' : 'TICKET_NOT_FOUND', exists ? 'Ticket version is stale.' : 'Ticket was not found.'); return }
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: ticketDetailInclude })
    response.json(ticketDetail(ticket as unknown as TicketDetailRecord))
  } catch { ticketError(response, 500, 'INDICATOR_UPDATE_FAILED', 'Resolution indicator could not be updated.') }
})

const multipartUpload = multer({ storage: multer.memoryStorage() })
function parseAttachmentUpload(request: express.Request, response: express.Response, next: express.NextFunction) {
  multipartUpload.any()(request, response, (error) => {
    if (error) {
      attachmentError(response, 400, 'ATTACHMENT_UPLOAD_INVALID', 'Attachment upload is invalid.')
      return
    }
    next()
  })
}

app.post('/api/tickets/:ticketId/attachments', attachmentContextFailure('ATTACHMENT_UPLOAD_FAILED', 'Attachment could not be uploaded.'), requesterOnly, (request, response, next) => { if (!requireCsrf(request, response, appOrigin)) return; next() }, parseAttachmentUpload, async (request, response) => {
  const requesterId = request.user!.id
  try {
    const ticket = await ownedTicket(request.params.ticketId, requesterId)
    if (!ticket) {
      attachmentError(response, 404, 'TICKET_NOT_FOUND', 'Ticket was not found.')
      return
    }

    const files = (request.files ?? []) as Express.Multer.File[]
    if (files.length !== 1 || files[0].fieldname !== 'file') {
      attachmentError(response, 400, 'ATTACHMENT_FILE_REQUIRED', 'Exactly one attachment file is required.')
      return
    }
    const invalidFile = validateAttachmentUpload(files[0])
    if (invalidFile) {
      const status = files[0].size > 5 * 1024 * 1024 ? 413 : 415
      attachmentError(response, status, status === 413 ? 'ATTACHMENT_TOO_LARGE' : 'ATTACHMENT_TYPE_NOT_ALLOWED', invalidFile)
      return
    }

    const activeAttachments = await prisma.attachment.findMany({
      where: { ticketId: ticket.id, removedAt: null },
      select: { id: true },
    })
    if (activeAttachments.length >= MAX_ACTIVE_ATTACHMENTS) {
      attachmentError(response, 409, 'ACTIVE_ATTACHMENT_LIMIT_REACHED', 'A Ticket can have at most five active attachments.')
      return
    }

    const storageKey = generateAttachmentStorageKey()
    try {
      await attachmentStorage.save(storageKey, files[0].buffer)
    } catch {
      attachmentError(response, 503, 'ATTACHMENT_STORAGE_UNAVAILABLE', 'Attachment storage is unavailable.')
      return
    }

    try {
      const attachment = await prisma.attachment.create({
        data: {
          ticketId: ticket.id,
          storageKey,
          displayName: safeDisplayName(files[0].originalname),
          mimeType: files[0].mimetype,
          sizeBytes: files[0].size,
        },
      })
      response.status(201).json(attachmentMetadata(attachment))
    } catch {
      await attachmentStorage.delete(storageKey).catch(() => undefined)
      attachmentError(response, 500, 'ATTACHMENT_UPLOAD_FAILED', 'Attachment could not be uploaded.')
    }
  } catch {
    attachmentError(response, 500, 'ATTACHMENT_UPLOAD_FAILED', 'Attachment could not be uploaded.')
  }
})

app.get('/api/tickets/:ticketId/attachments', attachmentContextFailure('ATTACHMENT_METADATA_FAILED', 'Attachment metadata could not be loaded.'), supportOrRequester, async (request, response) => {
  const requesterId = request.user!.id
  try {
    const ticket = request.user!.role === 'REQUESTER' ? await ownedTicket(request.params.ticketId, requesterId) : await prisma.ticket.findFirst({ where: { id: positiveId(request.params.ticketId) ?? -1 }, select: { id: true } })
    if (!ticket) {
      attachmentError(response, 404, 'TICKET_NOT_FOUND', 'Ticket was not found.')
      return
    }
    const attachments = await prisma.attachment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { uploadedAt: 'asc' },
    })
    const ordered = [...attachments.filter((attachment) => attachment.removedAt === null), ...attachments.filter((attachment) => attachment.removedAt !== null)]
    response.status(200).json(ordered.map(attachmentMetadata))
  } catch {
    attachmentError(response, 500, 'ATTACHMENT_METADATA_FAILED', 'Attachment metadata could not be loaded.')
  }
})

app.get('/api/tickets/:ticketId/attachments/:attachmentId/download', attachmentContextFailure('ATTACHMENT_DOWNLOAD_FAILED', 'Attachment could not be downloaded.'), supportOrRequester, async (request, response) => {
  const requesterId = request.user!.id
  try {
    const ticket = request.user!.role === 'REQUESTER' ? await ownedTicket(request.params.ticketId, requesterId) : await prisma.ticket.findFirst({ where: { id: positiveId(request.params.ticketId) ?? -1 }, select: { id: true } })
    if (!ticket) {
      attachmentError(response, 404, 'TICKET_NOT_FOUND', 'Ticket was not found.')
      return
    }
    const attachmentId = positiveId(request.params.attachmentId)
    const attachment = attachmentId
      ? await prisma.attachment.findFirst({ where: { id: attachmentId, ticketId: ticket.id } })
      : null
    if (!attachment) {
      attachmentError(response, 404, 'ATTACHMENT_NOT_FOUND', 'Attachment was not found.')
      return
    }
    if (attachment.removedAt) {
      attachmentError(response, 410, 'ATTACHMENT_REMOVED', 'Attachment has been removed.')
      return
    }
    try {
      const content = await attachmentStorage.read(attachment.storageKey)
      response.type(attachment.mimeType)
      response.setHeader('Content-Disposition', `attachment; filename="${safeDisplayName(attachment.displayName)}"`)
      response.status(200).send(content)
    } catch {
      attachmentError(response, 503, 'ATTACHMENT_STORAGE_UNAVAILABLE', 'Attachment storage is unavailable.')
    }
  } catch {
    attachmentError(response, 500, 'ATTACHMENT_DOWNLOAD_FAILED', 'Attachment could not be downloaded.')
  }
})

app.delete('/api/tickets/:ticketId/attachments/:attachmentId', attachmentContextFailure('ATTACHMENT_REMOVE_FAILED', 'Attachment could not be removed.'), requesterOnly, (request, response, next) => { if (!requireCsrf(request, response, appOrigin)) return; next() }, async (request, response) => {
  const requesterId = request.user!.id
  const removalReason = validateRemovalReason(request.body?.removalReason)
  if (!removalReason) {
    attachmentError(response, 400, 'REMOVAL_REASON_INVALID', 'Removal reason must be 3-200 characters.')
    return
  }
  try {
    const ticket = await ownedTicket(request.params.ticketId, requesterId)
    if (!ticket) {
      attachmentError(response, 404, 'TICKET_NOT_FOUND', 'Ticket was not found.')
      return
    }
    const attachmentId = positiveId(request.params.attachmentId)
    const attachment = attachmentId
      ? await prisma.attachment.findFirst({ where: { id: attachmentId, ticketId: ticket.id } })
      : null
    if (!attachment) {
      attachmentError(response, 404, 'ATTACHMENT_NOT_FOUND', 'Attachment was not found.')
      return
    }
    if (attachment.removedAt) {
      attachmentError(response, 409, 'ATTACHMENT_ALREADY_REMOVED', 'Attachment has already been removed.')
      return
    }
    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { removedAt: new Date(), removalReason },
    })
    response.status(204).end()
  } catch {
    attachmentError(response, 500, 'ATTACHMENT_REMOVE_FAILED', 'Attachment could not be removed.')
  }
})

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'TokTickIT API' })
})

export default app
