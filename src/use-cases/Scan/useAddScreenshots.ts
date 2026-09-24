import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ChangeEvent, type DragEvent, useState } from 'react'
import type { AddScreenshotsRequest, AddScreenshotsResult } from '@contracts/api'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { browserPdfReader, type PdfDocument, type PdfReader } from './pdfPages'
import { type ScanRepository, scanRepositoryFor } from './ScanRepository'

export interface AddScreenshotsView {
  isDraggingOver: boolean
  isUploading: boolean
  progressMessage: string
  resultMessage: string
  skippedFiles: string[]
  acceptedTypes: string
  handleDragOver: (event: DragEvent<HTMLElement>) => void
  handleDragLeave: () => void
  handleDrop: (event: DragEvent<HTMLElement>) => void
  handleFilesChosen: (event: ChangeEvent<HTMLInputElement>) => void
}

interface UploadTotals {
  saved: string[]
  rejected: AddScreenshotsResult['rejected']
  importedCount: number
  failedCount: number
  peopleInScan: number
}

interface WaitingScreenshot {
  fileName: string
  label: string
  contents: () => Promise<Blob>
}

const acceptedTypes = 'image/png,image/jpeg,image/webp,application/pdf'

export function useAddScreenshots(injectedRepository?: ScanRepository, injectedPdfReader: PdfReader = browserPdfReader): AddScreenshotsView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? scanRepositoryFor(api)
  const queryClient = useQueryClient()
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const upload = useMutation({
    mutationFn: (files: File[]) => uploadOneByOne(files, { repository, pdfReader: injectedPdfReader, reportProgress: setProgressMessage }),
    onSettled: () => {
      setProgressMessage('')
      void queryClient.invalidateQueries()
    },
  })

  function addFiles(files: FileList | null): void {
    if (files && files.length > 0) upload.mutate([...files])
  }

  return {
    isDraggingOver,
    isUploading: upload.isPending,
    progressMessage,
    resultMessage: upload.data ? summarize(upload.data) : (upload.error?.message ?? ''),
    skippedFiles: (upload.data?.rejected ?? []).map((file) => `${file.fileName}: ${file.reason}`),
    acceptedTypes,
    handleDragOver: (event) => {
      event.preventDefault()
      setIsDraggingOver(true)
    },
    handleDragLeave: () => setIsDraggingOver(false),
    handleDrop: (event) => {
      event.preventDefault()
      setIsDraggingOver(false)
      addFiles(event.dataTransfer.files)
    },
    handleFilesChosen: (event) => {
      addFiles(event.target.files)
      event.target.value = ''
    },
  }
}

interface UploadDependencies {
  repository: ScanRepository
  pdfReader: PdfReader
  reportProgress: (message: string) => void
}

async function uploadOneByOne(files: File[], { repository, pdfReader, reportProgress }: UploadDependencies): Promise<UploadTotals> {
  const totals: UploadTotals = { saved: [], rejected: [], importedCount: 0, failedCount: 0, peopleInScan: 0 }
  const screenshots = await screenshotsIn(files, pdfReader, totals, reportProgress)
  for (const [position, screenshot] of screenshots.entries()) {
    reportProgress(`Adding ${position + 1} of ${screenshots.length}: ${screenshot.label}${peopleSoFar(totals)}`)
    await uploadOne(screenshot, repository, totals)
  }
  return totals
}

async function screenshotsIn(files: File[], pdfReader: PdfReader, totals: UploadTotals, reportProgress: (message: string) => void): Promise<WaitingScreenshot[]> {
  const screenshots: WaitingScreenshot[] = []
  for (const file of files) {
    if (!isPdf(file)) {
      screenshots.push({ fileName: file.name, label: file.name, contents: async () => file })
      continue
    }
    reportProgress(`Opening ${file.name}`)
    try {
      screenshots.push(...pagesOf(file, await pdfReader.open(file)))
    } catch (error) {
      totals.rejected.push({ fileName: file.name, reason: `Couldn't open this PDF (${messageOf(error)})` })
    }
  }
  return screenshots
}

function pagesOf(pdf: File, opened: PdfDocument): WaitingScreenshot[] {
  const baseName = pdf.name.replace(/\.pdf$/i, '')
  return Array.from({ length: opened.pageCount }, (_, index) => ({
    fileName: `${baseName} - page ${index + 1}.png`,
    label: `${pdf.name} page ${index + 1}`,
    contents: () => opened.renderPage(index + 1),
  }))
}

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

async function uploadOne(screenshot: WaitingScreenshot, repository: ScanRepository, totals: UploadTotals): Promise<void> {
  let upload: AddScreenshotsRequest['files'][number]
  try {
    upload = { fileName: screenshot.fileName, dataBase64: toBase64(await (await screenshot.contents()).arrayBuffer()) }
  } catch (error) {
    return void totals.rejected.push({ fileName: screenshot.fileName, reason: `Couldn't draw this page (${messageOf(error)})` })
  }
  try {
    const result = await repository.addScreenshots([upload])
    totals.saved.push(...result.saved)
    totals.rejected.push(...result.rejected)
    totals.importedCount += result.importedCount
    totals.failedCount += result.failedCount
    totals.peopleInScan = Math.max(totals.peopleInScan, result.peopleInScan)
  } catch (error) {
    totals.rejected.push({ fileName: screenshot.fileName, reason: `Upload failed (${messageOf(error)})` })
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error'
}

function peopleSoFar(totals: UploadTotals): string {
  if (totals.importedCount === 0) return ''
  return ` · ${plural(totals.peopleInScan, 'person', 'people')} found so far`
}

function summarize(totals: UploadTotals): string {
  const added = `${plural(totals.saved.length, 'screenshot')} added${totals.rejected.length > 0 ? `, ${totals.rejected.length} skipped` : ''}.`
  const read = totals.importedCount + totals.failedCount > 0 ? ` ${totals.importedCount} read${totals.failedCount > 0 ? `, ${totals.failedCount} couldn't be read` : ''}.` : ''
  const people = totals.importedCount > 0 ? ` ${plural(totals.peopleInScan, 'person', 'people')} in this scan.` : ''
  return `${added}${read}${people}`
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  return btoa(binary)
}
