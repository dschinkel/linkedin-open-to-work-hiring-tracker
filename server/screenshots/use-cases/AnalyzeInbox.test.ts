import type { Settings } from '../../../contracts/api.ts'
import { defaultSettingsFor } from '../../tracker/domain/DefaultSettings.ts'
import { memoryTrackerStore } from '../../tracker/outbound/persistence/MemoryTrackerStore.ts'
import type { DetectedCard } from '../domain/Deduplication.ts'
import type { InboxFolder } from '../outbound/filesystem/InboxFolder.ts'
import type { CardReader } from '../outbound/vision/CardReader.ts'
import { analyzeInbox } from './AnalyzeInbox.ts'

function card(displayName: string, open: boolean, photoPrint: string | null = null): Omit<DetectedCard, 'screenshotFileName'> {
  return {
    displayName,
    headline: 'Engineer at Acme',
    companyName: null,
    openToWork: { status: open ? 'OPEN' : 'NOT_OPEN', confidence: 0.97, classificationMethod: 'pixels' },
    hiring: { status: 'NOT_HIRING', confidence: 0.97, classificationMethod: 'pixels' },
    photoPrint,
  }
}

const photoOf = (red: number, green: number, blue: number) => [red, green, blue].map((value) => value.toString(16).padStart(2, '0').repeat(64)).join('')

/** A card reader that "sees" whatever people each file name was set up with; an unknown file can't be read. */
function readerSeeing(peopleByFile: Record<string, Array<Omit<DetectedCard, 'screenshotFileName'>>>): CardReader {
  return {
    readCards: async (_image, fileName) => {
      if (!(fileName in peopleByFile)) throw new Error('unreadable')
      return peopleByFile[fileName].map((person) => ({ ...person, screenshotFileName: fileName }))
    },
  }
}

function inboxWith(): InboxFolder & { removed: string[]; archived: string[] } {
  const removed: string[] = []
  const archived: string[] = []
  return {
    removed,
    archived,
    folderPath: () => '/inbox',
    store: async () => 'stored',
    read: async () => Buffer.from('image'),
    modifiedAt: async () => new Date('2026-01-01T12:00:00Z'),
    remove: async (fileName) => void removed.push(fileName),
    archive: async (fileName) => void archived.push(fileName),
    archivedFiles: async () => [],
    readArchived: async () => Buffer.from('image'),
    emptyInbox: async () => undefined,
  }
}

function storeWaitingFor(fileNames: string[], settings: Partial<Settings> = {}) {
  const trackerStore = memoryTrackerStore({ people: [], scans: [], observations: [] }, { ...defaultSettingsFor('followers'), ...settings })
  for (const fileName of fileNames) trackerStore.recordWaitingScreenshot(fileName)
  return trackerStore
}

const first = 'Screenshot 2026-09-22 at 9.01.12 AM.png'
const second = 'Screenshot 2026-09-22 at 9.01.19 AM.png'
const nextDay = 'Screenshot 2026-09-23 at 9.00.00 AM.png'

describe('analyzing waiting screenshots', () => {
  it('saves one scan per capture date with each person once', async () => {
    const trackerStore = storeWaitingFor([first, second])
    const cardReader = readerSeeing({ [first]: [card('Ana', true), card('Ben', false)], [second]: [card('Ben', false), card('Cy', false)] })

    await analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader }).analyzeWaitingScreenshots()

    expect(trackerStore.readNetwork().scans.map((scan) => [scan.scanDate, scan.duplicateCount])).toEqual([['2026-09-22', 1]])
  })

  it('merges a later upload into the same day instead of replacing it', async () => {
    const trackerStore = storeWaitingFor([first])
    const cardReader = readerSeeing({ [first]: [card('Ana', true)], [second]: [card('Cy', false)] })
    const analyzer = analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader })
    await analyzer.analyzeWaitingScreenshots()
    trackerStore.recordWaitingScreenshot(second)

    await analyzer.analyzeWaitingScreenshots()

    expect(trackerStore.readNetwork().people.map((person) => person.displayName).sort()).toEqual(['Ana', 'Cy'])
  })

  it('keeps separate days as separate scans', async () => {
    const trackerStore = storeWaitingFor([first, nextDay])

    await analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader: readerSeeing({ [first]: [card('Ana', false)], [nextDay]: [card('Ana', true)] }) }).analyzeWaitingScreenshots()

    expect(trackerStore.readNetwork().scans.map((scan) => scan.scanDate)).toEqual(['2026-09-22', '2026-09-23'])
  })

  it('deletes each screenshot once its data is saved', async () => {
    const inboxFolder = inboxWith()

    await analyzeInbox({ audience: 'followers', trackerStore: storeWaitingFor([first]), inboxFolder, cardReader: readerSeeing({ [first]: [card('Ana', true)] }) }).analyzeWaitingScreenshots()

    expect(inboxFolder.removed).toEqual([first])
  })

  it('archives instead of deleting when settings say keep', async () => {
    const inboxFolder = inboxWith()

    await analyzeInbox({ audience: 'followers', trackerStore: storeWaitingFor([first], { afterAnalysis: 'keep' }), inboxFolder, cardReader: readerSeeing({ [first]: [card('Ana', true)] }) }).analyzeWaitingScreenshots()

    expect([inboxFolder.archived, inboxFolder.removed]).toEqual([[first], []])
  })

  it('leaves a screenshot it could not read in the inbox, reported as failed', async () => {
    const inboxFolder = inboxWith()

    const report = await analyzeInbox({ audience: 'followers', trackerStore: storeWaitingFor(['blurry.png']), inboxFolder, cardReader: readerSeeing({}) }).analyzeWaitingScreenshots()

    expect([report.failedFiles.map((failed) => failed.fileName), inboxFolder.removed]).toEqual([['blurry.png'], []])
  })

  it('treats a screenshot with nobody in it as failed rather than an empty scan', async () => {
    const trackerStore = storeWaitingFor([first])

    const report = await analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader: readerSeeing({ [first]: [] }) }).analyzeWaitingScreenshots()

    expect([report.failedFiles.length, trackerStore.readNetwork().scans]).toEqual([1, []])
  })
})

describe('confidence thresholds from Settings', () => {
  it('marks a frame reading below the threshold as uncertain', async () => {
    const trackerStore = storeWaitingFor([first], { openToWorkThresholds: { open: 0.99, notOpen: 0.1 } })

    await analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader: readerSeeing({ [first]: [card('Ana', true)] }) }).analyzeWaitingScreenshots()

    expect(trackerStore.readNetwork().observations[0].openToWork.status).toBe('UNCERTAIN')
  })

  it('keeps a frame reading that meets the threshold', async () => {
    const trackerStore = storeWaitingFor([first])

    await analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader: readerSeeing({ [first]: [card('Ana', true)] }) }).analyzeWaitingScreenshots()

    expect(trackerStore.readNetwork().observations[0].openToWork.status).toBe('OPEN')
  })
})

describe('people who share a name', () => {
  it('saves two people with one name and different photos as two people', async () => {
    const trackerStore = storeWaitingFor([first, second])
    const cardReader = readerSeeing({ [first]: [card('Muhammad Hassan', true, photoOf(200, 150, 90))], [second]: [card('Muhammad Hassan', false, photoOf(40, 90, 170))] })

    await analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader }).analyzeWaitingScreenshots()

    expect(new Set(trackerStore.readNetwork().people.map((person) => person.id)).size).toBe(2)
  })

  it('keeps two people with one name apart when their screenshots are uploaded one at a time', async () => {
    const trackerStore = storeWaitingFor([first])
    const cardReader = readerSeeing({
      [first]: [{ ...card('Muhammad Hassan', false, photoOf(200, 150, 90)), headline: 'Full Stack Developer Node.js, ReactJs, Next.js, NestJS, AWS' }],
      [second]: [{ ...card('Muhammad Hassan', false, null), headline: 'Senior Software Engineer' }],
    })
    const analyzer = analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader })
    await analyzer.analyzeWaitingScreenshots()
    trackerStore.recordWaitingScreenshot(second)

    await analyzer.analyzeWaitingScreenshots()

    expect(trackerStore.readNetwork().people).toHaveLength(2)
  })

  it('follows each of them from day to day by their photo', async () => {
    const trackerStore = storeWaitingFor([first, second])
    const theOpenOne = photoOf(200, 150, 90)
    const cardReader = readerSeeing({
      [first]: [card('Muhammad Hassan', true, theOpenOne)],
      [second]: [card('Muhammad Hassan', false, photoOf(40, 90, 170))],
      [nextDay]: [card('Muhammad Hassan', true, theOpenOne)],
    })
    const analyzer = analyzeInbox({ audience: 'followers', trackerStore, inboxFolder: inboxWith(), cardReader })
    await analyzer.analyzeWaitingScreenshots()
    trackerStore.recordWaitingScreenshot(nextDay)

    await analyzer.analyzeWaitingScreenshots()

    const { observations } = trackerStore.readNetwork()
    const openOnTheFirstDay = observations.find((observation) => observation.scanId.endsWith('2026-09-22') && observation.openToWork.status === 'OPEN')
    const onTheNextDay = observations.find((observation) => observation.scanId.endsWith('2026-09-23'))
    expect(onTheNextDay?.personId).toBe(openOnTheFirstDay?.personId)
  })
})
