import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RequesterApplication from './RequesterApplication'

const requester = { id: 7, name: 'Aree Chai', email: 'aree.chai@example.test' }
const categories = [{ id: 1, name: 'Software' }]
const relatedSystems = [{ id: 2, name: 'Campus Wi-Fi' }]

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

function mockApi(createResponse: Response | Promise<Response> = response({
  id: 10,
  ticketNumber: 'TT-20260904-ABCDEF',
  ticketDate: '2026-09-04T00:00:00.000Z',
  requester: { id: 7, name: 'Aree Chai' },
  category: categories[0],
  relatedSystem: relatedSystems[0],
  requestedPriority: 'MEDIUM',
  summary: 'A valid ticket summary',
  description: 'A valid ticket description with enough characters.',
  currentStatus: 'NEW',
  createdAt: '2026-09-04T00:00:00.000Z',
  lastUpdated: '2026-09-04T00:00:00.000Z',
  attachments: [],
})) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    if (input === '/api/development-requesters') return response({ items: [requester] })
    if (input === '/api/categories') return response(categories)
    if (input === '/api/related-systems') return response(relatedSystems)
    if (input === '/api/tickets' && init?.method === 'POST') return createResponse
    return response({}, false, 404)
  })
}

async function openCreateTicket() {
  fireEvent.change(await screen.findByLabelText('Development Requester'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))
  await screen.findByRole('combobox', { name: 'Category' })
}

function fillValidTicket() {
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Related System'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Requested Priority'), { target: { value: 'MEDIUM' } })
  fireEvent.change(screen.getByLabelText('Summary'), { target: { value: '  A valid ticket summary  ' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  A valid ticket description with enough characters.  ' } })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('UI-03 through UI-05: Create Ticket', () => {
  it('loads active reference data, submits a valid ticket once, and shows generated values', async () => {
    const fetchSpy = mockApi()
    render(<RequesterApplication />)

    await openCreateTicket()
    fillValidTicket()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByText('TT-20260904-ABCDEF')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-09-04T00:00:00.000Z')).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledWith('/api/tickets', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Development-Requester-Id': '7' }),
    }))
  })

  it('shows field-level validation, focuses the first invalid field, and does not call create', async () => {
    const fetchSpy = mockApi()
    render(<RequesterApplication />)

    await openCreateTicket()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByText('Category is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toHaveFocus()
    expect(fetchSpy).not.toHaveBeenCalledWith('/api/tickets', expect.anything())
  })

  it('disables duplicate submit while pending and preserves fields after an API failure', async () => {
    let resolveCreate: ((value: Response) => void) | undefined
    const pendingCreate = new Promise<Response>((resolve) => { resolveCreate = resolve })
    const fetchSpy = mockApi(pendingCreate)
    render(<RequesterApplication />)

    await openCreateTicket()
    fillValidTicket()
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Submitting…' }))
    expect(fetchSpy.mock.calls.filter(([url]) => url === '/api/tickets')).toHaveLength(1)

    resolveCreate!(response({ error: { code: 'TICKET_CREATE_FAILED' } }, false, 500))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ticket could not be created.')
    expect(screen.getByLabelText('Summary')).toHaveValue('  A valid ticket summary  ')
  })

  it('keeps the created Ticket visible and identifies a failed attachment upload for retry', async () => {
    mockApi()
    render(<RequesterApplication />)

    await openCreateTicket()
    fillValidTicket()
    const file = new File(['example'], 'evidence.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Attachments'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    expect(await screen.findByText('TT-20260904-ABCDEF')).toBeInTheDocument()
    expect(await screen.findByText('evidence.pdf could not be uploaded.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry upload for evidence.pdf' })).toBeInTheDocument()
  })
})
