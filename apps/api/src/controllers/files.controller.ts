import path from 'node:path'

import { filesService } from '../services/files.service.js'
import { storage } from '../services/storage/index.js'
import { asyncHandler } from '../utils/async-handler.js'

function guessMime(key: string): string {
  const ext = path.extname(key).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.pdf') return 'application/pdf'
  return 'application/octet-stream'
}

export const filesController = {
  download: asyncHandler(async (req, res) => {
    const key = String(req.query.key ?? '')
    const expires = String(req.query.expires ?? '')
    const signature = String(req.query.signature ?? '')
    const storageKey = filesService.resolveSignedFile(key, expires, signature)
    const mime = guessMime(storageKey)
    res.setHeader('Content-Type', mime)
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(storageKey)}"`)
    res.setHeader('Cache-Control', 'private, max-age=300')
    const stream = await storage.openReadStream(storageKey)
    stream.pipe(res)
  }),
}
