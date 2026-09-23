import type { Settings } from '../../../contracts/api.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Reads and saves one audience's settings. */
export const editSettings = ({ trackerStore }: TrackerPorts) => ({
  viewSettings: (): Settings => trackerStore.readSettings(),
  saveSettings: (settings: Settings): Settings => {
    trackerStore.saveSettings(settings)
    return trackerStore.readSettings()
  },
})
