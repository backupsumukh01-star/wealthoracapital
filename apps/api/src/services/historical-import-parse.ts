import { createHash } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'

export const HISTORICAL_IMPORT_MAX_MB = 15
export const HISTORICAL_IMPORT_MAX_BYTES = HISTORICAL_IMPORT_MAX_MB * 1024 * 1024
export const HISTORICAL_IMPORT_MAX_ROWS = 10_000
export const HISTORICAL_IMPORT_REQUEST_TIMEOUT_MS = 10 * 60_000

export const SAMPLE_ORDER_IDS = [
  'WX-DEP-20260115-001',
  'WX-WD-20260210-001',
  'WX-PROFIT-20260228-001',
  'WX-REF-20260305-001',
] as const

export type HistoricalImportActivity = 'DEPOSIT' | 'WITHDRAWAL' | 'PROFIT' | 'REFERRAL'

export type ParsedHistoryRow = {
  rowNumber: number
  dateRaw: string
  typeRaw: string
  amountRaw: string
  currencyRaw: string
  statusRaw: string
  orderIdRaw: string
  referenceRaw: string
  profitRaw: string
  profitPctRaw: string
  relatedInvestmentRaw: string
  referralFromRaw: string
  referralCommissionRaw: string
  notesRaw: string
  ignoredUserIdRaw: string
}

export type ValidatedHistoryRow = {
  rowNumber: number
  activity: HistoricalImportActivity
  occurredAt: string
  amount: string
  currency: 'USD' | 'INR'
  status: string
  orderId: string
  reference: string | null
  returnPct: string | null
  relatedInvestment: string | null
  referralFrom: string | null
  notes: string | null
  outcome: 'READY' | 'SKIPPED'
  skipReason: string | null
}

export type InvalidHistoryRow = {
  rowNumber: number
  reason: string
}

const HEADER_ALIASES: Record<string, keyof ParsedHistoryRow | 'skip'> = {
  date: 'dateRaw',
  transactiontype: 'typeRaw',
  type: 'typeRaw',
  amount: 'amountRaw',
  currency: 'currencyRaw',
  status: 'statusRaw',
  orderid: 'orderIdRaw',
  orderidreference: 'orderIdRaw',
  reference: 'referenceRaw',
  profit: 'profitRaw',
  profitamount: 'profitRaw',
  profitpct: 'profitPctRaw',
  profitpercent: 'profitPctRaw',
  'profit%': 'profitPctRaw',
  relatedinvestment: 'relatedInvestmentRaw',
  investment: 'relatedInvestmentRaw',
  referraltype: 'skip',
  referralfrom: 'referralFromRaw',
  referraluser: 'referralFromRaw',
  referralcommission: 'referralCommissionRaw',
  commissionamount: 'referralCommissionRaw',
  commissionpct: 'skip',
  notes: 'notesRaw',
  note: 'notesRaw',
  userid: 'ignoredUserIdRaw',
  user: 'ignoredUserIdRaw',
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9%]+/g, '')
}

function cellText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 20000 && value < 80000) {
      // Excel serial date
      const utc = new Date(Math.round((value - 25569) * 86400 * 1000))
      return utc.toISOString()
    }
    return String(value)
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  return String(value).trim()
}

function looksLikeFormula(value: string) {
  if (!value) return false
  if (value.includes('\0')) return true
  const trimmed = value.trim()
  if (/^[=@|]/.test(trimmed)) return true
  // "+A1" / "-SUM(" are formula injection; "+1000" and "- note" are not.
  return /^[+\-][A-Za-z+(]/.test(trimmed)
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const input = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!
    const next = input[i + 1]
    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    if (ch === '\r') continue
    field += ch
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0))
}

export function mapRows(table: string[][]): ParsedHistoryRow[] {
  if (table.length === 0) throw new Error('File is empty.')
  let headerIndex = table.findIndex((row) =>
    row.some((cell) => {
      const n = normalizeHeader(cell)
      return n === 'date' || n === 'transactiontype' || n === 'type'
    }),
  )
  if (headerIndex < 0) throw new Error('Required columns Date and Transaction Type were not found.')
  const header = table[headerIndex]!.map(normalizeHeader)
  const index: Partial<Record<keyof ParsedHistoryRow, number>> = {}
  header.forEach((name, col) => {
    const mapped = HEADER_ALIASES[name]
    if (mapped && mapped !== 'skip') index[mapped] = col
  })
  if (index.dateRaw == null || index.typeRaw == null) {
    throw new Error('Required columns Date and Transaction Type were not found.')
  }
  if (index.amountRaw == null && index.profitRaw == null && index.referralCommissionRaw == null) {
    throw new Error('Required column Amount was not found.')
  }
  if (index.orderIdRaw == null) {
    throw new Error('Required column Order ID was not found.')
  }
  const parsed: ParsedHistoryRow[] = []
  for (let i = headerIndex + 1; i < table.length; i += 1) {
    const row = table[i]!
    const read = (key: keyof ParsedHistoryRow) => {
      const col = index[key]
      return col == null ? '' : cellText(row[col] ?? '')
    }
    const dateRaw = read('dateRaw')
    const typeRaw = read('typeRaw')
    const amountRaw = read('amountRaw')
    const orderIdRaw = read('orderIdRaw')
    if (!dateRaw && !typeRaw && !amountRaw && !orderIdRaw) continue
    parsed.push({
      rowNumber: i + 1,
      dateRaw,
      typeRaw,
      amountRaw,
      currencyRaw: read('currencyRaw'),
      statusRaw: read('statusRaw'),
      orderIdRaw,
      referenceRaw: read('referenceRaw'),
      profitRaw: read('profitRaw'),
      profitPctRaw: read('profitPctRaw'),
      relatedInvestmentRaw: read('relatedInvestmentRaw'),
      referralFromRaw: read('referralFromRaw'),
      referralCommissionRaw: read('referralCommissionRaw'),
      notesRaw: read('notesRaw'),
      ignoredUserIdRaw: read('ignoredUserIdRaw'),
    })
  }
  return parsed
}

export function parseDate(raw: string): Date | null {
  const value = raw.trim()
  if (!value) return null
  if (looksLikeFormula(value)) return null
  const serial = Number(value)
  if (/^\d{5}(\.\d+)?$/.test(value) && Number.isFinite(serial) && serial >= 20000 && serial < 80000) {
    const utc = new Date(Math.round((serial - 25569) * 86400 * 1000))
    if (!Number.isNaN(utc.getTime())) return utc
  }
  const iso = value.includes('T') ? value : value.replace(' ', 'T')
  const d = new Date(iso)
  if (!Number.isNaN(d.getTime())) return d
  const m = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (!m) return null
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function parseAmount(raw: string): string | null {
  const value = raw.trim().replace(/[$,]/g, '').replace(/^\+/, '')
  if (!value || looksLikeFormula(value)) return null
  if (!/^\d+(\.\d{1,8})?$/.test(value)) return null
  if (Number(value) <= 0) return null
  return value
}

export function parseOrderId(raw: string): string | null {
  const value = raw.trim().toUpperCase()
  if (!value || looksLikeFormula(value)) return null
  if (!/^[A-Z0-9][A-Z0-9._-]{3,31}$/.test(value)) return null
  return value
}

function parseType(raw: string): HistoricalImportActivity | null {
  const value = raw.trim().toUpperCase()
  if (value === 'DEPOSIT') return 'DEPOSIT'
  if (value === 'WITHDRAWAL' || value === 'WITHDRAW') return 'WITHDRAWAL'
  if (value === 'PROFIT' || value === 'DAILY_RETURN' || value === 'RETURN') return 'PROFIT'
  if (value === 'REFERRAL' || value === 'REFERRAL_BONUS') return 'REFERRAL'
  return null
}

function allowedStatus(activity: HistoricalImportActivity, raw: string) {
  const value = raw.trim().toUpperCase()
  if (!value) return activity === 'DEPOSIT' ? 'APPROVED' : activity === 'WITHDRAWAL' ? 'PAID' : 'CREDITED'
  if (activity === 'DEPOSIT') return ['APPROVED', 'CREDITED'].includes(value) ? value : null
  if (activity === 'WITHDRAWAL') return ['PAID', 'COMPLETED'].includes(value) ? value : null
  return ['CREDITED', 'POSTED', 'APPROVED'].includes(value) ? value : null
}

export function validateParsedRows(rows: ParsedHistoryRow[]): {
  valid: ValidatedHistoryRow[]
  invalid: InvalidHistoryRow[]
} {
  const valid: ValidatedHistoryRow[] = []
  const invalid: InvalidHistoryRow[] = []
  const seen = new Map<string, number>()

  for (const row of rows) {
    const type = parseType(row.typeRaw)
    if (!type) {
      invalid.push({ rowNumber: row.rowNumber, reason: 'Unsupported transaction type' })
      continue
    }
    if (looksLikeFormula(row.notesRaw) || looksLikeFormula(row.amountRaw) || looksLikeFormula(row.orderIdRaw)) {
      invalid.push({ rowNumber: row.rowNumber, reason: 'Spreadsheet formulas are not allowed' })
      continue
    }
    const occurred = parseDate(row.dateRaw)
    if (!occurred) {
      invalid.push({ rowNumber: row.rowNumber, reason: 'Invalid date' })
      continue
    }
    const amountSource =
      type === 'PROFIT' && !row.amountRaw.trim()
        ? row.profitRaw
        : type === 'REFERRAL'
          ? row.referralCommissionRaw.trim() || row.amountRaw
          : row.amountRaw
    const amount = parseAmount(amountSource)
    if (!amount) {
      invalid.push({ rowNumber: row.rowNumber, reason: 'Invalid amount' })
      continue
    }
    const currencyRaw = (row.currencyRaw.trim() || 'USD').toUpperCase()
    if (currencyRaw !== 'USD' && currencyRaw !== 'INR') {
      invalid.push({ rowNumber: row.rowNumber, reason: 'Currency must be USD or INR' })
      continue
    }
    const status = allowedStatus(type, row.statusRaw)
    if (!status) {
      invalid.push({
        rowNumber: row.rowNumber,
        reason: `Invalid status for ${type}`,
      })
      continue
    }
    const orderId = parseOrderId(row.orderIdRaw)
    if (!orderId) {
      invalid.push({ rowNumber: row.rowNumber, reason: 'Invalid or missing Order ID' })
      continue
    }
    if (SAMPLE_ORDER_IDS.includes(orderId as (typeof SAMPLE_ORDER_IDS)[number])) {
      valid.push({
        rowNumber: row.rowNumber,
        activity: type,
        occurredAt: occurred.toISOString(),
        amount,
        currency: currencyRaw,
        status,
        orderId,
        reference: row.referenceRaw.trim() || null,
        returnPct: row.profitPctRaw.trim() || null,
        relatedInvestment: row.relatedInvestmentRaw.trim() || null,
        referralFrom: row.referralFromRaw.trim() || null,
        notes: row.notesRaw.trim() || null,
        outcome: 'SKIPPED',
        skipReason: 'Reserved sample Order ID — not imported',
      })
      continue
    }
    const prev = seen.get(orderId)
    if (prev) {
      invalid.push({ rowNumber: row.rowNumber, reason: `Duplicate Order ID (also row ${prev})` })
      continue
    }
    seen.set(orderId, row.rowNumber)
    const pct = row.profitPctRaw.trim().replace(/%/g, '')
    valid.push({
      rowNumber: row.rowNumber,
      activity: type,
      occurredAt: occurred.toISOString(),
      amount,
      currency: currencyRaw,
      status,
      orderId,
      reference: row.referenceRaw.trim() || null,
      returnPct: pct && /^\d+(\.\d{1,6})?$/.test(pct) ? pct : null,
      relatedInvestment: row.relatedInvestmentRaw.trim() || null,
      referralFrom: row.referralFromRaw.trim() || null,
      notes: row.notesRaw.trim() || null,
      outcome: 'READY',
      skipReason: null,
    })
  }
  return { valid, invalid }
}

export function sha256Hex(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

const XML_NS = '(?:[A-Za-z_][\\w.-]*:)?'

function xmlOpen(tag: string) {
  return new RegExp(`<${XML_NS}${tag}\\b([^>]*)>([\\s\\S]*?)</${XML_NS}${tag}>`, 'g')
}

function findZipEocd(buffer: Buffer) {
  const min = Math.max(0, buffer.length - 65_535 - 22)
  for (let i = buffer.length - 22; i >= min; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i
  }
  return -1
}

function readZipEntries(buffer: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>()
  const eocd = findZipEocd(buffer)
  if (eocd >= 0) {
    const centralSize = buffer.readUInt32LE(eocd + 12)
    const centralOffset = buffer.readUInt32LE(eocd + 16)
    let offset = centralOffset
    const end = Math.min(buffer.length, centralOffset + centralSize)
    while (offset + 46 <= end) {
      if (buffer.readUInt32LE(offset) !== 0x02014b50) break
      const method = buffer.readUInt16LE(offset + 10)
      const compSize = buffer.readUInt32LE(offset + 20)
      const uncompSize = buffer.readUInt32LE(offset + 24)
      const nameLen = buffer.readUInt16LE(offset + 28)
      const extraLen = buffer.readUInt16LE(offset + 30)
      const commentLen = buffer.readUInt16LE(offset + 32)
      const localOff = buffer.readUInt32LE(offset + 42)
      const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLen)
      if (localOff + 30 <= buffer.length && buffer.readUInt32LE(localOff) === 0x04034b50) {
        const localNameLen = buffer.readUInt16LE(localOff + 26)
        const localExtraLen = buffer.readUInt16LE(localOff + 28)
        const dataStart = localOff + 30 + localNameLen + localExtraLen
        const data = buffer.subarray(dataStart, dataStart + compSize)
        let raw = data
        if (method === 8) {
          raw = inflateRawSync(data, { maxOutputLength: Math.max(uncompSize, 64 * 1024 * 1024) })
        } else if (method !== 0) {
          throw new Error('Unsupported XLSX compression.')
        }
        out.set(name.replace(/\\/g, '/'), Buffer.from(raw))
      }
      offset += 46 + nameLen + extraLen + commentLen
    }
  }
  if (out.size === 0) {
    let offset = 0
    while (offset + 30 <= buffer.length) {
      if (buffer.readUInt32LE(offset) !== 0x04034b50) break
      const method = buffer.readUInt16LE(offset + 8)
      const compSize = buffer.readUInt32LE(offset + 18)
      const uncompSize = buffer.readUInt32LE(offset + 22)
      const nameLen = buffer.readUInt16LE(offset + 26)
      const extraLen = buffer.readUInt16LE(offset + 28)
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen)
      const dataStart = offset + 30 + nameLen + extraLen
      const data = buffer.subarray(dataStart, dataStart + compSize)
      let raw = data
      if (method === 8) {
        raw = inflateRawSync(data, { maxOutputLength: Math.max(uncompSize, 64 * 1024 * 1024) })
      } else if (method !== 0) {
        throw new Error('Unsupported XLSX compression.')
      }
      out.set(name.replace(/\\/g, '/'), Buffer.from(raw))
      offset = dataStart + compSize
    }
  }
  if (out.size === 0) throw new Error('Malformed XLSX file.')
  return out
}

function xmlText(xml: string, tag: string) {
  const matches = [...xml.matchAll(xmlOpen(tag))]
  return matches.map((m) => decodeXml(m[2] ?? ''))
}

function decodeXml(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function colIndex(ref: string) {
  const letters = ref.replace(/\d+/g, '')
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64)
  return n - 1
}

export function parseXlsx(buffer: Buffer): string[][] {
  const files = readZipEntries(buffer)
  const sharedXml = files.get('xl/sharedStrings.xml')?.toString('utf8') ?? ''
  const shared = xmlText(sharedXml, 't')
  const sheet =
    files.get('xl/worksheets/sheet1.xml')?.toString('utf8') ??
    [...files.entries()].find(([name]) => name.startsWith('xl/worksheets/sheet'))?.[1]?.toString('utf8')
  if (!sheet) throw new Error('XLSX worksheet not found.')
  const rows: string[][] = []
  const rowTags = [...sheet.matchAll(xmlOpen('row'))]
  for (const rowTag of rowTags) {
    const cells = [...(rowTag[2] ?? '').matchAll(xmlOpen('c'))]
    const line: string[] = []
    for (const cell of cells) {
      const attrs = cell[1] ?? ''
      const inner = cell[2] ?? ''
      const ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1] ?? ''
      const idx = ref ? colIndex(ref) : line.length
      const isShared = /\bt="s"/.test(attrs)
      const v = xmlOpen('v').exec(inner)?.[2]
      const is = xmlOpen('is').exec(inner)?.[2]
      let text = ''
      if (isShared && v != null) text = shared[Number(v)] ?? ''
      else if (is) text = decodeXml(is)
      else if (v != null) text = decodeXml(v)
      else if (new RegExp(`<${XML_NS}f[\\s>/]`).test(inner)) text = '='
      while (line.length < idx) line.push('')
      line[idx] = text
    }
    rows.push(line.map((c) => c ?? ''))
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0))
}

function crc32(buf: Buffer) {
  let crc = ~0
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]!
    for (let j = 0; j < 8; j += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return ~crc >>> 0
}

function zipStore(files: Array<{ name: string; data: Buffer }>) {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const crc = crc32(file.data)
    const local = Buffer.alloc(30 + name.length)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(file.data.length, 18)
    local.writeUInt32LE(file.data.length, 22)
    local.writeUInt16LE(name.length, 26)
    name.copy(local, 30)
    const central = Buffer.alloc(46 + name.length)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(file.data.length, 20)
    central.writeUInt32LE(file.data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    name.copy(central, 46)
    locals.push(local, file.data)
    centrals.push(central)
    offset += local.length + file.data.length
  }
  const centralBlob = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralBlob.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBlob, eocd])
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildXlsx(rows: string[][], options?: { xmlPrefix?: string }): Buffer {
  const p = options?.xmlPrefix ? `${options.xmlPrefix}:` : ''
  const xmlns = options?.xmlPrefix
    ? `xmlns:${options.xmlPrefix}="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`
    : 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
  const sheetRows = rows
    .map(
      (row, r) =>
        `<${p}row r="${r + 1}">` +
        row
          .map((cell, c) => {
            const ref = `${String.fromCharCode(65 + c)}${r + 1}`
            return `<${p}c r="${ref}" t="inlineStr"><${p}is><${p}t xml:space="preserve">${xmlEscape(cell)}</${p}t></${p}is></${p}c>`
          })
          .join('') +
        `</${p}row>`,
    )
    .join('')
  const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<${p}worksheet ${xmlns}><${p}sheetData>${sheetRows}</${p}sheetData></${p}worksheet>`
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<${p}workbook ${xmlns} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><${p}sheets><${p}sheet name="Historical Data" sheetId="1" r:id="rId1"/></${p}sheets></${p}workbook>`
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
  const types = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
  return zipStore([
    { name: '[Content_Types].xml', data: Buffer.from(types) },
    { name: '_rels/.rels', data: Buffer.from(rels) },
    { name: 'xl/workbook.xml', data: Buffer.from(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheet) },
  ])
}

export const TEMPLATE_HEADERS = [
  'Date',
  'Transaction Type',
  'Amount',
  'Currency',
  'Status',
  'Order ID',
  'Reference',
  'Profit',
  'Profit %',
  'Related Investment',
  'Referral From',
  'Referral Commission',
  'Notes',
] as const

export const TEMPLATE_INSTRUCTION_ROWS: string[][] = [
  ['INSTRUCTIONS — delete these instruction rows before filling real data. Sample Order IDs below are never imported.'],
  ['Date = YYYY-MM-DD. Amount is positive. Currency = USD or INR. Do not put a User ID; records always belong to the opened admin-created user.'],
  ['Types: DEPOSIT, WITHDRAWAL, PROFIT, REFERRAL. Deposit status APPROVED. Withdrawal status PAID. Profit/Referral status CREDITED.'],
  ['Order ID maps to Deposit.reference / Withdrawal.reference (max 32 chars, A-Z 0-9 . _ -). Reference is optional provider/memo text stored on the record, not an OxaPay live payment.'],
  ['Do not call a payment gateway. Do not use spreadsheet formulas. One-level referral credits the referral wallet only — no multi-level commission is created.'],
]

export const TEMPLATE_SAMPLE_ROWS: string[][] = [
  [...TEMPLATE_HEADERS],
  [
    '2026-01-15',
    'DEPOSIT',
    '1000',
    'USD',
    'APPROVED',
    'WX-DEP-20260115-001',
    'OXA-HIST-0001',
    '',
    '',
    '',
    '',
    '',
    'SAMPLE/DEMO Historical deposit example',
  ],
  [
    '2026-02-10',
    'WITHDRAWAL',
    '250',
    'USD',
    'PAID',
    'WX-WD-20260210-001',
    'WD-HIST-0001',
    '',
    '',
    '',
    '',
    '',
    'SAMPLE/DEMO Historical withdrawal example',
  ],
  [
    '2026-02-28',
    'PROFIT',
    '75',
    'USD',
    'CREDITED',
    'WX-PROFIT-20260228-001',
    'PROFIT-HIST-0001',
    '75',
    '7.5',
    'INV-1001',
    '',
    '',
    'SAMPLE/DEMO Historical profit example',
  ],
  [
    '2026-03-05',
    'REFERRAL',
    '50',
    'USD',
    'CREDITED',
    'WX-REF-20260305-001',
    'REF-HIST-0001',
    '',
    '',
    '',
    'customer123',
    '50',
    'SAMPLE/DEMO Historical referral example',
  ],
]

export function buildTemplateCsv() {
  const rows = [...TEMPLATE_INSTRUCTION_ROWS.map((r) => [r[0] ?? '']), ...TEMPLATE_SAMPLE_ROWS]
  return rows
    .map((row) =>
      row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','),
    )
    .join('\n')
}

export function buildTemplateXlsx() {
  return buildXlsx([...TEMPLATE_INSTRUCTION_ROWS.map((r) => [r[0] ?? '']), ...TEMPLATE_SAMPLE_ROWS])
}
