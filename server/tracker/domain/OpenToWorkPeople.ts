import type { OpenToWorkPerson } from '../../../contracts/api.ts'
import { openToWorkSignal, type SignalStatus } from '../../shared/domain/Observation.ts'
import type { NetworkIndex } from './NetworkIndex.ts'

interface OpenHistory {
  firstSeenOpen: string | null
  lastSeenOpen: string | null
  latestClassifiedStatus: SignalStatus
}

/**
 * Everyone whose most recent clear reading shows the #OPENTOWORK frame, most recently seen first.
 * Someone who has since been read without the frame is left out.
 */
export function listOpenToWorkPeople(index: NetworkIndex): OpenToWorkPerson[] {
  const latestScanDate = index.scansInOrder.at(-1)?.scanDate
  return [...openHistories(index).entries()]
    .filter(([, history]) => history.latestClassifiedStatus === 'POSITIVE')
    .map(([personId, history]) => toOpenToWorkPerson(personId, history, index, latestScanDate))
    .sort((a, b) => b.lastSeenOpen.localeCompare(a.lastSeenOpen) || a.displayName.localeCompare(b.displayName))
}

function openHistories(index: NetworkIndex): Map<string, OpenHistory> {
  const histories = new Map<string, OpenHistory>()
  for (const scan of index.scansInOrder) {
    for (const observation of index.observationsOf(scan.id)) {
      const history = histories.get(observation.personId) ?? { firstSeenOpen: null, lastSeenOpen: null, latestClassifiedStatus: 'UNCERTAIN' }
      histories.set(observation.personId, recordSighting(history, scan.scanDate, openToWorkSignal.read(observation)))
    }
  }
  return histories
}

function recordSighting(history: OpenHistory, scanDate: string, status: SignalStatus): OpenHistory {
  const isOpen = status === 'POSITIVE'
  return {
    firstSeenOpen: history.firstSeenOpen ?? (isOpen ? scanDate : null),
    lastSeenOpen: isOpen ? scanDate : history.lastSeenOpen,
    latestClassifiedStatus: status === 'UNCERTAIN' ? history.latestClassifiedStatus : status,
  }
}

function toOpenToWorkPerson(personId: string, history: OpenHistory, index: NetworkIndex, latestScanDate: string | undefined): OpenToWorkPerson {
  const person = index.personOf(personId)
  return {
    personId,
    displayName: person.displayName,
    headline: person.headline,
    companyName: person.companyName,
    firstSeenOpen: history.firstSeenOpen as string,
    lastSeenOpen: history.lastSeenOpen as string,
    wasObservedInLatestScan: history.lastSeenOpen === latestScanDate,
  }
}
