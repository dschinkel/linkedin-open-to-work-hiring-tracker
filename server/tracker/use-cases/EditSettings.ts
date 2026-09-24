import type { Settings } from '../../../contracts/api.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const editSettings = ({ trackerStore }: TrackerPorts) => ({
  viewSettings: (): Settings => trackerStore.readSettings(),
  saveSettings: (settings: Settings): Settings => {
    trackerStore.saveSettings(settings)
    return trackerStore.readSettings()
  },
})
