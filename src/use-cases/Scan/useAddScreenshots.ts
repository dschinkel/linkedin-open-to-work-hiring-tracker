import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ChangeEvent, type DragEvent, useState } from 'react'
import type { AddScreenshotsRequest } from '@contracts/api'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { type ScanRepository, scanRepositoryFor } from './ScanRepository'

export interface AddScreenshotsView {
  isDraggingOver: boolean
  isUploading: boolean
  resultMessage: string
  skippedFiles: string[]
  acceptedTypes: string
  handleDragOver: (event: DragEvent<HTMLElement>) => void
  handleDragLeave: () => void
  handleDrop: (event: DragEvent<HTMLElement>) => void
  handleFilesChosen: (event: ChangeEvent<HTMLInputElement>) => void
}

const acceptedTypes = 'image/png,image/jpeg,image/webp'

/** Drag-and-drop (or pick) screenshots straight into the inbox instead of copying them into the folder by hand. */
export function useAddScreenshots(injectedRepository?: ScanRepository): AddScreenshotsView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? scanRepositoryFor(api)
  const queryClient = useQueryClient()
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const upload = useMutation({
    mutationFn: async (files: File[]) => repository.addScreenshots(await Promise.all(files.map(toUpload))),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  function addFiles(files: FileList | null): void {
    if (files && files.length > 0) upload.mutate([...files])
  }

  return {
    isDraggingOver,
    isUploading: upload.isPending,
    resultMessage: upload.data?.message ?? upload.error?.message ?? '',
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
