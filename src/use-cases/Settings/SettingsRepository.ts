import { processingResultSchema, settingsSchema, type ProcessingResult, type Settings } from '@contracts/api'
import { type ApiClient } from '@/shared-repositories/apiClient'

export interface SettingsRepository {
  load: () => Promise<Settings>
  save: (settings: Settings) => Promise<Settings>
  clearAllData: () => Promise<ProcessingResult>
}

export function settingsRepositoryFor(api: ApiClient): SettingsRepository {
  return {
    load: () => api.getJson('/settings', settingsSchema),
    save: (settings) => api.sendJson('PUT', '/settings', settingsSchema, settings),
    clearAllData: () => api.sendJson('DELETE', '/all-data', processingResultSchema),
  }
}
