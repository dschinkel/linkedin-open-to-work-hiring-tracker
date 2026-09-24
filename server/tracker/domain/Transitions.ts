import type { Observation, Signal, SignalStatus } from '../../shared/domain/Observation.ts'
import { percentage } from './Rates.ts'

type KnownStatus = Exclude<SignalStatus, 'UNCERTAIN'>

export type LastKnownStatuses = Map<string, KnownStatus>

export interface TransitionTally {
  added: number
  removed: number
  stayedPositive: number
  stayedNegative: number
}

const emptyTally = (): TransitionTally => ({ added: 0, removed: 0, stayedPositive: 0, stayedNegative: 0 })

export function tallyTransitions(
  observations: Observation[],
  signal: Signal,
  lastKnown: LastKnownStatuses,
): TransitionTally {
  const tally = emptyTally()
  for (const observation of observations) {
    const current = signal.read(observation)
    const previous = lastKnown.get(observation.personId)
    if (current === 'UNCERTAIN' || previous === undefined) continue
    recordTransition(tally, previous, current)
  }
  return tally
}

function recordTransition(tally: TransitionTally, previous: KnownStatus, current: KnownStatus): void {
  if (previous === 'NEGATIVE' && current === 'POSITIVE') tally.added += 1
  else if (previous === 'POSITIVE' && current === 'NEGATIVE') tally.removed += 1
  else if (current === 'POSITIVE') tally.stayedPositive += 1
  else tally.stayedNegative += 1
}

export function rememberStatuses(observations: Observation[], signal: Signal, lastKnown: LastKnownStatuses): void {
  for (const observation of observations) {
    const status = signal.read(observation)
    if (status !== 'UNCERTAIN') lastKnown.set(observation.personId, status)
  }
}

export function hasComparablePrior(tally: TransitionTally): boolean {
  return tally.added + tally.removed + tally.stayedPositive + tally.stayedNegative > 0
}

export function netMovement(tally: TransitionTally): number {
  return tally.added - tally.removed
}

export function entryRate(tally: TransitionTally): number | null {
  return percentage(tally.added, tally.added + tally.stayedNegative)
}

export function removalRate(tally: TransitionTally): number | null {
  return percentage(tally.removed, tally.removed + tally.stayedPositive)
}
