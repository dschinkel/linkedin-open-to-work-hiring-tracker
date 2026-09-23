import type { OpenToWorkSummary } from '@contracts/api'
import type { StatTileView } from '@/components/StatTile'
import { formatCount, formatPercent, formatPercentagePoints, formatRatio, formatSignedCount } from '@/shared-formatting/formatMetric'

const noPriorHint = 'No comparable prior observations yet.'

/** Latest-scan Open-to-Work tiles: stock first, then flow, then flow rates. */
export function describeOpenToWorkTiles(summary: OpenToWorkSummary): StatTileView[] {
  const flowHint = summary.hasComparablePrior ? undefined : noPriorHint
  return [
    { label: 'Open rate', value: formatPercent(summary.rate), hint: uncertainHint(summary.uncertain) },
    { label: 'Open to Work', value: formatCount(summary.open), hint: `of ${formatCount(summary.open + summary.notOpen)} classified` },
    { label: '7-day change', value: formatPercentagePoints(summary.sevenDayChangePp), hint: sevenDayHint(summary.sevenDayChangePp) },
    { label: 'Newly open', value: formatSignedCount(summary.added), hint: flowHint },
    { label: 'Removed open', value: formatSignedCount(-summary.removed), hint: flowHint },
    { label: 'Net flow', value: formatSignedCount(summary.net), hint: flowHint },
    { label: 'Entry rate', value: formatPercent(summary.entryRate), hint: 'Not open → open, of those seen again' },
    { label: 'Removal rate', value: formatPercent(summary.removalRate), hint: 'Open → not open, of those seen again' },
    { label: 'Entry / exit', value: formatRatio(summary.entryExitRatio), hint: summary.removed === 0 ? 'No removals to compare against' : undefined },
  ]
}

function uncertainHint(uncertain: number): string | undefined {
  if (uncertain === 0) return undefined
  return `${uncertain} uncertain excluded`
}

function sevenDayHint(change: number | null): string | undefined {
  if (change !== null) return undefined
  return 'Trend data available after additional scans.'
}
