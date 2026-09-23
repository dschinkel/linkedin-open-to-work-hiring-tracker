import { settingsSchema, type Settings } from '@contracts/api'
import { type ApiClient } from '@/shared-repositories/apiClient'

export interface SettingsRepository {
  load: () => Promise<Settings>
  save: (settings: Settings) => Promise<Settings>
}

export function settingsRepositoryFor(api: ApiClient): SettingsRepository {
  return {
    load: () => api.getJson('/settings', settingsSchema),
    save: (settings) => api.sendJson('PUT', '/settings', settingsSchema, settings),
  }
}
