import { describe, expect, it } from 'vitest'

import { createSalesmanSchema, updateSalesmanSchema, SALESMAN_CODE_REGEX } from './sales.validators.js'

describe('salesman promo code validators', () => {
  it('accepts promotional codes with or without leading S', () => {
    for (const code of ['S1', 'HARSH123', 'WEALTHORA', 'HARSH2026', 'HCAPITAL']) {
      expect(SALESMAN_CODE_REGEX.test(code)).toBe(true)
      expect(createSalesmanSchema.safeParse({ name: 'A', email: 'a@example.com', code }).success).toBe(true)
      expect(updateSalesmanSchema.safeParse({ code }).success).toBe(true)
    }
  })

  it('normalizes trim and uppercase on update', () => {
    const parsed = updateSalesmanSchema.safeParse({ code: ' harsh123 ' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.code).toBe('HARSH123')
  })

  it('rejects empty, whitespace, invalid characters, and unknown fields', () => {
    expect(updateSalesmanSchema.safeParse({ code: '' }).success).toBe(false)
    expect(updateSalesmanSchema.safeParse({ code: '   ' }).success).toBe(false)
    expect(updateSalesmanSchema.safeParse({ code: 'BAD-CODE!' }).success).toBe(false)
    expect(updateSalesmanSchema.safeParse({ code: 'OK', role: 'ADMIN' }).success).toBe(false)
    expect(updateSalesmanSchema.safeParse({}).success).toBe(false)
  })
})
