import type { KycDocumentType, KycRiskLevel } from '@prisma/client'

export type RiskAssessment = {
  score: number
  level: KycRiskLevel
  factors: string[]
}

const ELEVATED_COUNTRIES = new Set(['AF', 'KP', 'IR', 'SY', 'YE', 'SS'])

export function assessKycRisk(input: {
  country: string
  documentTypes: KycDocumentType[]
  fraudFlag?: boolean
  documentQuality?: number | null
  resubmissionCount?: number
}): RiskAssessment {
  let score = 10
  const factors: string[] = []

  if (ELEVATED_COUNTRIES.has(input.country.toUpperCase())) {
    score += 35
    factors.push('elevated_country')
  }

  if (!input.documentTypes.includes('SELFIE')) {
    score += 15
    factors.push('missing_selfie')
  }

  if (input.documentQuality !== null && input.documentQuality !== undefined && input.documentQuality < 50) {
    score += 20
    factors.push('low_document_quality')
  }

  if ((input.resubmissionCount ?? 0) >= 2) {
    score += 15
    factors.push('multiple_resubmissions')
  }

  if (input.fraudFlag) {
    score += 40
    factors.push('fraud_flag')
  }

  score = Math.min(100, score)

  let level: KycRiskLevel = 'LOW'
  if (score >= 80) level = 'CRITICAL'
  else if (score >= 60) level = 'HIGH'
  else if (score >= 35) level = 'MEDIUM'

  return { score, level, factors }
}
