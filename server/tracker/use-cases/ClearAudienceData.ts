import type { Audience, ProcessingResult } from '../../../contracts/api.ts'
import type { TrackerStore } from '../outbound/persistence/TrackerStore.ts'

interface ClearAudienceDataPorts {
  audience: Audience
  trackerStore: TrackerStore
  emptyInbox: () => Promise<void>
}

const audienceNames: Record<Audience, { cleared: string; untouched: string }> = {
  followers: { cleared: 'Followers', untouched: 'Connections' },
  contacts: { cleared: 'Connections', untouched: 'Followers' },
}

export const clearAudienceData = ({ audience, trackerStore, emptyInbox }: ClearAudienceDataPorts) => ({
  clearAudienceData: async (): Promise<ProcessingResult> => {
    await emptyInbox()
    trackerStore.eraseAudience()
    const names = audienceNames[audience]
    return { message: `${names.cleared} data was deleted and its settings are back to defaults. ${names.untouched} data was not touched.` }
  },
})
