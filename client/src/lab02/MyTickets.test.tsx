import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RequesterApplication from './RequesterApplication'

const requester = { id: 7, name: 'Aree Chai', email: 'aree.chai@example.test' }
const ticket = { id: 10, ticketNumber: 'TT-20260905-ABCDEF', ticketDate: '2026-09-05T00:00:00.000Z', requester: { id: 7, name: 'Aree Chai' }, category: { id: 1, name: 'Network' }, relatedSystem: { id: 2, name: 'Campus Wi-Fi' }, requestedPriority: 'MEDIUM', summary: 'Network connection unavailable', currentStatus: 'NEW', lastUpdated: '2026-09-05T01:00:00.000Z' }
const detail = { ...ticket, description: 'Campus Wi-Fi has been unavailable for more than twenty minutes.', createdAt: '2026-09-05T00:00:00.000Z', attachments: [] }
const response = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response

function mockApi(tickets = [ticket], totalItems = 1) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    if (url === '/api/development-requesters') return response({ items: [requester] })
    if (url === '/api/categories') return response([{ id: 1, name: 'Network' }])
    if (url === '/api/related-systems') return response([{ id: 2, name: 'Campus Wi-Fi' }])
    if (url === '/api/tickets/10/attachments') return response([])
    if (url === '/api/tickets/10') return response(detail)
    if (String(url).startsWith('/api/tickets')) return response({ items: tickets, page: 1, pageSize: 10, totalItems, totalPages: totalItems ? 1 : 0 })
    return response({}, false)
  })
}

async function openMyTickets() {
  fireEvent.change(await screen.findByLabelText('Development Requester'), { target: { value: '7' } })
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  fireEvent.click(screen.getByRole('button', { name: 'My Tickets' }))
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('UI-06 and UI-07: My Tickets', () => {
  it('loads tickets and sends search/filter/sort controls to the owned list API', async () => {
    const fetchSpy = mockApi()
    render(<RequesterApplication />)
    await openMyTickets()
    expect(await screen.findByText(ticket.ticketNumber)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'network' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('search=network'), expect.objectContaining({ headers: expect.objectContaining({ 'X-Development-Requester-Id': '7' }) }))
    await screen.findByText(ticket.ticketNumber)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('distinguishes empty tickets from no-results using active query controls', async () => {
    mockApi([], 0)
    render(<RequesterApplication />)
    await openMyTickets()
    expect(await screen.findByText(/no tickets yet/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'missing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))
    expect(await screen.findByText(/no matches for this search or filter/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('shows loading and safe retry state without stale ticket rows after failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/development-requesters') return response({ items: [requester] })
      if (url === '/api/categories' || url === '/api/related-systems') return response([])
      return response({}, false)
    })
    render(<RequesterApplication />)
    await openMyTickets()
    expect(await screen.findByRole('alert')).toHaveTextContent('Tickets could not be loaded.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByText(ticket.ticketNumber)).not.toBeInTheDocument()
  })

  it('opens an owned Ticket Detail screen and returns to My Tickets', async () => {
    mockApi()
    render(<RequesterApplication />)
    await openMyTickets()
    await screen.findByText(ticket.ticketNumber)
    fireEvent.click(screen.getByRole('button', { name: `Open Ticket ${ticket.ticketNumber}` }))
    expect(await screen.findByRole('heading', { name: ticket.ticketNumber })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to My Tickets' }))
    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
  })
})
