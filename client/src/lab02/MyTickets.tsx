import { useEffect, useState } from 'react'
import { useRequesterContext } from './requester-context'
import './my-tickets.css'

type Reference = { id: number; name: string }
type Ticket = { id: number; ticketNumber: string; ticketDate: string; category: Reference; relatedSystem: Reference; requestedPriority: string; summary: string; currentStatus: string; lastUpdated: string }
type Result = { items: Ticket[]; page: number; pageSize: number; totalItems: number; totalPages: number }
type Controls = { search: string; categoryId: string; relatedSystemId: string; requestedPriority: string; currentStatus: string; sortBy: string; sortDirection: string; page: number }
const defaults: Controls = { search: '', categoryId: '', relatedSystemId: '', requestedPriority: '', currentStatus: '', sortBy: 'ticketDate', sortDirection: 'desc', page: 1 }

export default function MyTickets({ onCreateTicket, onOpenTicket }: { onCreateTicket: () => void; onOpenTicket: (ticketId: number) => void }) {
  const { requester } = useRequesterContext()
  const [controls, setControls] = useState<Controls>(defaults)
  const [result, setResult] = useState<Result | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [categories, setCategories] = useState<Reference[]>([])
  const [systems, setSystems] = useState<Reference[]>([])
  const activeQuery = Boolean(controls.search.trim() || controls.categoryId || controls.relatedSystemId || controls.requestedPriority || controls.currentStatus || controls.sortBy !== 'ticketDate' || controls.sortDirection !== 'desc')

  const load = async (next = controls) => {
    if (!requester) return
    setState('loading'); setResult(null)
    const params = new URLSearchParams({ sortBy: next.sortBy, sortDirection: next.sortDirection, page: String(next.page), pageSize: '10' })
    if (next.search.trim()) params.set('search', next.search.trim())
    ;(['categoryId', 'relatedSystemId', 'requestedPriority', 'currentStatus'] as const).forEach((key) => { if (next[key]) params.set(key, next[key]) })
    try {
      const response = await fetch(`/api/tickets?${params.toString()}`, { headers: { 'X-Development-Requester-Id': String(requester.id) } })
      if (!response.ok) throw new Error()
      setResult(await response.json() as Result); setState('ready')
    } catch { setState('error') }
  }

  useEffect(() => { void load() }, [requester?.id])
  useEffect(() => { void Promise.all([fetch('/api/categories'), fetch('/api/related-systems')]).then(async ([a, b]) => { if (a.ok && b.ok) { setCategories(await a.json() as Reference[]); setSystems(await b.json() as Reference[]) } }) }, [])
  if (!requester) return null
  const update = (field: keyof Controls, value: string | number) => setControls((current) => ({ ...current, [field]: value, ...(field !== 'page' ? { page: 1 } : {}) }))
  const apply = () => void load()
  const clear = () => { setControls(defaults); void load(defaults) }
  return <section className="my-tickets" aria-labelledby="my-tickets-title">
    <header><h1 id="my-tickets-title">My Tickets</h1></header>
    <div className="my-tickets-controls">
      <label htmlFor="search">Search</label><input id="search" value={controls.search} onChange={(event) => update('search', event.target.value)} />
      {controls.search && <button type="button" onClick={() => update('search', '')}>Clear search</button>}
      <label htmlFor="category-filter">Category</label><select id="category-filter" value={controls.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">All Categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <label htmlFor="system-filter">Related System</label><select id="system-filter" value={controls.relatedSystemId} onChange={(event) => update('relatedSystemId', event.target.value)}><option value="">All Related Systems</option>{systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <label htmlFor="priority-filter">Requested Priority</label><select id="priority-filter" value={controls.requestedPriority} onChange={(event) => update('requestedPriority', event.target.value)}><option value="">All Priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select>
      <label htmlFor="status-filter">Current Status</label><select id="status-filter" value={controls.currentStatus} onChange={(event) => update('currentStatus', event.target.value)}><option value="">All Statuses</option><option value="NEW">New</option></select>
      <label htmlFor="sort-by">Sort by</label><select id="sort-by" value={controls.sortBy} onChange={(event) => update('sortBy', event.target.value)}><option value="ticketDate">Ticket Date</option><option value="updatedAt">Last Updated</option><option value="ticketNumber">Ticket Number</option><option value="summary">Summary</option></select>
      <label htmlFor="sort-direction">Sort direction</label><select id="sort-direction" value={controls.sortDirection} onChange={(event) => update('sortDirection', event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select>
      <button type="button" onClick={apply}>Apply filters</button>{activeQuery && <button type="button" onClick={clear}>Clear filters</button>}
    </div>
    {state === 'loading' && <p role="status">Loading Tickets…</p>}
    {state === 'error' && <div role="alert">Tickets could not be loaded. <button type="button" onClick={() => void load()}>Retry</button></div>}
    {state === 'ready' && result?.items.length === 0 && (activeQuery ? <div><p>No matches for this search or filter.</p></div> : <div><p>No tickets yet.</p><button type="button" onClick={onCreateTicket}>Create Ticket</button></div>)}
    {state === 'ready' && result && result.items.length > 0 && <><table><thead><tr><th>Ticket Number</th><th>Ticket Date</th><th>Summary</th><th>Category</th><th>Requested Priority</th><th>Current Status</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{item.ticketNumber}</td><td>{item.ticketDate}</td><td>{item.summary}</td><td>{item.category.name}</td><td>{item.requestedPriority}</td><td>{item.currentStatus}</td><td>{item.lastUpdated}</td><td><button type="button" onClick={() => onOpenTicket(item.id)} aria-label={`Open Ticket ${item.ticketNumber}`}>Open Ticket</button></td></tr>)}</tbody></table></>}
    {state === 'ready' && result && <nav aria-label="Ticket pagination"><p>Page {result.page} of {result.totalPages} · {result.totalItems} tickets</p><button type="button" disabled={result.page <= 1} onClick={() => { const next = { ...controls, page: controls.page - 1 }; setControls(next); void load(next) }}>Previous page</button><button type="button" disabled={result.totalPages === 0 || result.page >= result.totalPages} onClick={() => { const next = { ...controls, page: controls.page + 1 }; setControls(next); void load(next) }}>Next page</button></nav>}
  </section>
}
