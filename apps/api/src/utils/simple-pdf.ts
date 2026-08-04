/**
 * Minimal dependency-free PDF generator for plain-text report exports.
 * Produces a valid single/multi-page PDF (Helvetica, one text block per page)
 * without pulling in a PDF library — sufficient for tabular report dumps.
 */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

const LINES_PER_PAGE = 58
const PAGE_WIDTH = 612 // US Letter, points
const PAGE_HEIGHT = 792
const FONT_SIZE = 9
const LEFT_MARGIN = 36
const TOP_MARGIN = 750
const LINE_HEIGHT = 12

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export function buildSimplePdf(title: string, lines: string[]): Buffer {
  const pages = chunk(lines, LINES_PER_PAGE)
  if (pages.length === 0) pages.push([])

  const objects: string[] = []
  const pageObjectIds: number[] = []
  let nextId = 1

  const fontId = nextId++
  objects[fontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`

  const contentIds: number[] = []
  for (const pageLines of pages) {
    const contentId = nextId++
    let stream = `BT /F1 ${FONT_SIZE} Tf ${LEFT_MARGIN} ${TOP_MARGIN} Td (${escapePdfText(title)}) Tj\n`
    for (const line of pageLines) {
      stream += `0 ${-LINE_HEIGHT} Td (${escapePdfText(line.slice(0, 110))}) Tj\n`
    }
    stream += 'ET'
    const streamBytes = Buffer.byteLength(stream, 'utf-8')
    objects[contentId] = `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`
    contentIds.push(contentId)
  }

  const pagesId = nextId++
  for (const contentId of contentIds) {
    const pageId = nextId++
    objects[pageId] = `<< /Type /Page /Parent ${pagesId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R >>`
    pageObjectIds.push(pageId)
  }
  objects[pagesId] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`

  const catalogId = nextId++
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`

  const header = '%PDF-1.4\n'
  let body = ''
  const offsets: number[] = [0]
  let cursor = Buffer.byteLength(header, 'utf-8')
  for (let id = 1; id < nextId; id++) {
    offsets[id] = cursor
    const objStr = `${id} 0 obj\n${objects[id] ?? '<< >>'}\nendobj\n`
    body += objStr
    cursor += Buffer.byteLength(objStr, 'utf-8')
  }

  const xrefStart = cursor
  let xref = `xref\n0 ${nextId}\n0000000000 65535 f \n`
  for (let id = 1; id < nextId; id++) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<< /Size ${nextId} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`

  return Buffer.from(header + body + xref + trailer, 'utf-8')
}
