export type AttachmentUploadResult = {
  file: File
  error?: string
}

export async function uploadTicketAttachments(
  ticketId: number,
  files: File[],
  requesterId: number,
): Promise<AttachmentUploadResult[]> {
  return Promise.all(files.map(async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: { 'X-Development-Requester-Id': String(requesterId) },
        body: formData,
      })
      return response.ok ? { file } : { file, error: `${file.name} could not be uploaded.` }
    } catch {
      return { file, error: `${file.name} could not be uploaded.` }
    }
  }))
}
