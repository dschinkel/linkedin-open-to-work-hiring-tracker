import type { ProcessingResult } from '../../../contracts/api.ts'

interface ClearAllDataPorts {
  /** Deletes every row in the database: both audiences' people, scans, history, screenshots list, and settings. */
  eraseDatabase: () => void
  /** Deletes screenshots still waiting in the inbox folders, so they aren't re-imported afterwards. */
  emptyInboxes: () => Promise<void>
}

/** Starts over from nothing. Irreversible, so the app asks the user to confirm first. */
export const clearAllData = ({ eraseDatabase, emptyInboxes }: ClearAllDataPorts) => ({
  clearAllData: async (): Promise<ProcessingResult> => {
    eraseDatabase()
    await emptyInboxes()
    return { message: 'All data was deleted. Followers and Connections are empty.' }
  },
})
