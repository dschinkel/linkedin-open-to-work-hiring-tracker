import {
  processingResultSchema,
  scanDetailSchema,
  scanHistorySchema,
  type ProcessingResult,
  type ScanDetail,
  type ScanSummary,
  type TimeWindow,
} from '@contracts/api'
import { getJson, queryString, sendJson } from '@/shared-repositories/apiClient'

export interface ScanRepository {
  history: (window: TimeWindow) => Promise<ScanSummary[]>
  detail: (scanId: string) => Promise<ScanDetail>
  analyzeNewScreenshots: () => Promise<ProcessingResult>
  reprocess: (scanId: string) => Promise<ProcessingResult>
}

export const scanRepository: ScanRepository = {
  history: async (window) => (await getJson(`/api/scans?${queryString({ window })}`, scanHistorySchema)).scans,
  detail: (scanId) => getJson(`/api/scans/${encodeURIComponent(scanId)}`, scanDetailSchema),
  analyzeNewScreenshots: () => sendJson('POST', '/api/scans', processingResultSchema),
  reprocess: (scanId) => sendJson('POST', `/api/scans/${encodeURIComponent(scanId)}/reprocess`, processingResultSchema),
}
