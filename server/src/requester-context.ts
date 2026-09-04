import type { NextFunction, Request, Response } from 'express'
import prisma from './prisma'

function contextError(response: Response, code: string, message: string) {
  response.status(400).json({ error: { code, message } })
}

export default async function requesterContext(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const rawRequesterId = request.header('X-Development-Requester-Id')

  if (!rawRequesterId) {
    contextError(response, 'REQUESTER_CONTEXT_REQUIRED', 'Development Requester context is required.')
    return
  }

  if (!/^\d+$/.test(rawRequesterId)) {
    contextError(response, 'REQUESTER_CONTEXT_INVALID', 'Development Requester context is invalid.')
    return
  }

  const requesterId = Number(rawRequesterId)
  if (!Number.isSafeInteger(requesterId) || requesterId < 1) {
    contextError(response, 'REQUESTER_CONTEXT_INVALID', 'Development Requester context is invalid.')
    return
  }

  try {
    const requester = await prisma.developmentRequester.findUnique({
      where: { id: requesterId },
      select: { id: true, active: true },
    })

    if (!requester || !requester.active) {
      contextError(response, 'REQUESTER_CONTEXT_INVALID', 'Development Requester context is invalid.')
      return
    }

    response.locals.developmentRequesterId = requester.id
    next()
  } catch {
    response.status(500).json({
      error: {
        code: 'TICKET_CREATE_FAILED',
        message: 'Ticket could not be created.',
      },
    })
  }
}
