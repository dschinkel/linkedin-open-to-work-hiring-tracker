import type { DefinitionRow } from '@/components/DefinitionList'
import { scanQuality } from '@/test-support/trackerFixtures'
import { describeScanQuality, type QualitySection } from './describeScanQuality'

function rowsOf(sections: QualitySection[], title: string): Pick<DefinitionRow, 'label' | 'value'>[] {
  return (sections.find((section) => section.title === title)?.rows ?? []).map(({ label, value }) => ({ label, value }))
}

describe('scan quality', () => {
  it('reports screenshots, open-to-work, hiring, and company extraction separately', () => {
    const sections = describeScanQuality(scanQuality())

    expect(sections.map((section) => section.title)).toEqual(['Screenshots', 'Open-to-Work classification', 'Hiring classification', 'Company extraction (Hiring people)'])
  })

  it('shows how many cards were detected across the screenshots', () => {
    const sections = describeScanQuality(scanQuality({ cardsDetected: 1_241 }))

    expect(rowsOf(sections, 'Screenshots')).toContainEqual({ label: 'Cards detected', value: '1,241' })
  })

  it('shows classification coverage as a percentage', () => {
    const sections = describeScanQuality(scanQuality({ classificationCoverage: 99.5 }))

    expect(rowsOf(sections, 'Screenshots')).toContainEqual({ label: 'Classification coverage', value: '99.5%' })
  })

  it('shows coverage as not available when nothing was classified', () => {
    const sections = describeScanQuality(scanQuality({ classificationCoverage: null }))

    expect(rowsOf(sections, 'Screenshots')).toContainEqual({ label: 'Classification coverage', value: '—' })
  })

  it('breaks open-to-work classification down by confidence', () => {
    const sections = describeScanQuality(scanQuality({ openToWork: { highConfidence: 1_150, lowConfidence: 50, uncertain: 4 } }))

    expect(rowsOf(sections, 'Open-to-Work classification')).toEqual([
      { label: 'High confidence', value: '1,150' },
      { label: 'Low confidence', value: '50' },
      { label: 'Uncertain', value: '4' },
    ])
  })

  it('breaks hiring classification down by confidence', () => {
    const sections = describeScanQuality(scanQuality({ hiring: { highConfidence: 1_170, lowConfidence: 28, uncertain: 6 } }))

    expect(rowsOf(sections, 'Hiring classification')).toContainEqual({ label: 'Low confidence', value: '28' })
  })

  it('counts hiring people whose company could not be seen', () => {
    const sections = describeScanQuality(scanQuality({ companyExtraction: { identified: 31, lowConfidence: 9, notVisible: 6 } }))

    expect(rowsOf(sections, 'Company extraction (Hiring people)')).toContainEqual({ label: 'People with company not visible', value: '6' })
  })
})
