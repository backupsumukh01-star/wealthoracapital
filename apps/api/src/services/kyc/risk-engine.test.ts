import { describe, expect, it } from 'vitest'

import { assessKycRisk } from './risk-engine.js'

describe('KYC risk engine', () => {
  it('scores low risk for clean passport submission with selfie', () => {
    const result = assessKycRisk({
      country: 'AE',
      documentTypes: ['PASSPORT', 'SELFIE'],
    })
    expect(result.level).toBe('LOW')
    expect(result.score).toBe(10)
    expect(result.factors).toEqual([])
  })

  it('elevates score for high-risk countries', () => {
    const result = assessKycRisk({
      country: 'IR',
      documentTypes: ['PASSPORT', 'SELFIE'],
    })
    expect(result.factors).toContain('elevated_country')
    expect(result.score).toBeGreaterThanOrEqual(45)
    expect(result.level).toBe('MEDIUM')
  })

  it('flags missing selfie', () => {
    const result = assessKycRisk({
      country: 'US',
      documentTypes: ['PASSPORT'],
    })
    expect(result.factors).toContain('missing_selfie')
  })

  it('reaches CRITICAL with fraud flag and elevated country', () => {
    const result = assessKycRisk({
      country: 'KP',
      documentTypes: ['NATIONAL_ID'],
      fraudFlag: true,
      documentQuality: 20,
      resubmissionCount: 3,
    })
    expect(result.level).toBe('CRITICAL')
    expect(result.score).toBe(100)
    expect(result.factors).toEqual(
      expect.arrayContaining([
        'elevated_country',
        'missing_selfie',
        'low_document_quality',
        'multiple_resubmissions',
        'fraud_flag',
      ]),
    )
  })

  it('is case-insensitive on country codes', () => {
    expect(assessKycRisk({ country: 'sy', documentTypes: ['SELFIE'] }).factors).toContain(
      'elevated_country',
    )
  })
})
