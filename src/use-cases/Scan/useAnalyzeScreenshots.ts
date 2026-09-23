import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ScanRepository, scanRepository } from './ScanRepository'

export interface AnalyzeScreenshotsView {
  analyze: () => void
  isAnalyzing: boolean
  resultMessage: string
}

/** Manual trigger so the folder watcher is not the only way to ingest screenshots. */
export function useAnalyzeScreenshots(repository: ScanRepository = scanRepository): AnalyzeScreenshotsView {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: repository.analyzeNewScreenshots,
    onSuccess: () => queryClient.invalidateQueries(),
  })

  return {
    analyze: () => mutation.mutate(),
    isAnalyzing: mutation.isPending,
    resultMessage: mutation.data?.message ?? mutation.error?.message ?? '',
  }
}
