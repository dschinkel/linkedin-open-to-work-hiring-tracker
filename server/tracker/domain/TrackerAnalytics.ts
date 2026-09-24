import type { HiringPerson, ScanSummary } from '../../../contracts/api.ts'
import type { TrackerStore } from '../outbound/persistence/TrackerStore.ts'
import { listHiringPeople } from './HiringPeople.ts'
import { indexNetwork, type NetworkIndex } from './NetworkIndex.ts'
import { buildTimeline } from './Timeline.ts'

export interface Analytics {
  index: NetworkIndex
  timeline: ScanSummary[]
  hiringPeople: HiringPerson[]
}

export const trackerAnalytics = (trackerStore: TrackerStore): (() => Analytics) => {
  let cached: { version: number; analytics: Analytics } | null = null
  return () => {
    const version = trackerStore.dataVersion()
    if (cached?.version !== version) cached = { version, analytics: analyze(trackerStore) }
    return cached.analytics
  }
}

function analyze(trackerStore: TrackerStore): Analytics {
  const index = indexNetwork(trackerStore.readNetwork())
  return { index, timeline: buildTimeline(index), hiringPeople: listHiringPeople(index) }
}

export interface TrackerPorts {
  analytics: () => Analytics
  trackerStore: TrackerStore
  today: () => string
}
