export type OpenToWorkStatus = 'OPEN' | 'NOT_OPEN' | 'UNCERTAIN'
export type HiringStatus = 'HIRING' | 'NOT_HIRING' | 'UNCERTAIN'
export type ClassificationMethod = 'opencv' | 'vision' | 'manual'
export type CompanyExtractionMethod = 'ocr-explicit' | 'ocr-headline' | 'manual' | 'unknown'

export interface Classification<Status extends string> {
  status: Status
  confidence: number
  classificationMethod: ClassificationMethod
}

export interface CompanyExtraction {
  companyName: string | null
  companyConfidence: number | null
  companyExtractionMethod: CompanyExtractionMethod
}

export interface Person extends CompanyExtraction {
  id: string
  personHash: string
  displayName: string
  headline: string | null
}

export interface Observation {
  scanId: string
  personId: string
  openToWork: Classification<OpenToWorkStatus>
  hiring: Classification<HiringStatus>
}

export interface Screenshot {
  fileName: string
  peopleDetected: number
  uncertainCount: number
  outcome: 'processed' | 'warning' | 'failed'
  warning: string | null
}

export interface Scan {
  id: string
  scanDate: string
  screenshots: Screenshot[]
  cardsDetected: number
  duplicateCount: number
}

export interface Network {
  people: Person[]
  scans: Scan[]
  observations: Observation[]
}

export type SignalStatus = 'POSITIVE' | 'NEGATIVE' | 'UNCERTAIN'

/** One visible avatar-frame dimension (Open to Work, Hiring) viewed through a common lens. */
export interface Signal {
  name: string
  read: (observation: Observation) => SignalStatus
  confidenceOf: (observation: Observation) => number
}

export const openToWorkSignal: Signal = {
  name: 'openToWork',
  read: (observation) => toSignalStatus(observation.openToWork.status, 'OPEN', 'NOT_OPEN'),
  confidenceOf: (observation) => observation.openToWork.confidence,
}

export const hiringSignal: Signal = {
  name: 'hiring',
  read: (observation) => toSignalStatus(observation.hiring.status, 'HIRING', 'NOT_HIRING'),
  confidenceOf: (observation) => observation.hiring.confidence,
}

function toSignalStatus(status: string, positive: string, negative: string): SignalStatus {
  if (status === positive) return 'POSITIVE'
  if (status === negative) return 'NEGATIVE'
  return 'UNCERTAIN'
}
