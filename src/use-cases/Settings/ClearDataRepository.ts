import { type Audience, processingResultSchema, type ProcessingResult } from '@contracts/api'
import type { TrackerEnvironment } from '@/shared-repositories/trackerEnvironment'

export interface ClearDataRepository {
  clearEverything: () => Promise<ProcessingResult>
  clearAudience: (audience: Audience) => Promise<ProcessingResult>
}

export function clearDataRepositoryFor({ api, apiFor }: TrackerEnvironment): ClearDataRepository {
  return {
    clearEverything: () => api.sendJson('DELETE', '/all-data', processingResultSchema),
    clearAudience: (audience) => apiFor(audience).sendJson('DELETE', '/data', processingResultSchema),
  }
}
