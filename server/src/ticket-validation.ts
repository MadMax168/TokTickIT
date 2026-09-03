const CREATE_TICKET_FIELDS = [
  'clientRequestId',
  'categoryId',
  'relatedSystemId',
  'requestedPriority',
  'summary',
  'description',
] as const

const REQUESTED_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type CreateTicketInput = {
  clientRequestId: string
  categoryId: number
  relatedSystemId: number
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH'
  summary: string
  description: string
}

export type CreateTicketValidationResult =
  | { ok: true; value: CreateTicketInput }
  | { ok: false }

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

export function validateCreateTicketInput(input: unknown): CreateTicketValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false }
  }

  const body = input as Record<string, unknown>
  if (
    Object.keys(body).length !== CREATE_TICKET_FIELDS.length ||
    Object.keys(body).some((field) => !CREATE_TICKET_FIELDS.includes(field as (typeof CREATE_TICKET_FIELDS)[number]))
  ) {
    return { ok: false }
  }

  if (
    typeof body.clientRequestId !== 'string' ||
    !UUID_PATTERN.test(body.clientRequestId) ||
    !isPositiveInteger(body.categoryId) ||
    !isPositiveInteger(body.relatedSystemId) ||
    typeof body.requestedPriority !== 'string' ||
    !REQUESTED_PRIORITIES.has(body.requestedPriority) ||
    typeof body.summary !== 'string' ||
    typeof body.description !== 'string'
  ) {
    return { ok: false }
  }

  const summary = body.summary.trim()
  const description = body.description.trim()
  if (summary.length < 5 || summary.length > 120 || description.length < 20 || description.length > 4000) {
    return { ok: false }
  }

  return {
    ok: true,
    value: {
      clientRequestId: body.clientRequestId,
      categoryId: body.categoryId,
      relatedSystemId: body.relatedSystemId,
      requestedPriority: body.requestedPriority as CreateTicketInput['requestedPriority'],
      summary,
      description,
    },
  }
}
