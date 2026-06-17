import { createHash } from 'crypto'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'


const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
}

interface ImageInfo {
  hash: string
  url: string
  ext: string
  size: number
  mime: string
  createdAt: string
}

const imageMetaStore = new Map<string, ImageInfo>()

async function ensureUploadsDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true })
  } catch {
    // exists
  }
}

function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg'
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png'
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif'
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp'
  }
  return null
}

export function parseDataUri(dataUri: string): { buffer: Buffer; mime: string; ext: string } | null {
  const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) return null

  const declaredMime = match[1].toLowerCase()
  const base64Data = match[2]
  const buffer = Buffer.from(base64Data, 'base64')

  if (buffer.length === 0) return null
  if (buffer.length > MAX_FILE_SIZE) return null

  const detectedMime = detectMimeFromBuffer(buffer)
  if (!detectedMime) return null

  const declaredBase = declaredMime.split('+')[0]
  if (declaredBase !== detectedMime) return null

  const ext = detectedMime.split('/')[1]
  return { buffer, mime: detectedMime, ext }
}

export async function saveImage(dataUri: string): Promise<string> {
  const parsed = parseDataUri(dataUri)
  if (!parsed) return dataUri

  const { buffer, mime, ext } = parsed
  const hash = createHash('md5').update(buffer).digest('hex')
  const filename = `${hash}.${ext}`
  const filepath = path.join(UPLOADS_DIR, filename)

  await ensureUploadsDir()

  if (!fsSync.existsSync(filepath)) {
    await fs.writeFile(filepath, buffer)
  }

  const meta: ImageInfo = {
    hash,
    url: `/api/uploads/${filename}`,
    ext,
    size: buffer.length,
    mime,
    createdAt: new Date().toISOString(),
  }
  imageMetaStore.set(hash, meta)

  return `/api/uploads/${filename}`
}

export async function getImageInfo(hash: string): Promise<ImageInfo | null> {
  if (imageMetaStore.has(hash)) {
    return imageMetaStore.get(hash)!
  }

  const files = await fs.readdir(UPLOADS_DIR).catch(() => [])
  for (const file of files) {
    const fileHash = path.parse(file).name
    if (fileHash === hash) {
      const ext = path.extname(file).slice(1)
      const filepath = path.join(UPLOADS_DIR, file)
      const stat = await fs.stat(filepath).catch(() => null)
      const info: ImageInfo = {
        hash,
        url: `/api/uploads/${file}`,
        ext,
        size: stat?.size ?? 0,
        mime: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        createdAt: stat?.birthtime?.toISOString() ?? new Date().toISOString(),
      }
      imageMetaStore.set(hash, info)
      return info
    }
  }
  return null
}

export async function deleteImage(hash: string): Promise<boolean> {
  const uploadsDir = UPLOADS_DIR
  const files = await fs.readdir(uploadsDir).catch(() => [])
  for (const file of files) {
    const fileHash = path.parse(file).name
    if (fileHash === hash) {
      await fs.unlink(path.join(uploadsDir, file))
      imageMetaStore.delete(hash)
      return true
    }
  }
  return false
}
