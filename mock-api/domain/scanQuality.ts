import type { ConfidenceBreakdown, ScanQuality } from '../../contracts/api.ts'
import { isReliableCompany } from './company.ts'
import type { NetworkIndex } from './networkIndex.ts'
import { hiringSignal, type Observation, openToWorkSignal, type Scan, type Signal } from './observation.ts'
import { percentage } from './rates.ts'

export const highConfidence = 0.9

export function scanQuality(scan: Scan, index: NetworkIndex): ScanQuality {
  const observations = index.observationsOf(scan.id)
  const openToWork = confidenceBreakdown(observations, openToWorkSignal)
  return {
    screenshotCount: scan.screenshots.length,
    cardsDetected: scan.cardsDetected,
    uniquePeople: observations.length,
    duplicateCount: scan.duplicateCount,
    openToWork,
    hiring: confidenceBreakdown(observations, hiringSignal),
    classificationCoverage: percentage(observations.length - openToWork.uncertain, observations.length),
    companyExtraction: companyExtractionAmongHiring(observations, index),
  }
}

function confidenceBreakdown(observations: Observation[], signal: Signal): ConfidenceBreakdown {
  const classified = observations.filter((observation) => signal.read(observation) !== 'UNCERTAIN')
  const high = classified.filter((observation) => signal.confidenceOf(observation) >= highConfidence).length
  return {
    highConfidence: high,
    lowConfidence: classified.length - high,
    uncertain: observations.length - classified.length,
  }
}

function companyExtractionAmongHiring(observations: Observation[], index: NetworkIndex): ScanQuality['companyExtraction'] {
  const hiringPeople = observations
    .filter((observation) => hiringSignal.read(observation) === 'POSITIVE')
    .map((observation) => index.personOf(observation.personId))
  const withCompany = hiringPeople.filter((person) => person.companyName !== null)
  const identified = withCompany.filter(isReliableCompany).length
  return {
    identified,
    lowConfidence: withCompany.length - identified,
    notVisible: hiringPeople.length - withCompany.length,
  }
}
