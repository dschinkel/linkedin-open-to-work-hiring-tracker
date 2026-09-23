import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ChangeEvent, type DragEvent, useState } from 'react'
import type { AddScreenshotsRequest, AddScreenshotsResult } from '@contracts/api'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
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

const acceptedTypes = 'image/png,image/jpeg,image/webp'

/**
 * Drag-and-drop (or pick) screenshots straight into the inbox. Files go up one at a time, so a
 * big batch of full-page captures never becomes one huge request, and one bad file can't sink the rest.
 */
export function useAddScreenshots(injectedRepository?: ScanRepository): AddScreenshotsView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? scanRepositoryFor(api)
  const queryClient = useQueryClient()
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const upload = useMutation({
    mutationFn: (files: File[]) => uploadOneByOne(files, repository, setProgressMessage),
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

async function uploadOneByOne(files: File[], repository: ScanRepository, reportProgress: (message: string) => void): Promise<UploadTotals> {
  const totals: UploadTotals = { saved: [], rejected: [], importedCount: 0, failedCount: 0, peopleInScan: 0 }
  for (const [position, file] of files.entries()) {
    reportProgress(`Adding ${position + 1} of ${files.length}: ${file.name}`)
    await uploadOne(file, repository, totals)
  }
  return totals
}

async function uploadOne(file: File, repository: ScanRepository, totals: UploadTotals): Promise<void> {
  try {
    const result = await repository.addScreenshots([await toUpload(file)])
    totals.saved.push(...result.saved)
    totals.rejected.push(...result.rejected)
    totals.importedCount += result.importedCount
    totals.failedCount += result.failedCount
    totals.peopleInScan = Math.max(totals.peopleInScan, result.peopleInScan)
  } catch (error) {
    totals.rejected.push({ fileName: file.name, reason: `Upload failed (${error instanceof Error ? error.message : 'unknown error'})` })
  }
}

/** One line for the whole batch, e.g. "23 screenshots added. 21 read, 2 couldn't be read. 480 people in this scan." */
function summarize(totals: UploadTotals): string {
  const added = `${plural(totals.saved.length, 'screenshot')} added${totals.rejected.length > 0 ? `, ${totals.rejected.length} skipped` : ''}.`
  const read = totals.importedCount + totals.failedCount > 0 ? ` ${totals.importedCount} read${totals.failedCount > 0 ? `, ${totals.failedCount} couldn't be read` : ''}.` : ''
  const people = totals.importedCount > 0 ? ` ${plural(totals.peopleInScan, 'person', 'people')} in this scan.` : ''
  return `${added}${read}${people}`
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

async function toUpload(file: File): Promise<AddScreenshotsRequest['files'][number]> {
  return { fileName: file.name, dataBase64: toBase64(await file.arrayBuffer()) }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += chunkSize) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  return btoa(binary)
}
