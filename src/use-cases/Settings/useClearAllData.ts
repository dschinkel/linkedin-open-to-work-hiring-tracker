import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { type SettingsRepository, settingsRepositoryFor } from './SettingsRepository'

export interface ClearAllDataView {
  isConfirmOpen: boolean
  askToConfirm: () => void
  changeConfirmOpen: (open: boolean) => void
  confirmClear: () => void
  isClearing: boolean
  resultMessage: string
}

/** Wipes everything, but only after the user confirms in a dialog. Every page then reloads its (empty) data. */
export function useClearAllData(injectedRepository?: SettingsRepository): ClearAllDataView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? settingsRepositoryFor(api)
  const queryClient = useQueryClient()
  const [isConfirmOpen, changeConfirmOpen] = useState(false)
  const clearing = useMutation({
    mutationFn: repository.clearAllData,
    onSettled: () => {
      changeConfirmOpen(false)
      void queryClient.invalidateQueries()
    },
  })

  return {
    isConfirmOpen,
    askToConfirm: () => changeConfirmOpen(true),
    changeConfirmOpen,
    confirmClear: () => clearing.mutate(),
    isClearing: clearing.isPending,
    resultMessage: clearing.data?.message ?? clearing.error?.message ?? '',
  }
}
