import { useEffect, useState } from 'react'
import AttachmentSection from './AttachmentSection'
import { useRequesterContext } from './requester-context'
import './requester-ticket-detail.css'

type TicketDetail = {
  id: number; ticketNumber: string; ticketDate: string; requester: { id: number; name: string }; category: { id: number; name: string }; relatedSystem: { id: number; name: string }
  requestedPriority: string; summary: string; description: string; currentStatus: string; createdAt: string; lastUpdated: string
}

export default function RequesterTicketDetail({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { requester } = useRequesterContext()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading')

  useEffect(() => {
    if (!requester) return
    let active = true
    void (async () => {
      setState('loading'); setTicket(null)
      try {
        const response = await fetch(`/api/tickets/${ticketId}`, { headers: { 'X-Development-Requester-Id': String(requester.id) } })
        if (!active) return
        if (response.status === 404) { setState('not-found'); return }
        if (!response.ok) { setState('error'); return }
        setTicket(await response.json() as TicketDetail); setState('ready')
      } catch { if (active) setState('error') }
    })()
    return () => { active = false }
  }, [ticketId, requester?.id])

  if (!requester) return null
  if (state === 'loading') return <section><p role="status">Loading Ticket…</p></section>
  if (state === 'not-found') return <section><p role="alert">Ticket not found.</p><button type="button" onClick={onBack}>Back to My Tickets</button></section>
  if (state === 'error') return <section><p role="alert">Ticket could not be loaded.</p><button type="button" onClick={onBack}>Back to My Tickets</button></section>
  if (!ticket) return null
  return <section className="requester-ticket-detail" aria-labelledby="ticket-detail-title">
    <header><h1 id="ticket-detail-title">{ticket.ticketNumber}</h1><p>Development Requester: {requester.name}</p><button type="button" onClick={onBack}>Back to My Tickets</button></header>
    <fieldset><legend>Ticket details</legend>
      <label>Ticket Date<input readOnly value={ticket.ticketDate} /></label>
      <label>Requester<input readOnly value={ticket.requester.name} /></label>
      <label>Category<input readOnly value={ticket.category.name} /></label>
      <label>Related System<input readOnly value={ticket.relatedSystem.name} /></label>
      <label>Requested Priority<input readOnly value={ticket.requestedPriority} /></label>
      <label>Current Status<input readOnly value={ticket.currentStatus} /></label>
      <label>Summary<input readOnly value={ticket.summary} /></label>
      <label>Description<textarea readOnly value={ticket.description} /></label>
    </fieldset>
    <div className="requester-ticket-detail-attachments"><AttachmentSection ticketId={ticket.id} requesterId={requester.id} /></div>
  </section>
}
