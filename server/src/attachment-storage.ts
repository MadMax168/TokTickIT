import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface AttachmentStorage {
  save(key: string, buffer: Buffer): Promise<void>
  read(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
}

function safeKey(key: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    throw new Error('Invalid attachment storage key.')
  }
  return key
}

export class LocalAttachmentStorage implements AttachmentStorage {
  constructor(private readonly directory = path.resolve(process.cwd(), 'storage/attachments')) {}

  private filePath(key: string) {
    return path.join(this.directory, safeKey(key))
  }

  async save(key: string, buffer: Buffer) {
    await mkdir(this.directory, { recursive: true })
    await writeFile(this.filePath(key), buffer, { flag: 'wx' })
  }

  read(key: string) {
    return readFile(this.filePath(key))
  }

  async delete(key: string) {
    try {
      await unlink(this.filePath(key))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}

export const attachmentStorage: AttachmentStorage = new LocalAttachmentStorage()
