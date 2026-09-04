import cors from 'cors'
import express from 'express'
import multer from 'multer'
import prisma from './prisma'
import requesterContext from './requester-context'
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
app.use(cors())
app.use(express.json())

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
  try {
    const requesters = await prisma.developmentRequester.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, email: true },
    })

    response.status(200).json({ items: requesters })
  } catch (error) {
    referenceDataFailure(response, error, 'Development Requester')
  }
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
  attachments: true,
} as const

app.post('/api/tickets', requesterContext, async (request, response) => {
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

  const requesterId = response.locals.developmentRequesterId as number

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

app.post('/api/tickets/:ticketId/attachments', attachmentContextFailure('ATTACHMENT_UPLOAD_FAILED', 'Attachment could not be uploaded.'), requesterContext, parseAttachmentUpload, async (request, response) => {
  const requesterId = response.locals.developmentRequesterId as number
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

app.get('/api/tickets/:ticketId/attachments', attachmentContextFailure('ATTACHMENT_METADATA_FAILED', 'Attachment metadata could not be loaded.'), requesterContext, async (request, response) => {
  const requesterId = response.locals.developmentRequesterId as number
  try {
    const ticket = await ownedTicket(request.params.ticketId, requesterId)
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

app.get('/api/tickets/:ticketId/attachments/:attachmentId/download', attachmentContextFailure('ATTACHMENT_DOWNLOAD_FAILED', 'Attachment could not be downloaded.'), requesterContext, async (request, response) => {
  const requesterId = response.locals.developmentRequesterId as number
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

app.delete('/api/tickets/:ticketId/attachments/:attachmentId', attachmentContextFailure('ATTACHMENT_REMOVE_FAILED', 'Attachment could not be removed.'), requesterContext, async (request, response) => {
  const requesterId = response.locals.developmentRequesterId as number
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
