import type { OpenToWorkSummary } from '@contracts/api'
import type { StatTileView } from '@/components/StatTile'
import { formatCount, formatPercent, formatPercentagePoints, formatRatio, formatSignedCount } from '@/shared-formatting/formatMetric'

const noPriorHint = 'Scan again another day'

/** Latest-scan Open-to-Work tiles: stock first, then flow, then flow rates. */
export function describeOpenToWorkTiles(summary: OpenToWorkSummary): StatTileView[] {
  const flowHint = summary.hasComparablePrior ? undefined : noPriorHint
  const flow = (count: number, signed: (count: number) => string) => (summary.hasComparablePrior ? signed(count) : '—')
  return [
    { label: 'Open rate', value: formatPercent(summary.rate), hint: uncertainHint(summary.uncertain) },
    { label: 'Open to Work', value: formatCount(summary.open), hint: `of ${formatCount(summary.open + summary.notOpen)} read` },
    { label: '7-day change', value: formatPercentagePoints(summary.sevenDayChangePp), hint: sevenDayHint(summary.sevenDayChangePp) },
    { label: 'Newly open', value: flow(summary.added, formatSignedCount), hint: flowHint },
    { label: 'Removed open', value: flow(-summary.removed, formatSignedCount) },
    { label: 'Net flow', value: flow(summary.net, formatSignedCount) },
    { label: 'Entry rate', value: formatPercent(summary.entryRate), hint: 'Not open → open' },
    { label: 'Removal rate', value: formatPercent(summary.removalRate), hint: 'Open → not open' },
    { label: 'Entry / exit', value: formatRatio(summary.entryExitRatio), hint: summary.removed === 0 ? 'No removals yet' : undefined },
  ]
}

function uncertainHint(uncertain: number): string | undefined {
  if (uncertain === 0) return undefined
  return `${uncertain} unclear photos not counted`
}

function sevenDayHint(change: number | null): string | undefined {
  if (change !== null) return undefined
  return 'Needs a scan from 7+ days ago'
}
