import type { Audience } from '../../contracts/api.ts'
import { allAudiencesRoutes } from '../tracker/http/AllAudiencesHttp.ts'
import { type Analytics, trackerAnalytics } from '../tracker/domain/TrackerAnalytics.ts'
import type { SnapshotStore, TrackerStore } from '../tracker/outbound/persistence/TrackerStore.ts'
import { findPeopleAcrossAudiences } from '../tracker/use-cases/FindPeopleAcrossAudiences.ts'
import { keepSnapshots } from '../tracker/use-cases/KeepSnapshots.ts'
import type { Route } from './HttpRouting.ts'

export interface AllAudiencesTrackerParts {
  trackerStores: Record<Audience, TrackerStore>
  snapshotStore: SnapshotStore
  analytics?: Record<Audience, () => Analytics>
  now?: () => Date
}

export const allAudiencesTrackerRoutes = ({ trackerStores, snapshotStore, analytics = analyticsOf(trackerStores), now = () => new Date() }: AllAudiencesTrackerParts): Route[] => {
  const acrossAudiences = findPeopleAcrossAudiences(analytics)
  return allAudiencesRoutes({
    ...acrossAudiences,
    ...keepSnapshots({
      snapshotStore,
      openToWorkPeople: () => acrossAudiences.findOpenToWorkPeople().people,
      hiringPeople: acrossAudiences.allHiringPeople,
      now,
      newSnapshotId: () => crypto.randomUUID(),
    }),
  })
}

function analyticsOf(trackerStores: Record<Audience, TrackerStore>): Record<Audience, () => Analytics> {
  return { followers: trackerAnalytics(trackerStores.followers), contacts: trackerAnalytics(trackerStores.contacts) }
}
