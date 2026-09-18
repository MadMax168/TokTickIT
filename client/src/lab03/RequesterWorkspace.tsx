import { useEffect, useState } from 'react'

type Props = { path: string; csrfToken: string; onNavigate: (path: string) => void }
type Ticket = { id:number; ticketNumber:string; summary:string; currentStatus:string; requestedPriority:string; lastUpdated:string }
type Detail = Ticket & { description:string; problemAppearsResolved:boolean; version:number; comments?: Array<{id:number;body:string;createdAt:string;author:{name:string}}> }

export default function RequesterWorkspace({ path, csrfToken, onNavigate }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]), [detail, setDetail] = useState<Detail|null>(null), [comment, setComment] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const load = async () => { const r = await fetch('/api/tickets', { credentials:'same-origin' }); if (!r.ok) throw new Error('Tickets could not be loaded.'); setTickets((await r.json()).items) }
  useEffect(() => { if (path === '/tickets') void load().catch(e => setError(e.message)); }, [path])
  const open = async (id:number) => { setError(''); const r = await fetch(`/api/tickets/${id}`, { credentials:'same-origin' }); if (!r.ok) { setError('Ticket could not be loaded.'); return }; const d = await r.json(); const c = await fetch(`/api/tickets/${id}/comments`); d.comments = (await c.json()).items; setDetail(d); onNavigate(`/tickets/${id}`) }
  const post = async () => { if (!detail || !comment.trim()) return; setBusy(true); setError(''); try { const r = await fetch(`/api/tickets/${detail.id}/comments`, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken,'Origin':window.location.origin}, body:JSON.stringify({body:comment}) }); const payload = await r.json(); if (!r.ok) throw new Error(payload.error?.message ?? 'Comment could not be posted.'); setDetail({...detail, comments:[...(detail.comments ?? []), payload]}); setComment('') } catch(e) { setError(e instanceof Error ? e.message : 'Comment could not be posted.') } finally { setBusy(false) } }
  if (path === '/tickets') return <section><h1>My Tickets</h1>{error && <p role="alert">{error}</p>}{tickets.length === 0 ? <p>No tickets yet.</p> : <ul>{tickets.map(t => <li key={t.id}><button onClick={() => void open(t.id)}>{t.ticketNumber}</button> — {t.summary} ({t.currentStatus})</li>)}</ul>}</section>
  if (detail) return <section><button onClick={() => { setDetail(null); onNavigate('/tickets') }}>Back to My Tickets</button><h1>{detail.ticketNumber}</h1><p>{detail.description}</p><p>Status: {detail.currentStatus} · Requested Priority: {detail.requestedPriority}</p><h2>Public Comments</h2>{(detail.comments ?? []).map(c => <article key={c.id}><strong>{c.author.name}</strong><time> {c.createdAt}</time><p>{c.body}</p></article>)}<label>Comment<textarea value={comment} maxLength={2000} onChange={e => setComment(e.target.value)} /></label><button disabled={busy || !comment.trim()} onClick={() => void post()}>Post public comment</button>{error && <p role="alert">{error}</p>}</section>
  return <section><h1>Access unavailable</h1><button onClick={() => onNavigate('/tickets')}>Return to My Tickets</button></section>
}
