import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect } from 'react'
import RequesterTicketDetail from './RequesterTicketDetail'
import { RequesterProvider, useRequesterContext } from './requester-context'

const requester = { id: 7, name: 'Aree Chai', email: 'aree.chai@example.test' }
const detail = { id: 10, ticketNumber: 'TT-20260905-ABCDEF', ticketDate: '2026-09-05T00:00:00.000Z', requester: { id: 7, name: 'Aree Chai' }, category: { id: 1, name: 'Network' }, relatedSystem: { id: 2, name: 'Campus Wi-Fi' }, requestedPriority: 'MEDIUM', summary: 'Network unavailable', description: 'Campus Wi-Fi has been unavailable for more than twenty minutes.', currentStatus: 'NEW', createdAt: '2026-09-05T00:00:00.000Z', lastUpdated: '2026-09-05T01:00:00.000Z', attachments: [] }

function DetailWithContext({ onBack }: { onBack: () => void }) {
  return <RequesterProvider><RequesterContextSetter><RequesterTicketDetail ticketId={10} onBack={onBack} /></RequesterContextSetter></RequesterProvider>
}
function RequesterContextSetter({ children }: { children: React.ReactNode }) {
  const { requester: selected, selectRequester } = useRequesterContext()
  useEffect(() => { if (!selected) selectRequester(requester) }, [selected, selectRequester])
  return selected ? <>{children}</> : null
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('UI-08: Requester Ticket Detail', () => {
  it('renders owned ticket fields as read-only and loads the reusable attachment section separately', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/tickets/10') return { ok: true, json: async () => detail } as Response
      if (url === '/api/tickets/10/attachments') return { ok: true, json: async () => [] } as Response
      return { ok: false } as Response
    })
    render(<DetailWithContext onBack={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: detail.ticketNumber })).toBeInTheDocument()
    expect(screen.getByDisplayValue(detail.description)).toHaveAttribute('readonly')
    expect(screen.getByText('Attachments')).toBeInTheDocument()
    expect(fetchSpy).toHaveBeenCalledWith('/api/tickets/10/attachments', expect.objectContaining({ headers: expect.objectContaining({ 'X-Development-Requester-Id': '7' }) }))
  })

  it('shows a generic not-found state and navigates back without ownership disclosure', async () => {
    const onBack = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response)
    render(<DetailWithContext onBack={onBack} />)
    expect(await screen.findByText('Ticket not found.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to My Tickets' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
