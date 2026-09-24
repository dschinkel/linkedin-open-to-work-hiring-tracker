import type { ConfidenceBreakdown, ScanQuality } from '../../../contracts/api.ts'
import { isReliableCompany } from '../../shared/domain/Company.ts'
import type { NetworkIndex } from './NetworkIndex.ts'
import { hiringSignal, type Observation, openToWorkSignal, type Person, type Scan, type Signal } from '../../shared/domain/Observation.ts'
import { percentage } from './Rates.ts'

export const highConfidence = 0.9

export function scanQuality(scan: Scan, index: NetworkIndex): ScanQuality {
  return qualityOfScans([scan], index.observationsOf(scan.id), index.personOf)
}

export function qualityOfScans(scans: Scan[], observations: Observation[], personOf: (personId: string) => Person): ScanQuality {
  const openToWork = confidenceBreakdown(observations, openToWorkSignal)
  return {
    screenshotCount: sumOf(scans.map((scan) => scan.screenshots.length)),
    cardsDetected: sumOf(scans.map((scan) => scan.cardsDetected)),
    uniquePeople: observations.length,
    duplicateCount: sumOf(scans.map((scan) => scan.duplicateCount)),
    openToWork,
    hiring: confidenceBreakdown(observations, hiringSignal),
    classificationCoverage: percentage(observations.length - openToWork.uncertain, observations.length),
    companyExtraction: companyExtractionAmongHiring(observations, personOf),
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

function companyExtractionAmongHiring(observations: Observation[], personOf: (personId: string) => Person): ScanQuality['companyExtraction'] {
  const hiringPeople = observations
    .filter((observation) => hiringSignal.read(observation) === 'POSITIVE')
    .map((observation) => personOf(observation.personId))
  const withCompany = hiringPeople.filter((person) => person.companyName !== null)
  const identified = withCompany.filter(isReliableCompany).length
  return {
    identified,
    lowConfidence: withCompany.length - identified,
    notVisible: hiringPeople.length - withCompany.length,
  }
}

function sumOf(counts: number[]): number {
  return counts.reduce((total, count) => total + count, 0)
}
