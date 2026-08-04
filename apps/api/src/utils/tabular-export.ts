import { buildSimplePdf } from './simple-pdf.js'

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function xmlEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]!)
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','))
  }
  return lines.join('\n')
}

/** SpreadsheetML — opens natively in Excel with an .xls extension, no XLSX zip library needed. */
export function toSpreadsheetXml(rows: Array<Record<string, unknown>>, sheetName = 'Report'): string {
  const headers = rows.length > 0 ? Object.keys(rows[0]!) : []
  const headerRow = `<Row>${headers.map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`).join('')}</Row>`
  const dataRows = rows
    .map(
      (row) =>
        `<Row>${headers
          .map((h) => {
            const v = row[h]
            const type = typeof v === 'number' ? 'Number' : 'String'
            return `<Cell><Data ss:Type="${type}">${xmlEscape(v)}</Data></Cell>`
          })
          .join('')}</Row>`,
    )
    .join('')
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${xmlEscape(sheetName)}">
    <Table>${headerRow}${dataRows}</Table>
  </Worksheet>
</Workbook>`
}

export function toPdf(title: string, rows: Array<Record<string, unknown>>): Buffer {
  if (rows.length === 0) return buildSimplePdf(title, ['No data for the selected range.'])
  const headers = Object.keys(rows[0]!)
  const lines = [headers.join(' | '), ...rows.map((row) => headers.map((h) => String(row[h] ?? '')).join(' | '))]
  return buildSimplePdf(title, lines)
}

export function toJson(rows: Array<Record<string, unknown>>): string {
  return JSON.stringify(rows, null, 2)
}
