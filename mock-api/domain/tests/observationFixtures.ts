import type { HiringStatus, Observation, OpenToWorkStatus } from '../observation.ts'

export function observationOf(personId: string, openStatus: OpenToWorkStatus, hiringStatus: HiringStatus = 'NOT_HIRING'): Observation {
  return {
    scanId: 'scan-under-test',
    personId,
    openToWork: { status: openStatus, confidence: 0.97, classificationMethod: 'opencv' },
    hiring: { status: hiringStatus, confidence: 0.97, classificationMethod: 'opencv' },
  }
}
