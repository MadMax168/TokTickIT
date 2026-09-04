import cors from 'cors'
import express from 'express'
import prisma from './prisma'
import requesterContext from './requester-context'
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

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'TokTickIT API' })
})

export default app
