import type { Observation, Signal } from '../../shared/domain/Observation.ts'

export interface SignalCounts {
  positive: number
  negative: number
  uncertain: number
}

export function countSignal(observations: Observation[], signal: Signal): SignalCounts {
  const counts: SignalCounts = { positive: 0, negative: 0, uncertain: 0 }
  for (const observation of observations) incrementCount(counts, signal.read(observation))
  return counts
}

function incrementCount(counts: SignalCounts, status: ReturnType<Signal['read']>): void {
  if (status === 'POSITIVE') counts.positive += 1
  else if (status === 'NEGATIVE') counts.negative += 1
  else counts.uncertain += 1
}

/** Positive ÷ (positive + negative) × 100. Uncertain observations are excluded from the denominator. */
export function publicRate(counts: SignalCounts): number | null {
  return percentage(counts.positive, counts.positive + counts.negative)
}

export function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return (numerator / denominator) * 100
}

/** Difference between two rates, in percentage points. */
export function percentagePointChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null
  return current - previous
}

/** Added ÷ Removed. Null when nothing was removed, so the UI never shows an infinite ratio. */
export function entryExitRatio(added: number, removed: number): number | null {
  if (removed === 0) return null
  return added / removed
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
