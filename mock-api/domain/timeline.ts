import type { HiringSummary, OpenToWorkSummary, ScanSummary } from '../../contracts/api.ts'
import { isReliableCompany, normalizeCompanyName } from './company.ts'
import { matchedCohort } from './matchedCohort.ts'
import type { NetworkIndex } from './networkIndex.ts'
import { hiringSignal, openToWorkSignal, type Observation, type Scan } from './observation.ts'
import { countSignal, entryExitRatio, percentagePointChange, publicRate } from './rates.ts'
import { addDays } from './scanDate.ts'
import {
  entryRate,
  hasComparablePrior,
  type LastKnownStatuses,
  netMovement,
  rememberStatuses,
  removalRate,
  tallyTransitions,
} from './transitions.ts'

interface TimelineState {
  lastKnownOpen: LastKnownStatuses
  lastKnownHiring: LastKnownStatuses
  previousObservations: Observation[]
  summaries: ScanSummary[]
}

/** Summarizes every scan in date order; each scan is compared with what was known before it. */
export function buildTimeline(index: NetworkIndex): ScanSummary[] {
  const state: TimelineState = {
    lastKnownOpen: new Map(),
    lastKnownHiring: new Map(),
    previousObservations: [],
    summaries: [],
  }
  for (const scan of index.scansInOrder) state.summaries.push(summarizeNextScan(scan, index, state))
  return state.summaries
}

function summarizeNextScan(scan: Scan, index: NetworkIndex, state: TimelineState): ScanSummary {
  const observations = index.observationsOf(scan.id)
  const summary: ScanSummary = {
    id: scan.id,
    scanDate: scan.scanDate,
    screenshotCount: scan.screenshots.length,
    peopleCount: observations.length,
    duplicateCount: scan.duplicateCount,
    openToWork: summarizeOpenToWork(scan, observations, state),
    hiring: summarizeHiring(observations, index, state),
  }
  rememberStatuses(observations, openToWorkSignal, state.lastKnownOpen)
  rememberStatuses(observations, hiringSignal, state.lastKnownHiring)
  state.previousObservations = observations
  return summary
}

function summarizeOpenToWork(scan: Scan, observations: Observation[], state: TimelineState): OpenToWorkSummary {
  const counts = countSignal(observations, openToWorkSignal)
  const tally = tallyTransitions(observations, openToWorkSignal, state.lastKnownOpen)
  const cohort = matchedCohort(observations, state.previousObservations, openToWorkSignal)
  const rate = publicRate(counts)
  return {
    open: counts.positive,
    notOpen: counts.negative,
    uncertain: counts.uncertain,
    rate,
    matchedRate: cohort.currentRate,
    matchedCount: cohort.matchedCount,
    sevenDayChangePp: percentagePointChange(rate, rateSevenDaysBefore(scan.scanDate, state.summaries)),
    added: tally.added,
    removed: tally.removed,
    net: netMovement(tally),
    entryRate: entryRate(tally),
    removalRate: removalRate(tally),
    entryExitRatio: entryExitRatio(tally.added, tally.removed),
    hasComparablePrior: hasComparablePrior(tally),
  }
}

function summarizeHiring(observations: Observation[], index: NetworkIndex, state: TimelineState): HiringSummary {
  const counts = countSignal(observations, hiringSignal)
  const tally = tallyTransitions(observations, hiringSignal, state.lastKnownHiring)
  return {
    hiring: counts.positive,
    notHiring: counts.negative,
    uncertain: counts.uncertain,
    rate: publicRate(counts),
    added: tally.added,
    removed: tally.removed,
    net: netMovement(tally),
    companyCount: countHiringCompanies(observations, index),
    hasComparablePrior: hasComparablePrior(tally),
  }
}

/** Rate of the latest earlier scan taken at least seven days before this one. */
function rateSevenDaysBefore(scanDate: string, earlierSummaries: ScanSummary[]): number | null {
  const cutoff = addDays(scanDate, -7)
  const candidates = earlierSummaries.filter((summary) => summary.scanDate <= cutoff)
  return candidates.at(-1)?.openToWork.rate ?? null
}

function countHiringCompanies(observations: Observation[], index: NetworkIndex): number {
  const companies = observations
    .filter((observation) => hiringSignal.read(observation) === 'POSITIVE')
    .map((observation) => index.personOf(observation.personId))
    .filter(isReliableCompany)
    .map((person) => normalizeCompanyName(person.companyName as string))
  return new Set(companies).size
}
