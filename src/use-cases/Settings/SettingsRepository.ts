import { settingsSchema, type Settings } from '@contracts/api'
import { getJson, sendJson } from '@/shared-repositories/apiClient'

export interface SettingsRepository {
  load: () => Promise<Settings>
  save: (settings: Settings) => Promise<Settings>
}

export const settingsRepository: SettingsRepository = {
  load: () => getJson('/api/settings', settingsSchema),
  save: (settings) => sendJson('PUT', '/api/settings', settingsSchema, settings),
}
