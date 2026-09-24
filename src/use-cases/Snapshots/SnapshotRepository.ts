import { type SaveSnapshotRequest, type Snapshot, type SnapshotKind, snapshotListSchema, snapshotSchema, type SnapshotSummary, snapshotSummarySchema } from '@contracts/api'
import { type ApiClient, queryString } from '@/shared-repositories/apiClient'

export interface SnapshotRepository {
  list: (kind: SnapshotKind) => Promise<SnapshotSummary[]>
  save: (kind: SnapshotKind, request: SaveSnapshotRequest) => Promise<SnapshotSummary>
  load: (snapshotId: string) => Promise<Snapshot>
  remove: (snapshotId: string) => Promise<SnapshotSummary>
}

export function snapshotRepositoryFor(api: ApiClient): SnapshotRepository {
  return {
    list: async (kind) => (await api.getJson(`/snapshots?${queryString({ kind })}`, snapshotListSchema)).snapshots,
    save: (kind, request) => api.sendJson('POST', `/snapshots?${queryString({ kind })}`, snapshotSummarySchema, request),
    load: (snapshotId) => api.getJson(`/snapshots/${encodeURIComponent(snapshotId)}`, snapshotSchema),
    remove: (snapshotId) => api.sendJson('DELETE', `/snapshots/${encodeURIComponent(snapshotId)}`, snapshotSummarySchema),
  }
}
