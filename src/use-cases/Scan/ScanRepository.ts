import {
  addScreenshotsResultSchema,
  type AddScreenshotsRequest,
  type AddScreenshotsResult,
  processingResultSchema,
  scanDetailSchema,
  scanPeopleSchema,
  scanHistorySchema,
  type ProcessingResult,
  type ScanDetail,
  type ScanPeople,
  type ScanSummary,
  type TimeWindow,
} from '@contracts/api'
import { type ApiClient, queryString } from '@/shared-repositories/apiClient'

export interface ScanRepository {
  history: (window: TimeWindow) => Promise<ScanSummary[]>
  detail: (scanId: string) => Promise<ScanDetail>
  /** Everyone saved for a scan, sorted by name; "latest" means the most recent scan. */
  people: (scanId: string) => Promise<ScanPeople>
  reprocess: (scanId: string) => Promise<ProcessingResult>
  addScreenshots: (files: AddScreenshotsRequest['files']) => Promise<AddScreenshotsResult>
}

export function scanRepositoryFor(api: ApiClient): ScanRepository {
  return {
    history: async (window) => (await api.getJson(`/scans?${queryString({ window })}`, scanHistorySchema)).scans,
    detail: (scanId) => api.getJson(`/scans/${encodeURIComponent(scanId)}`, scanDetailSchema),
    people: (scanId) => api.getJson(`/scans/${encodeURIComponent(scanId)}/people`, scanPeopleSchema),
    addScreenshots: (files) => api.sendJson('POST', '/screenshots', addScreenshotsResultSchema, { files }),
    reprocess: (scanId) => api.sendJson('POST', `/scans/${encodeURIComponent(scanId)}/reprocess`, processingResultSchema),
  }
}
