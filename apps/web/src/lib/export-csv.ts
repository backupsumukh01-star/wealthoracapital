/**
 * CSV export.
 *
 * Small exports are generated here; anything paginated beyond one page is fetched from the
 * API's export endpoint with the same query string the table is using, so the file always
 * matches the view (docs/09 §Export).
 */

export interface CsvColumn<Row> {
  header: string
  value: (row: Row) => string | number | null | undefined
}

/**
 * Escapes a cell for CSV.
 *
 * The leading apostrophe on values starting with `=`, `+`, `-` or `@` prevents CSV injection:
 * without it, a crafted field executes as a formula when the file is opened in a spreadsheet
 * (docs/14 §4).
 */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''

  const text = String(value)
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text

  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

export function toCsv<Row>(rows: Row[], columns: CsvColumn<Row>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(',')
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(','))
  return [header, ...body].join('\r\n')
}

/** Triggers a browser download. The BOM makes Excel read UTF-8 correctly. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
