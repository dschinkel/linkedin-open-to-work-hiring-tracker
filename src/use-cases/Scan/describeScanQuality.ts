import type { ConfidenceBreakdown, ScanQuality } from '@contracts/api'
import type { DefinitionRow } from '@/components/DefinitionList'
import { formatCount, formatPercent } from '@/shared-formatting/formatMetric'

export interface QualitySection {
  title: string
  rows: DefinitionRow[]
}

/** Exposes classifier and extraction quality so odd chart moves can be traced to a weak batch. */
export function describeScanQuality(quality: ScanQuality): QualitySection[] {
  return [
    {
      title: 'Screenshots',
      rows: [
        { label: 'Screenshots', value: formatCount(quality.screenshotCount) },
        { label: 'Cards detected', value: formatCount(quality.cardsDetected) },
        { label: 'Unique people', value: formatCount(quality.uniquePeople) },
        { label: 'Duplicates removed', value: formatCount(quality.duplicateCount) },
        { label: 'Classification coverage', value: formatPercent(quality.classificationCoverage) },
      ],
    },
    { title: 'Open-to-Work classification', rows: confidenceRows(quality.openToWork) },
    { title: 'Hiring classification', rows: confidenceRows(quality.hiring) },
    {
      title: 'Company extraction (Hiring people)',
      rows: [
        { label: 'People with company identified', value: formatCount(quality.companyExtraction.identified) },
        { label: 'People with low-confidence company', value: formatCount(quality.companyExtraction.lowConfidence) },
        { label: 'People with company not visible', value: formatCount(quality.companyExtraction.notVisible) },
      ],
    },
  ]
}

function confidenceRows(breakdown: ConfidenceBreakdown): DefinitionRow[] {
  return [
    { label: 'High confidence', value: formatCount(breakdown.highConfidence) },
    { label: 'Low confidence', value: formatCount(breakdown.lowConfidence) },
    { label: 'Uncertain', value: formatCount(breakdown.uncertain) },
  ]
}
