import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AttachmentSection from './AttachmentSection'

const attachment = { id: 3, displayName: 'evidence.pdf', mimeType: 'application/pdf', sizeBytes: 120, uploadedAt: '2026-09-04T00:00:00.000Z', removedAt: null, removalReason: null, isActive: true, downloadUrl: '/api/tickets/10/attachments/3/download' }

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('AttachmentSection', () => {
  it('loads metadata, identifies removed files, and confirms removal with a reason', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (url === '/api/tickets/10/attachments' && !init?.method) return { ok: true, json: async () => [attachment, { ...attachment, id: 4, displayName: 'old.pdf', removedAt: '2026-09-04T01:00:00.000Z', removalReason: 'Outdated evidence', isActive: false, downloadUrl: null }] } as Response
      return { ok: true } as Response
    })
    render(<AttachmentSection ticketId={10} requesterId={7} />)
    expect(await screen.findByText('evidence.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Removed.*Outdated evidence/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download old.pdf' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove evidence.pdf' }))
    fireEvent.change(screen.getByLabelText('Removal reason'), { target: { value: '  Incorrect document  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }))
    expect(await screen.findByText('Attachment removed.')).toBeInTheDocument()
  })

  it('rejects an invalid file before upload and explains the five-file limit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => Array.from({ length: 5 }, (_, id) => ({ ...attachment, id: id + 1 })) } as Response)
    render(<AttachmentSection ticketId={10} requesterId={7} />)
    expect((await screen.findAllByText('evidence.pdf')).length).toBe(5)
    fireEvent.change(screen.getByLabelText('Upload attachments'), { target: { files: [new File(['x'], 'unsafe.exe', { type: 'application/octet-stream' })] } })
    expect(await screen.findByText('unsafe.exe is not an allowed attachment.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Upload attachments'), { target: { files: [new File(['x'], 'sixth.pdf', { type: 'application/pdf' })] } })
    expect(await screen.findByText('A Ticket can have at most five active attachments.')).toBeInTheDocument()
  })

  it('fetches an active download with the requester context before saving it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === '/api/tickets/10/attachments') return { ok: true, json: async () => [attachment] } as Response
      return { ok: true, blob: async () => new Blob(['file']) } as Response
    })
    const createObjectURL = vi.fn(() => 'blob:attachment')
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    render(<AttachmentSection ticketId={10} requesterId={7} />)
    await screen.findByText('evidence.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'Download evidence.pdf' }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/tickets/10/attachments/3/download', { headers: { 'X-Development-Requester-Id': '7' } }))
    expect(createObjectURL).toHaveBeenCalled()
  })
})
