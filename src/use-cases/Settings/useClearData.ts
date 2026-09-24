import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Audience } from '@contracts/api'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { refreshEveryTracker } from '@/shared-repositories/trackerQueryClients'
import { type ClearDataRepository, clearDataRepositoryFor } from './ClearDataRepository'

export type ClearingScope = Audience | 'everything'

export interface ClearDataView {
  buttonLabel: string
  confirmTitle: string
  confirmDescription: string
  confirmLabel: string
  isConfirmOpen: boolean
  askToConfirm: () => void
  changeConfirmOpen: (open: boolean) => void
  confirmClear: () => void
  isClearing: boolean
  resultMessage: string
}

interface ClearingWording {
  buttonLabel: string
  confirmTitle: string
  confirmDescription: string
  confirmLabel: string
}

const audienceWording = (name: string, otherName: string): ClearingWording => ({
  buttonLabel: `Clear ${name} data`,
  confirmTitle: `Delete all ${name} data?`,
  confirmDescription: `This permanently deletes everything tracked for ${name}: every person, scan, and trend, every saved snapshot, and any screenshots still waiting in the ${name} inbox folder. ${name} settings go back to their defaults. ${otherName} data is not touched. It can't be undone.`,
  confirmLabel: `Delete ${name} data`,
})

const wordingFor: Record<ClearingScope, ClearingWording> = {
  followers: audienceWording('Followers', 'Connections'),
  contacts: audienceWording('Connections', 'Followers'),
  everything: {
    buttonLabel: 'Clear all data',
    confirmTitle: 'Delete all data?',
    confirmDescription:
      "This permanently deletes everything for both Followers and Connections: every person, scan, and trend, every saved snapshot, all settings, and any screenshots still waiting in either inbox folder. It can't be undone.",
    confirmLabel: 'Delete everything',
  },
}

export function useClearData(scope: ClearingScope, injectedRepository?: ClearDataRepository): ClearDataView {
  const environment = useTrackerEnvironment()
  const repository = injectedRepository ?? clearDataRepositoryFor(environment)
  const queryClient = useQueryClient()
  const [isConfirmOpen, changeConfirmOpen] = useState(false)
  const clearing = useMutation({
    mutationFn: () => (scope === 'everything' ? repository.clearEverything() : repository.clearAudience(scope)),
    onSettled: () => {
      changeConfirmOpen(false)
      void queryClient.invalidateQueries()
      refreshEveryTracker()
    },
  })

  return {
    ...wordingFor[scope],
    isConfirmOpen,
    askToConfirm: () => changeConfirmOpen(true),
    changeConfirmOpen,
    confirmClear: () => clearing.mutate(),
    isClearing: clearing.isPending,
    resultMessage: clearing.data?.message ?? clearing.error?.message ?? '',
  }
}
