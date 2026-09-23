import {
  addScreenshotsResultSchema,
  type AddScreenshotsRequest,
  type AddScreenshotsResult,
  processingResultSchema,
  scanDetailSchema,
  scanHistorySchema,
  type ProcessingResult,
  type ScanDetail,
  type ScanSummary,
  type TimeWindow,
} from '@contracts/api'
import { type ApiClient, queryString } from '@/shared-repositories/apiClient'

export interface ScanRepository {
  history: (window: TimeWindow) => Promise<ScanSummary[]>
  detail: (scanId: string) => Promise<ScanDetail>
  analyzeNewScreenshots: () => Promise<ProcessingResult>
  reprocess: (scanId: string) => Promise<ProcessingResult>
  addScreenshots: (files: AddScreenshotsRequest['files']) => Promise<AddScreenshotsResult>
}

export function scanRepositoryFor(api: ApiClient): ScanRepository {
  return {
    history: async (window) => (await api.getJson(`/api/scans?${queryString({ window })}`, scanHistorySchema)).scans,
    detail: (scanId) => api.getJson(`/api/scans/${encodeURIComponent(scanId)}`, scanDetailSchema),
    analyzeNewScreenshots: () => api.sendJson('POST', '/api/scans', processingResultSchema),
    addScreenshots: (files) => api.sendJson('POST', '/api/screenshots', addScreenshotsResultSchema, { files }),
    reprocess: (scanId) => api.sendJson('POST', `/api/scans/${encodeURIComponent(scanId)}/reprocess`, processingResultSchema),
  }
}
