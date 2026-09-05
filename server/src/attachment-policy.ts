import { randomUUID } from 'node:crypto'
import path from 'node:path'

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const MAX_ACTIVE_ATTACHMENTS = 5

const allowedMimeTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
}

export function validateAttachmentUpload(file: Express.Multer.File | undefined) {
  if (!file) return 'Exactly one file is required.'
  const extension = path.extname(file.originalname).toLowerCase()
  if (!allowedMimeTypes[extension] || allowedMimeTypes[extension] !== file.mimetype) {
    return 'Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.'
  }
  if (file.size > MAX_ATTACHMENT_BYTES) return 'Attachment files must be 5 MB or smaller.'
  return null
}

export function generateAttachmentStorageKey() {
  return randomUUID().replace(/-/g, '')
}

export function safeDisplayName(filename: string) {
  const baseName = path.basename(filename).replace(/[\r\n]/g, '')
  const safeName = baseName.replace(/[^a-zA-Z0-9._ -]/g, '_').trim()
  return safeName || 'attachment'
}

export function validateRemovalReason(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length >= 3 && normalized.length <= 200 ? normalized : null
}
