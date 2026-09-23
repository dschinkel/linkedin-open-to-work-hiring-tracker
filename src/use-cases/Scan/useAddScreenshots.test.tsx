// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ChangeEvent, DragEvent } from 'react'
import type { AddScreenshotsRequest, AddScreenshotsResult, ProcessingResult, ScanDetail } from '@contracts/api'
import { insideTracker, pendingAnswer } from '@/test-support/trackerFixtures'
import type { ScanRepository } from './ScanRepository'
import { useAddScreenshots } from './useAddScreenshots'

type Upload = AddScreenshotsRequest['files']

function screenshot(name: string, content = 'png-bytes'): File {
  return new File([content], name, { type: 'image/png' })
}

function chosen(files: File[]): ChangeEvent<HTMLInputElement> {
  return { target: { files, value: 'C:\\fakepath\\screenshot.png' } } as unknown as ChangeEvent<HTMLInputElement>
}

function dropped(files: File[]): DragEvent<HTMLElement> {
  return { preventDefault: () => undefined, dataTransfer: { files } } as unknown as DragEvent<HTMLElement>
}

function savedAs(fileName: string): AddScreenshotsResult {
  return { saved: [fileName], rejected: [], analysisMessage: '', importedCount: 1, failedCount: 0, peopleInScan: 20 * (Number(/\d+/.exec(fileName)?.[0] ?? 1)), message: `Saved ${fileName}.` }
}

function inboxAnswering(answer: (upload: Upload) => Promise<AddScreenshotsResult>) {
  const uploads: Upload[] = []
  const repository: ScanRepository = {
    history: async () => [],
    detail: async () => ({}) as ScanDetail,
    reprocess: async () => ({}) as ProcessingResult,
    addScreenshots: async (files) => {
      uploads.push(files)
      return answer(files)
    },
  }
  return { repository, uploads }
}

function inboxSavingEverything() {
  return inboxAnswering(async ([file]) => savedAs(file.fileName))
}

function inboxRejecting(rejectedName: string, reason: string) {
  return inboxAnswering(async ([file]) =>
    file.fileName === rejectedName ? { saved: [], rejected: [{ fileName: rejectedName, reason }], analysisMessage: '', importedCount: 0, failedCount: 0, peopleInScan: 0, message: '' } : savedAs(file.fileName),
  )
}

function inboxFailingOn(brokenName: string, errorMessage: string) {
  return inboxAnswering(async ([file]) => {
    if (file.fileName === brokenName) throw new Error(errorMessage)
    return savedAs(file.fileName)
  })
}

function renderScreenshotDrop(repository: ScanRepository) {
  return renderHook(() => useAddScreenshots(repository), { wrapper: insideTracker() })
}

describe('adding screenshots', () => {
  it('uploads each screenshot on its own', async () => {
    const { repository, uploads } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png'), screenshot('page-3.png')])))

    await waitFor(() => expect(uploads.map((upload) => upload.map((file) => file.fileName))).toEqual([['page-1.png'], ['page-2.png'], ['page-3.png']]))
  })

  it('sends the screenshot contents encoded as base64', async () => {
    const { repository, uploads } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png', 'hello')])))

    await waitFor(() => expect(uploads).toEqual([[{ fileName: 'page-1.png', dataBase64: 'aGVsbG8=' }]]))
  })

  it('shows which screenshot is being added out of how many', async () => {
    const firstUpload = pendingAnswer<AddScreenshotsResult>()
    const { repository } = inboxAnswering(() => firstUpload.promise)
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png')])))

    await waitFor(() => expect(result.current.progressMessage).toContain('1 of 2: page-1.png'))
  })

  it('shows it is uploading until every screenshot is sent', async () => {
    const firstUpload = pendingAnswer<AddScreenshotsResult>()
    const { repository } = inboxAnswering(() => firstUpload.promise)
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png')])))

    await waitFor(() => expect(result.current.isUploading).toBe(true))
  })

  it('clears the progress once every screenshot is sent', async () => {
    const { repository } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png')])))

    await waitFor(() => expect(result.current).toMatchObject({ isUploading: false, progressMessage: '', resultMessage: expect.stringContaining('1 screenshot added') }))
  })

  it('totals how many screenshots were added', async () => {
    const { repository } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png'), screenshot('page-3.png')])))

    await waitFor(() => expect(result.current.resultMessage).toContain('3 screenshots added'))
  })

  it('totals what was read across the whole batch, not just the last file', async () => {
    const { repository } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png'), screenshot('page-3.png')])))

    await waitFor(() => expect(result.current.resultMessage).toBe('3 screenshots added. 3 read. 60 people in this scan.'))
  })

  it('lists screenshots the inbox skipped with the reason', async () => {
    const { repository } = inboxRejecting('page-2.png', 'already in the inbox')
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png')])))

    await waitFor(() => expect(result.current.skippedFiles).toEqual(['page-2.png: already in the inbox']))
  })

  it('counts skipped screenshots alongside the added ones', async () => {
    const { repository } = inboxRejecting('page-2.png', 'already in the inbox')
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png')])))

    await waitFor(() => expect(result.current.resultMessage).toContain('1 screenshot added, 1 skipped'))
  })

  it('keeps adding the rest when one screenshot fails to upload', async () => {
    const { repository } = inboxFailingOn('page-2.png', 'connection reset')
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png'), screenshot('page-3.png')])))

    await waitFor(() => expect(result.current.resultMessage).toContain('2 screenshots added, 1 skipped'))
  })

  it('skips a screenshot that failed to upload with the reason it failed', async () => {
    const { repository } = inboxFailingOn('page-2.png', 'connection reset')
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png')])))

    await waitFor(() => expect(result.current.skippedFiles).toEqual([expect.stringMatching(/^page-2\.png: .*connection reset/)]))
  })

  it('does nothing when no screenshot was chosen', async () => {
    const { repository, uploads } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleFilesChosen(chosen([])))

    expect([uploads, result.current.isUploading]).toEqual([[], false])
  })

  it('lets the same screenshot be chosen again', () => {
    const { repository } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)
    const choice = chosen([screenshot('page-1.png')])

    act(() => result.current.handleFilesChosen(choice))

    expect(choice.target.value).toBe('')
  })

  it('highlights the drop area while screenshots are dragged over it', () => {
    const { repository } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)

    act(() => result.current.handleDragOver(dropped([])))

    expect(result.current.isDraggingOver).toBe(true)
  })

  it('stops highlighting the drop area when the drag leaves it', () => {
    const { repository } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)
    act(() => result.current.handleDragOver(dropped([])))

    act(() => result.current.handleDragLeave())

    expect(result.current.isDraggingOver).toBe(false)
  })

  it('adds dropped screenshots and stops highlighting the drop area', async () => {
    const { repository } = inboxSavingEverything()
    const { result } = renderScreenshotDrop(repository)
    act(() => result.current.handleDragOver(dropped([])))

    act(() => result.current.handleDrop(dropped([screenshot('page-1.png'), screenshot('page-2.png')])))

    await waitFor(() => expect(result.current).toMatchObject({ isDraggingOver: false, resultMessage: expect.stringContaining('2 screenshots added') }))
  })

  it('shows a running total of people found while the batch uploads', async () => {
    const { repository } = inboxAnswering(async ([file]) => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return savedAs(file.fileName)
    })
    const progress: string[] = []
    const { result } = renderHook(() => {
      const view = useAddScreenshots(repository)
      progress.push(view.progressMessage)
      return view
    }, { wrapper: insideTracker() })

    act(() => result.current.handleFilesChosen(chosen([screenshot('page-1.png'), screenshot('page-2.png'), screenshot('page-3.png')])))

    await waitFor(() => expect(progress).toContain('Adding 3 of 3: page-3.png · 40 people found so far'))
  })
})
