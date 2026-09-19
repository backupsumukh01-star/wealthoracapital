import { describe, expect, it } from 'vitest'

import {
  HISTORICAL_IMPORT_MAX_ROWS,
  SAMPLE_ORDER_IDS,
  buildTemplateCsv,
  buildTemplateXlsx,
  buildXlsx,
  mapRows,
  parseCsv,
  parseDate,
  parseXlsx,
  validateParsedRows,
} from './historical-import-parse.js'

describe('historical import parser', () => {
  it('builds CSV and XLSX templates with sample order ids that are skipped', () => {
    const csv = buildTemplateCsv()
    expect(csv).toContain('WX-DEP-20260115-001')
    expect(csv).toContain('WX-WD-20260210-001')
    expect(csv).toContain('SAMPLE/DEMO')
    const parsed = mapRows(parseCsv(csv))
    const { valid, invalid } = validateParsedRows(parsed)
    expect(invalid).toEqual([])
    expect(valid.every((row) => SAMPLE_ORDER_IDS.includes(row.orderId as never))).toBe(true)
    expect(valid.every((row) => row.outcome === 'SKIPPED')).toBe(true)

    const xlsx = parseXlsx(buildTemplateXlsx())
    expect(xlsx.some((row) => row.includes('WX-PROFIT-20260228-001'))).toBe(true)
  })

  it('rejects formulas, invalid dates, invalid amounts, and duplicate order ids', () => {
    const table = parseCsv(
      [
        'Date,Transaction Type,Amount,Currency,Status,Order ID,Notes',
        'not-a-date,DEPOSIT,1000,USD,APPROVED,DEP-A1,x',
        '2026-01-15,DEPOSIT,=1000,USD,APPROVED,DEP-A2,x',
        '2026-01-15,DEPOSIT,0,USD,APPROVED,DEP-A3,x',
        '2026-01-15,LOAN,10,USD,APPROVED,DEP-A4,x',
        '2026-01-15,DEPOSIT,10,USD,APPROVED,DEP-DUP,x',
        '2026-01-16,DEPOSIT,11,USD,APPROVED,DEP-DUP,x',
      ].join('\n'),
    )
    const { invalid } = validateParsedRows(mapRows(table))
    expect(invalid.map((row) => row.reason)).toEqual(
      expect.arrayContaining([
        'Invalid date',
        'Spreadsheet formulas are not allowed',
        'Invalid amount',
        'Unsupported transaction type',
        'Duplicate Order ID (also row 6)',
      ]),
    )
  })

  it('ignores a User ID column and credits referral commission not referred volume', () => {
    const table = parseCsv(
      [
        'Date,Type,Amount,Currency,Status,Order ID,Referral Commission,User ID',
        '2026-03-05,REFERRAL,1000,USD,CREDITED,REF-OK-0001,50,aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      ].join('\n'),
    )
    const parsed = mapRows(table)
    expect(parsed[0]?.ignoredUserIdRaw).toContain('aaaaaaaa')
    const { valid, invalid } = validateParsedRows(parsed)
    expect(invalid).toEqual([])
    expect(valid[0]?.amount).toBe('50')
    expect(valid[0]?.outcome).toBe('READY')
  })

  it('rejects missing required columns and malformed xlsx without crashing', () => {
    expect(() => mapRows(parseCsv('Hello,World\n1,2'))).toThrow(/Required columns/)
    expect(() => parseXlsx(Buffer.from('PK garbage'))).toThrow(/Malformed XLSX/)
    const roundTrip = parseXlsx(
      buildXlsx([
        ['Date', 'Transaction Type', 'Amount', 'Order ID'],
        ['2026-01-15', 'DEPOSIT', '1000', 'DEP-XLSX-0001'],
      ]),
    )
    const { valid } = validateParsedRows(mapRows(roundTrip))
    expect(valid[0]?.orderId).toBe('DEP-XLSX-0001')

    const namespaced = parseXlsx(
      buildXlsx(
        [
          ['Date', 'Transaction Type', 'Amount', 'Order ID'],
          ['2026-02-01', 'PROFIT', '12.5', 'PRF-NS-0001'],
        ],
        { xmlPrefix: 'x' },
      ),
    )
    expect(namespaced[0]).toEqual(['Date', 'Transaction Type', 'Amount', 'Order ID'])
    const nsParsed = validateParsedRows(mapRows(namespaced))
    expect(nsParsed.invalid).toEqual([])
    expect(nsParsed.valid[0]?.orderId).toBe('PRF-NS-0001')
    expect(nsParsed.valid[0]?.amount).toBe('12.5')
  })

  it('parses 3000+ data rows and Excel serial dates', () => {
    expect(HISTORICAL_IMPORT_MAX_ROWS).toBeGreaterThanOrEqual(3000)
    const header = ['Date', 'Transaction Type', 'Amount', 'Order ID', 'Notes']
    const rows = [header]
    for (let i = 0; i < 3001; i += 1) {
      rows.push(['2026-01-15', 'DEPOSIT', '10', `DEP${String(i).padStart(5, '0')}X`, '- daily'])
    }
    const parsed = mapRows(rows)
    expect(parsed).toHaveLength(3001)
    const { valid, invalid } = validateParsedRows(parsed)
    expect(invalid).toEqual([])
    expect(valid).toHaveLength(3001)

    const serial = String(Math.round(Date.UTC(2026, 0, 15) / 86_400_000 + 25569))
    const fromSerial = parseDate(serial)
    expect(fromSerial).not.toBeNull()
    expect(fromSerial?.toISOString().slice(0, 10)).toBe('2026-01-15')
  })
})
