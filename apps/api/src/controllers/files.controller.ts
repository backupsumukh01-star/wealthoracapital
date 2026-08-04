import { createReadStream } from 'node:fs'
import path from 'node:path'

import { filesService } from '../services/files.service.js'
import { asyncHandler } from '../utils/async-handler.js'

export const filesController = {
  download: asyncHandler(async (req, res) => {
    const key = String(req.query.key ?? '')
    const expires = String(req.query.expires ?? '')
    const signature = String(req.query.signature ?? '')
    const absolute = filesService.resolveSignedFile(key, expires, signature)
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(absolute)}"`)
    createReadStream(absolute).pipe(res)
  }),
}
