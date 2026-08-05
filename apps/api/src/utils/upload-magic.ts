import { badRequest } from '../utils/errors.js'

/**
 * Client-supplied `Content-Type` / multer mimetype is not trustworthy.
 * Reject uploads whose magic bytes do not match the declared MIME.
 */
export function assertUploadMagicBytes(buffer: Buffer, mimetype: string): void {
  if (!buffer.length) {
    throw badRequest('Empty upload rejected.')
  }

  const mime = mimetype.toLowerCase().trim()

  if (mime === 'image/png') {
    if (!(buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)) {
      throw badRequest('File content does not match PNG type.')
    }
    return
  }

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    if (!(buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)) {
      throw badRequest('File content does not match JPEG type.')
    }
    return
  }

  if (mime === 'image/webp') {
    const riff = buffer.toString('ascii', 0, 4) === 'RIFF'
    const webp = buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP'
    if (!riff || !webp) {
      throw badRequest('File content does not match WEBP type.')
    }
    return
  }

  if (mime === 'application/pdf') {
    if (buffer.toString('ascii', 0, 5) !== '%PDF-') {
      throw badRequest('File content does not match PDF type.')
    }
    return
  }

  // Other allowed media types (gif, mp4, etc.) — basic GIF/mp4 checks when declared
  if (mime === 'image/gif') {
    const h = buffer.toString('ascii', 0, 6)
    if (h !== 'GIF87a' && h !== 'GIF89a') {
      throw badRequest('File content does not match GIF type.')
    }
    return
  }

  if (mime === 'video/mp4' || mime === 'video/quicktime') {
    // ISO BMFF: bytes 4..8 often 'ftyp'
    if (buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp') {
      throw badRequest('File content does not match MP4/MOV type.')
    }
    return
  }

  if (mime === 'video/webm') {
    // EBML header
    if (!(buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3)) {
      throw badRequest('File content does not match WEBM type.')
    }
    return
  }

  if (mime === 'image/svg+xml') {
    throw badRequest('SVG uploads are not allowed.')
  }

  throw badRequest(`Unsupported or unverifiable file type: ${mime}`)
}
