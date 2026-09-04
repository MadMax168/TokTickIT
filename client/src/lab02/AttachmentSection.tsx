import { useEffect, useState } from 'react'
import { uploadTicketAttachments } from './ticket-uploads'

type Attachment = { id: number; displayName: string; mimeType: string; sizeBytes: number; uploadedAt: string; removedAt: string | null; removalReason: string | null; isActive: boolean; downloadUrl: string | null }
const allowed = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf'])
const maxSize = 5 * 1024 * 1024

export default function AttachmentSection({ ticketId, requesterId }: { ticketId: number; requesterId: number }) {
  const [items, setItems] = useState<Attachment[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [removing, setRemoving] = useState<Attachment | null>(null)
  const [reason, setReason] = useState('')
  const load = async () => {
    setState('loading')
    try {
      const response = await fetch(`/api/tickets/${ticketId}/attachments`, { headers: { 'X-Development-Requester-Id': String(requesterId) } })
      if (!response.ok) throw new Error()
      setItems(await response.json() as Attachment[]); setState('ready')
    } catch { setState('error') }
  }
  useEffect(() => { void load() }, [ticketId, requesterId])
  const upload = async (files: FileList | null) => {
    const selected = Array.from(files ?? [])
    const invalid = selected.find((file) => !allowed.has(file.name.split('.').pop()?.toLowerCase() ?? '') || file.size > maxSize)
    if (invalid) { setMessage(`${invalid.name} is not an allowed attachment.`); return }
    if (items.filter((item) => item.isActive).length + selected.length > 5) { setMessage('A Ticket can have at most five active attachments.'); return }
    setMessage('Uploading attachments…')
    const results = await uploadTicketAttachments(ticketId, selected, requesterId)
    if (results.some((result) => result.error)) { setMessage('One or more attachments could not be uploaded.'); return }
    setMessage('Attachments uploaded successfully.'); await load()
  }
  const remove = async () => {
    if (!removing || reason.trim().length < 3 || reason.trim().length > 200) { setMessage('Removal reason must be 3-200 characters.'); return }
    const response = await fetch(`/api/tickets/${ticketId}/attachments/${removing.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-Development-Requester-Id': String(requesterId) }, body: JSON.stringify({ removalReason: reason.trim() }) })
    if (!response.ok) { setMessage('Attachment could not be removed.'); return }
    setRemoving(null); setReason(''); setMessage('Attachment removed.'); await load()
  }
  const download = async (item: Attachment) => {
    if (!item.downloadUrl) return
    try {
      const response = await fetch(item.downloadUrl, { headers: { 'X-Development-Requester-Id': String(requesterId) } })
      if (!response.ok) throw new Error()
      const objectUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = item.displayName
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch { setMessage(`${item.displayName} could not be downloaded.`) }
  }
  return <section aria-labelledby="attachments-heading"><h2 id="attachments-heading">Attachments</h2>
    <p>Accepted: JPG, JPEG, PNG, WEBP, or PDF. Maximum 5 MB per file; five active files per Ticket.</p>
    <label htmlFor="attachment-upload">Upload attachments</label><input id="attachment-upload" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => void upload(event.target.files)} disabled={state === 'loading'} />
    {state === 'loading' && <p role="status">Loading attachments…</p>}{state === 'error' && <p role="alert">Attachments are unavailable. <button onClick={() => void load()}>Retry</button></p>}
    {message && <p role="status">{message}</p>}
    <ul>{items.map((item) => <li key={item.id}><strong>{item.displayName}</strong> ({item.mimeType}, {item.sizeBytes} bytes) — uploaded {item.uploadedAt}
      {item.isActive ? <><button type="button" onClick={() => void download(item)} aria-label={`Download ${item.displayName}`}>Download</button><button onClick={() => setRemoving(item)} aria-label={`Remove ${item.displayName}`}>Remove</button></> : <span> Removed{item.removalReason ? `: ${item.removalReason}` : ''}. Download unavailable.</span>}</li>)}</ul>
    {removing && <div role="dialog" aria-labelledby="remove-heading"><h3 id="remove-heading">Remove {removing.displayName}?</h3><label htmlFor="removal-reason">Removal reason</label><textarea id="removal-reason" value={reason} onChange={(event) => setReason(event.target.value)} /><button onClick={() => void remove()}>Confirm removal</button><button onClick={() => setRemoving(null)}>Cancel</button></div>}
  </section>
}
