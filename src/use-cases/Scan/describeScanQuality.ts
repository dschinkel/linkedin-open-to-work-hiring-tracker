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
        { label: 'Screenshots', value: formatCount(quality.screenshotCount), help: 'How many screenshots (or PDF pages) went into this scan.' },
        { label: 'Cards detected', value: formatCount(quality.cardsDetected), help: 'Every person row read across all the screenshots, counting someone twice if they appear in two overlapping screenshots.' },
        { label: 'Unique people', value: formatCount(quality.uniquePeople), help: 'Different people in this scan, after repeats from overlapping screenshots are merged.' },
        { label: 'Duplicates removed', value: formatCount(quality.duplicateCount), help: 'Rows that were the same person seen in more than one screenshot, so they were counted once.' },
        { label: 'Classification coverage', value: formatPercent(quality.classificationCoverage), help: 'Share of people whose photo was clear enough to say whether a frame is there or not.' },
      ],
    },
    { title: 'Open-to-Work classification', rows: confidenceRows(quality.openToWork, '#OPENTOWORK') },
    { title: 'Hiring classification', rows: confidenceRows(quality.hiring, '#HIRING') },
    {
      title: 'Company extraction (Hiring people)',
      rows: [
        { label: 'People with company identified', value: formatCount(quality.companyExtraction.identified), help: 'Hiring people whose company could be read clearly from their headline.' },
        { label: 'People with low-confidence company', value: formatCount(quality.companyExtraction.lowConfidence), help: 'Hiring people whose company was read, but might be wrong. Worth a quick check.' },
        { label: 'People with company not visible', value: formatCount(quality.companyExtraction.notVisible), help: 'Hiring people whose headline doesn’t name a company.' },
      ],
    },
  ]
}

function confidenceRows(breakdown: ConfidenceBreakdown, frame: string): DefinitionRow[] {
  return [
    { label: 'High confidence', value: formatCount(breakdown.highConfidence), help: `The app is sure whether these people's photos show the ${frame} frame or not.` },
    { label: 'Low confidence', value: formatCount(breakdown.lowConfidence), help: `The app made a call on the ${frame} frame, but the photo was hard to read, so it could be wrong.` },
    { label: 'Uncertain', value: formatCount(breakdown.uncertain), help: `The photo was too small, blurry or similar in color to tell if the ${frame} frame is there. These people are left out of the percentage.` },
  ]
}
