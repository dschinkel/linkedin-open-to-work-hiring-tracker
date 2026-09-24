import type { Observation, Signal } from '../../shared/domain/Observation.ts'
import { countSignal, publicRate } from './Rates.ts'

export interface MatchedCohort {
  matchedCount: number
  currentRate: number | null
  previousRate: number | null
}

export function matchedCohort(current: Observation[], previous: Observation[], signal: Signal): MatchedCohort {
  const classifiedBefore = classifiedByPerson(previous, signal)
  const matchedNow = current.filter((observation) => isClassified(observation, signal) && classifiedBefore.has(observation.personId))
  const matchedBefore = matchedNow.map((observation) => classifiedBefore.get(observation.personId) as Observation)
  return {
    matchedCount: matchedNow.length,
    currentRate: publicRate(countSignal(matchedNow, signal)),
    previousRate: publicRate(countSignal(matchedBefore, signal)),
  }
}

function classifiedByPerson(observations: Observation[], signal: Signal): Map<string, Observation> {
  return new Map(observations.filter((observation) => isClassified(observation, signal)).map((observation) => [observation.personId, observation]))
}

function isClassified(observation: Observation, signal: Signal): boolean {
  return signal.read(observation) !== 'UNCERTAIN'
}
