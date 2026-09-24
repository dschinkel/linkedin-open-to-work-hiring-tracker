import type { CompanyExtraction } from './Observation.ts'

export const reliableCompanyConfidence = 0.8

const explicitFieldConfidence = 0.96
const headlineConfidence = 0.9
const headlineCompanyPattern = /\s(?:at|@)\s+(.+)$/i

const unknownCompany: CompanyExtraction = {
  companyName: null,
  companyConfidence: null,
  companyExtractionMethod: 'unknown',
}

export function extractCompany(headline: string | null, explicitCompanyField: string | null): CompanyExtraction {
  if (explicitCompanyField?.trim()) return fromExplicitField(explicitCompanyField)
  return fromHeadline(headline)
}

function fromExplicitField(field: string): CompanyExtraction {
  return { companyName: field.trim(), companyConfidence: explicitFieldConfidence, companyExtractionMethod: 'ocr-explicit' }
}

function fromHeadline(headline: string | null): CompanyExtraction {
  const match = headline ? headlineCompanyPattern.exec(headline) : null
  if (!match) return unknownCompany
  return { companyName: match[1].trim(), companyConfidence: headlineConfidence, companyExtractionMethod: 'ocr-headline' }
}

export function normalizeCompanyName(companyName: string): string {
  return companyName.toLowerCase().replace(/[.,]+/g, '').replace(/\s+/g, ' ').trim()
}

export function isReliableCompany(extraction: CompanyExtraction): boolean {
  return extraction.companyName !== null && (extraction.companyConfidence ?? 0) >= reliableCompanyConfidence
}
