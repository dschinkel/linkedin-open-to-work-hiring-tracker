import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { settingsSchema, type Settings } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { PickerOption } from '@/components/OptionPicker'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SettingsRepository, settingsRepositoryFor } from './SettingsRepository'

export interface SettingsView {
  status: LoadStatus
  errorMessage: string
  settings: Settings
  frequencyOptions: PickerOption<Settings['scanFrequency']>[]
  retentionOptions: PickerOption<Settings['retention']>[]
  afterAnalysisOptions: PickerOption<Settings['afterAnalysis']>[]
  changeInboxDirectory: (value: string) => void
  changeArchiveDirectory: (value: string) => void
  changeAutomaticProcessing: (value: boolean) => void
  changeScanFrequency: (value: Settings['scanFrequency']) => void
  changeRetention: (value: Settings['retention']) => void
  changeAfterAnalysis: (value: Settings['afterAnalysis']) => void
  isSaving: boolean
  saveMessage: string
}

const frequencyOptions: PickerOption<Settings['scanFrequency']>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

const afterAnalysisOptions: PickerOption<Settings['afterAnalysis']>[] = [
  { value: 'delete', label: 'Delete them' },
  { value: 'keep', label: 'Keep an archived copy' },
]

const retentionOptions: PickerOption<Settings['retention']>[] = [
  { value: 'forever', label: 'Forever' },
  { value: '1y', label: '1 year' },
  { value: '90d', label: '90 days' },
]

const placeholderSettings: Settings = {
  inboxDirectory: '',
  archiveDirectory: '',
  automaticProcessing: true,
  openToWorkThresholds: { open: 0.9, notOpen: 0.1 },
  hiringThresholds: { hiring: 0.9, notHiring: 0.1 },
  visionFallback: false,
  scanFrequency: 'daily',
  retention: 'forever',
  afterAnalysis: 'delete',
}

export const autosaveDelayMilliseconds = 500

export function useEditSettings(injectedRepository?: SettingsRepository): SettingsView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? settingsRepositoryFor(api)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['settings'], queryFn: repository.load })
  const [draft, setDraft] = useState<Settings | null>(null)
  const [validationMessage, setValidationMessage] = useState('')
  const saving = useMutation({
    mutationFn: repository.save,
    onSuccess: (saved, sent) => {
      queryClient.setQueryData(['settings'], saved)
      setDraft((current) => (current !== null && JSON.stringify(current) === JSON.stringify(sent) ? null : current))
    },
  })
  const settings = draft ?? query.data ?? placeholderSettings

  useEffect(() => {
    if (draft === null) return undefined
    const timer = setTimeout(() => saveDraft(draft), autosaveDelayMilliseconds)
    return () => clearTimeout(timer)
  }, [draft])

  function change(patch: Partial<Settings>): void {
    setDraft({ ...settings, ...patch })
    setValidationMessage('')
    saving.reset()
  }

  function saveDraft(edited: Settings): void {
    const parsed = settingsSchema.safeParse(edited)
    if (!parsed.success) return setValidationMessage('Not saved: folders cannot be empty.')
    saving.mutate(parsed.data)
  }

  return {
    ...loadStatusOf(query),
    settings,
    frequencyOptions,
    retentionOptions,
    afterAnalysisOptions,
    changeInboxDirectory: (inboxDirectory) => change({ inboxDirectory }),
    changeArchiveDirectory: (archiveDirectory) => change({ archiveDirectory }),
    changeAutomaticProcessing: (automaticProcessing) => change({ automaticProcessing }),
    changeScanFrequency: (scanFrequency) => change({ scanFrequency }),
    changeRetention: (retention) => change({ retention }),
    changeAfterAnalysis: (afterAnalysis) => change({ afterAnalysis }),
    isSaving: saving.isPending,
    saveMessage: validationMessage || saveOutcome({ isPending: saving.isPending || (draft !== null && !saving.isError), isSaved: saving.isSuccess, error: saving.error }),
  }
}

function saveOutcome({ isPending, isSaved, error }: { isPending: boolean; isSaved: boolean; error: Error | null }): string {
  if (isPending) return 'Saving…'
  if (error) return `Could not save: ${error.message}`
  return isSaved ? 'All changes saved.' : 'Changes save automatically.'
}
