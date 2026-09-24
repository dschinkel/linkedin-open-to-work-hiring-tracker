import type { Settings } from '../../../contracts/api.ts'
import { defaultSettingsFor } from '../domain/DefaultSettings.ts'
import { observationOf } from '../domain/tests/ObservationFixtures.ts'
import { memoryTrackerStore } from '../outbound/persistence/MemoryTrackerStore.ts'
import { clearAudienceData } from './ClearAudienceData.ts'

const zoe = { id: 'zoe', personHash: 'hash-zoe', displayName: 'Zoe Adams', headline: null, companyName: null, companyConfidence: null, companyExtractionMethod: 'unknown' as const }
const scan = { id: 'contacts-2026-09-22', scanDate: '2026-09-22', screenshots: [], cardsDetected: 1, duplicateCount: 0 }
const customInbox: Settings = { ...defaultSettingsFor('contacts'), inboxDirectory: 'MyShots/contacts' }

function contactsTracker() {
  const trackerStore = memoryTrackerStore({ people: [zoe], scans: [scan], observations: [{ ...observationOf(zoe.id, 'OPEN', 'HIRING'), scanId: scan.id }] }, defaultSettingsFor('contacts'))
  trackerStore.saveSettings(customInbox)
  const emptiedInboxes: string[] = []
  const clearing = clearAudienceData({ audience: 'contacts', trackerStore, emptyInbox: async () => void emptiedInboxes.push(trackerStore.readSettings().inboxDirectory) })
  return { trackerStore, emptiedInboxes, clearing }
}

describe("clearing one audience's data", () => {
  it('forgets every person and scan of that audience', async () => {
    const { trackerStore, clearing } = contactsTracker()

    await clearing.clearAudienceData()

    expect(trackerStore.readNetwork()).toEqual({ people: [], scans: [], observations: [] })
  })

  it('empties the inbox folder the audience was using before its settings go back to defaults', async () => {
    const { trackerStore, emptiedInboxes, clearing } = contactsTracker()

    await clearing.clearAudienceData()

    expect([emptiedInboxes, trackerStore.readSettings()]).toEqual([['MyShots/contacts'], defaultSettingsFor('contacts')])
  })

  it('names the audience it cleared, as the app shows it', async () => {
    const { clearing } = contactsTracker()

    expect((await clearing.clearAudienceData()).message).toContain('Connections')
  })
})
