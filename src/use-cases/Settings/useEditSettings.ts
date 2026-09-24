import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { settingsSchema, type Settings } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { PickerOption } from '@/components/OptionPicker'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SettingsRepository, settingsRepositoryFor } from './SettingsRepository'

type Threshold = 'open' | 'notOpen' | 'hiring' | 'notHiring'

export interface SettingsView {
  status: LoadStatus
  errorMessage: string
  settings: Settings
  thresholds: Record<Threshold, string>
  frequencyOptions: PickerOption<Settings['scanFrequency']>[]
  retentionOptions: PickerOption<Settings['retention']>[]
  afterAnalysisOptions: PickerOption<Settings['afterAnalysis']>[]
  changeInboxDirectory: (value: string) => void
  changeArchiveDirectory: (value: string) => void
  changeAutomaticProcessing: (value: boolean) => void
  changeThreshold: (threshold: Threshold) => (value: string) => void
  changeScanFrequency: (value: Settings['scanFrequency']) => void
  changeRetention: (value: Settings['retention']) => void
  changeAfterAnalysis: (value: Settings['afterAnalysis']) => void
  save: () => void
  isSaving: boolean
  isSaveDisabled: boolean
  saveMessage: string
  /** Whether the form holds edits that aren't saved yet, said plainly next to the Save button. */
  saveStatus: string
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

/** Edits a local draft of settings and saves it only when it passes the settings contract. */
export function useEditSettings(injectedRepository?: SettingsRepository): SettingsView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? settingsRepositoryFor(api)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['settings'], queryFn: repository.load })
  const [draft, setDraft] = useState<Settings | null>(null)
  const [validationMessage, setValidationMessage] = useState('')
  const saving = useMutation({
    mutationFn: repository.save,
    onSuccess: (saved) => {
      queryClient.setQueryData(['settings'], saved)
      setDraft(null)
    },
  })
  const settings = draft ?? query.data ?? placeholderSettings

  function change(patch: Partial<Settings>): void {
    setDraft({ ...settings, ...patch })
    setValidationMessage('')
  }

  function changeThreshold(threshold: Threshold) {
    return (value: string) => change(withThreshold(settings, threshold, Number(value)))
  }

  function save(): void {
    const parsed = settingsSchema.safeParse(settings)
    if (!parsed.success) return setValidationMessage('Thresholds must be between 0 and 1 and directories cannot be empty.')
    saving.mutate(parsed.data)
  }

  return {
    ...loadStatusOf(query),
    settings,
    thresholds: thresholdTexts(settings),
    frequencyOptions,
    retentionOptions,
    afterAnalysisOptions,
    changeInboxDirectory: (inboxDirectory) => change({ inboxDirectory }),
    changeArchiveDirectory: (archiveDirectory) => change({ archiveDirectory }),
    changeAutomaticProcessing: (automaticProcessing) => change({ automaticProcessing }),
    changeThreshold,
    changeScanFrequency: (scanFrequency) => change({ scanFrequency }),
    changeRetention: (retention) => change({ retention }),
    changeAfterAnalysis: (afterAnalysis) => change({ afterAnalysis }),
    save,
    isSaving: saving.isPending,
    isSaveDisabled: draft === null || saving.isPending,
    saveMessage: validationMessage || saveOutcome(saving.isSuccess, saving.error),
    saveStatus: draft === null ? 'No unsaved changes' : 'You have unsaved changes',
  }
}

function withThreshold(settings: Settings, threshold: Threshold, value: number): Partial<Settings> {
  if (threshold === 'open' || threshold === 'notOpen') return { openToWorkThresholds: { ...settings.openToWorkThresholds, [threshold]: value } }
  return { hiringThresholds: { ...settings.hiringThresholds, [threshold]: value } }
}

function thresholdTexts(settings: Settings): Record<Threshold, string> {
  return {
    open: String(settings.openToWorkThresholds.open),
    notOpen: String(settings.openToWorkThresholds.notOpen),
    hiring: String(settings.hiringThresholds.hiring),
    notHiring: String(settings.hiringThresholds.notHiring),
  }
}

function saveOutcome(isSaved: boolean, error: Error | null): string {
  if (error) return `Could not save: ${error.message}`
  return isSaved ? 'Settings saved.' : ''
}
