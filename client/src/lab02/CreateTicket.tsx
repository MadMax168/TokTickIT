import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRequesterContext } from './requester-context'
import { uploadTicketAttachments, type AttachmentUploadResult } from './ticket-uploads'
import './create-ticket.css'

type ReferenceItem = { id: number; name: string }
type ReferenceState = 'loading' | 'ready' | 'error'
type TicketResult = { id: number; ticketNumber: string; ticketDate: string }
type FormValues = {
  categoryId: string
  relatedSystemId: string
  requestedPriority: string
  summary: string
  description: string
}

const EMPTY_VALUES: FormValues = {
  categoryId: '', relatedSystemId: '', requestedPriority: '', summary: '', description: '',
}
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf'])
const MAX_FILE_SIZE = 5 * 1024 * 1024

function createClientRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
}

function attachmentError(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) return 'Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.'
  if (file.size > MAX_FILE_SIZE) return 'Each attachment must be 5 MB or smaller.'
  return undefined
}

export default function CreateTicket({ onBack }: { onBack: () => void }) {
  const { requester } = useRequesterContext()
  const [referenceState, setReferenceState] = useState<ReferenceState>('loading')
  const [categories, setCategories] = useState<ReferenceItem[]>([])
  const [relatedSystems, setRelatedSystems] = useState<ReferenceItem[]>([])
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES)
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [attachments, setAttachments] = useState<AttachmentUploadResult[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [ticket, setTicket] = useState<TicketResult | null>(null)
  const [clientRequestId, setClientRequestId] = useState(createClientRequestId)
  const formRef = useRef<HTMLFormElement>(null)

  const loadReferences = async () => {
    setReferenceState('loading')
    setFormError('')
    try {
      const [categoryResponse, relatedSystemResponse] = await Promise.all([
        fetch('/api/categories'), fetch('/api/related-systems'),
      ])
      if (!categoryResponse.ok || !relatedSystemResponse.ok) throw new Error('Reference data unavailable')
      const [categoryItems, relatedSystemItems] = await Promise.all([
        categoryResponse.json() as Promise<ReferenceItem[]>, relatedSystemResponse.json() as Promise<ReferenceItem[]>,
      ])
      setCategories(categoryItems)
      setRelatedSystems(relatedSystemItems)
      setReferenceState('ready')
    } catch {
      setReferenceState('error')
      setFormError('Ticket reference data could not be loaded.')
    }
  }

  useEffect(() => { void loadReferences() }, [])

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {}
    const summary = values.summary.trim()
    const description = values.description.trim()
    if (!values.categoryId) nextErrors.categoryId = 'Category is required.'
    if (!values.relatedSystemId) nextErrors.relatedSystemId = 'Related System is required.'
    if (!values.requestedPriority) nextErrors.requestedPriority = 'Requested Priority is required.'
    if (summary.length < 5 || summary.length > 120) nextErrors.summary = 'Summary must be 5-120 characters.'
    if (description.length < 20 || description.length > 4000) nextErrors.description = 'Description must be 20-4000 characters.'
    setErrors(nextErrors)
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) formRef.current?.querySelector<HTMLElement>(`#${firstInvalid}`)?.focus()
    return Object.keys(nextErrors).length === 0
  }

  const uploadFiles = async (ticketId: number, files: File[]) => {
    if (!requester || files.length === 0) return
    const results = await uploadTicketAttachments(ticketId, files, requester.id)
    setAttachments((current) => current.map((attachment) => {
      const result = results.find(({ file }) => file === attachment.file)
      return result ?? attachment
    }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!requester || isSubmitting || referenceState !== 'ready' || !validate()) return

    setIsSubmitting(true)
    setFormError('')
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Development-Requester-Id': String(requester.id),
        },
        body: JSON.stringify({
          clientRequestId,
          categoryId: Number(values.categoryId),
          relatedSystemId: Number(values.relatedSystemId),
          requestedPriority: values.requestedPriority,
          summary: values.summary.trim(),
          description: values.description.trim(),
        }),
      })
      if (!response.ok) throw new Error('Ticket creation failed')
      const createdTicket = await response.json() as TicketResult
      setTicket(createdTicket)
      await uploadFiles(createdTicket.id, attachments.filter(({ error }) => !error).map(({ file }) => file))
    } catch {
      setFormError('Ticket could not be created.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onAttachmentChange = (files: FileList | null) => {
    setAttachments(Array.from(files ?? []).map((file) => ({ file, error: attachmentError(file) })))
  }

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const startNewTicket = () => {
    setTicket(null)
    setValues(EMPTY_VALUES)
    setErrors({})
    setAttachments([])
    setFormError('')
    setClientRequestId(createClientRequestId())
  }

  if (!requester) return null

  return (
    <section className="create-ticket" aria-labelledby="create-ticket-title">
      <header>
        <h1 id="create-ticket-title">Create Ticket</h1>
        <p>Development Requester: {requester.name}</p>
      </header>
      {referenceState === 'loading' && <p role="status">Loading ticket reference data…</p>}
      {formError && <p role="alert" className="create-ticket-form-error">{formError}</p>}
      {referenceState === 'error' && <button type="button" onClick={() => void loadReferences()}>Retry loading reference data</button>}

      <form ref={formRef} onSubmit={(event) => void submit(event)} noValidate>
        <div className="create-ticket-generated">
          <label>Ticket Number<input readOnly value={ticket?.ticketNumber ?? 'Generated after creation'} /></label>
          <label>Ticket Date<input readOnly value={ticket?.ticketDate ?? 'Generated after creation'} /></label>
        </div>
        <fieldset disabled={referenceState !== 'ready' || isSubmitting || Boolean(ticket)}>
          <legend>Classification</legend>
          <label htmlFor="categoryId">Category <span aria-hidden="true">*</span></label>
          <select id="categoryId" aria-label="Category" aria-describedby={errors.categoryId ? 'categoryId-error' : undefined} aria-invalid={Boolean(errors.categoryId)} required value={values.categoryId} onChange={(event) => updateValue('categoryId', event.target.value)}>
            <option value="">Select a Category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {errors.categoryId && <p id="categoryId-error" className="field-error">{errors.categoryId}</p>}
          <label htmlFor="relatedSystemId">Related System <span aria-hidden="true">*</span></label>
          <select id="relatedSystemId" aria-label="Related System" aria-describedby={errors.relatedSystemId ? 'relatedSystemId-error' : undefined} aria-invalid={Boolean(errors.relatedSystemId)} required value={values.relatedSystemId} onChange={(event) => updateValue('relatedSystemId', event.target.value)}>
            <option value="">Select a Related System</option>{relatedSystems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {errors.relatedSystemId && <p id="relatedSystemId-error" className="field-error">{errors.relatedSystemId}</p>}
          <label htmlFor="requestedPriority">Requested Priority <span aria-hidden="true">*</span></label>
          <select id="requestedPriority" aria-label="Requested Priority" aria-describedby={errors.requestedPriority ? 'requestedPriority-error' : undefined} aria-invalid={Boolean(errors.requestedPriority)} required value={values.requestedPriority} onChange={(event) => updateValue('requestedPriority', event.target.value)}>
            <option value="">Select a Requested Priority</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
          </select>
          {errors.requestedPriority && <p id="requestedPriority-error" className="field-error">{errors.requestedPriority}</p>}
          <label htmlFor="summary">Summary <span aria-hidden="true">*</span></label>
          <input id="summary" aria-label="Summary" aria-describedby={errors.summary ? 'summary-error' : undefined} aria-invalid={Boolean(errors.summary)} required value={values.summary} onChange={(event) => updateValue('summary', event.target.value)} />
          {errors.summary && <p id="summary-error" className="field-error">{errors.summary}</p>}
          <label htmlFor="description">Description <span aria-hidden="true">*</span></label>
          <textarea id="description" aria-label="Description" aria-describedby={errors.description ? 'description-error' : undefined} aria-invalid={Boolean(errors.description)} required value={values.description} onChange={(event) => updateValue('description', event.target.value)} />
          {errors.description && <p id="description-error" className="field-error">{errors.description}</p>}
          <label htmlFor="attachments">Attachments</label>
          <input id="attachments" aria-label="Attachments" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => onAttachmentChange(event.target.files)} />
          <p>Accepted: JPG, JPEG, PNG, WEBP, or PDF. Maximum 5 MB per file.</p>
          {attachments.map(({ file, error }) => (
            <div key={`${file.name}-${file.lastModified}`} className={error ? 'field-error' : undefined}>
              {error ?? `${file.name} selected.`}
            </div>
          ))}
        </fieldset>
        {ticket && <section className="create-ticket-success" role="status"><strong>{ticket.ticketNumber}</strong><p>Ticket created successfully. Upload results are shown above.</p><button type="button" onClick={startNewTicket}>Create another ticket</button></section>}
        {attachments.filter(({ error }) => error?.endsWith('could not be uploaded.')).map(({ file }) => (
          <button key={file.name} type="button" onClick={() => ticket && void uploadFiles(ticket.id, [file])}>Retry upload for {file.name}</button>
        ))}
        <div className="create-ticket-actions">
          <button type="submit" disabled={referenceState !== 'ready' || isSubmitting || Boolean(ticket)}>{isSubmitting ? 'Submitting…' : formError ? 'Retry Submit' : 'Submit'}</button>
          <button type="button" onClick={onBack}>Back to requester home</button>
        </div>
      </form>
    </section>
  )
}
