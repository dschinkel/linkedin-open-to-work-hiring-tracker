import { extractCompany, normalizeCompanyName } from './Company.ts'

describe('company extraction', () => {
  it('uses an explicitly visible company field', () => {
    expect(extractCompany('Engineering Manager', 'Acme Corporation')).toMatchObject({ companyName: 'Acme Corporation', companyExtractionMethod: 'ocr-explicit' })
  })

  it('reads the company from a "Title at Company" headline', () => {
    expect(extractCompany('VP Engineering at Acme', null)).toMatchObject({ companyName: 'Acme', companyExtractionMethod: 'ocr-headline' })
  })

  it('never guesses a company from a vague headline', () => {
    expect(extractCompany('Building the future of payments', null)).toMatchObject({ companyName: null, companyConfidence: null })
  })
})

describe('company normalization', () => {
  it('merges case and punctuation variants of the same company', () => {
    expect(new Set(['Acme Corp.', 'Acme Corp', 'ACME Corp'].map(normalizeCompanyName)).size).toBe(1)
  })

  it('keeps distinct names apart rather than fuzzily merging them', () => {
    expect(normalizeCompanyName('Acme')).not.toBe(normalizeCompanyName('Acme Corp'))
  })
})
