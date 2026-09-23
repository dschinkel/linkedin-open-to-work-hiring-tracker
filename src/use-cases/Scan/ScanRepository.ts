import {
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
}

export function scanRepositoryFor(api: ApiClient): ScanRepository {
  return {
    history: async (window) => (await api.getJson(`/api/scans?${queryString({ window })}`, scanHistorySchema)).scans,
    detail: (scanId) => api.getJson(`/api/scans/${encodeURIComponent(scanId)}`, scanDetailSchema),
    analyzeNewScreenshots: () => api.sendJson('POST', '/api/scans', processingResultSchema),
    reprocess: (scanId) => api.sendJson('POST', `/api/scans/${encodeURIComponent(scanId)}/reprocess`, processingResultSchema),
  }
}
