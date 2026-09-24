import type { ProcessingResult } from '../../../contracts/api.ts'

interface ClearAllDataPorts {
  eraseDatabase: () => void
  emptyInboxes: () => Promise<void>
}

export const clearAllData = ({ eraseDatabase, emptyInboxes }: ClearAllDataPorts) => ({
  clearAllData: async (): Promise<ProcessingResult> => {
    eraseDatabase()
    await emptyInboxes()
    return { message: 'All data was deleted. Followers and Connections are empty.' }
  },
})
