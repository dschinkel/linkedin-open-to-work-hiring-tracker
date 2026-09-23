import { addScreenshots, type ScreenshotInbox } from './screenshotInbox.ts'

function inboxHolding(existing: string[]): ScreenshotInbox & { stored: string[] } {
  const stored: string[] = []
  return {
    stored,
    store: async (fileName) => {
      if (existing.includes(fileName)) return 'already-present'
      stored.push(fileName)
      return 'stored'
    },
  }
}

describe('adding dropped screenshots', () => {
  it('stores image files in the inbox', async () => {
    const inbox = inboxHolding([])

    await addScreenshots(inbox, { files: [{ fileName: 'Screenshot 2026-09-22 at 9.01.12 AM.png', dataBase64: 'aGk=' }] })

    expect(inbox.stored).toEqual(['Screenshot 2026-09-22 at 9.01.12 AM.png'])
  })

  it('skips a screenshot that is already in the inbox instead of duplicating it', async () => {
    const result = await addScreenshots(inboxHolding(['a.png']), { files: [{ fileName: 'a.png', dataBase64: 'aGk=' }] })

    expect(result.rejected).toEqual([{ fileName: 'a.png', reason: 'Already in the inbox' }])
  })

  it('refuses files that are not images', async () => {
    const inbox = inboxHolding([])

    await addScreenshots(inbox, { files: [{ fileName: 'resume.pdf', dataBase64: 'aGk=' }] })

    expect(inbox.stored).toEqual([])
  })
})
