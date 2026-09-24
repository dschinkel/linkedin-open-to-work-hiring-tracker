import { AsyncContent } from '@/components/AsyncContent'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { LabeledInput } from '@/components/LabeledInput'
import { SectionCard } from '@/components/SectionCard'
import { SwitchField } from '@/components/SwitchField'
import { ClearAllData } from './ClearAllData'
import { useEditSettings } from './useEditSettings'

export function EditSettings() {
  const form = useEditSettings()

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="mt-1 text-label text-muted-foreground">Stored locally in data/linkedin.sqlite.</p>
        </div>
        <span className="text-label text-muted-foreground" role="status">
          {form.saveMessage}
        </span>
      </div>
      <AsyncContent status={form.status} errorMessage={form.errorMessage}>
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Screenshots" description="Where screenshots arrive and get archived.">
            <div className="space-y-6">
              <LabeledInput id="inbox" label="Inbox folder" value={form.settings.inboxDirectory} onChange={form.changeInboxDirectory} />
              <LabeledInput id="archive" label="Archive folder" value={form.settings.archiveDirectory} onChange={form.changeArchiveDirectory} />
              <SwitchField
                id="automatic-processing"
                label="Auto-import from the inbox folder"
                description="When on, screenshots you save straight into the inbox folder above are picked up and read automatically. Dragging files onto the page works either way."
                checked={form.settings.automaticProcessing}
                onChange={form.changeAutomaticProcessing}
              />
              <ChoiceSelect id="after-analysis" label="After import" value={form.settings.afterAnalysis} options={form.afterAnalysisOptions} onChange={form.changeAfterAnalysis} />
              <ChoiceSelect id="retention" label="Keep archive for" value={form.settings.retention} options={form.retentionOptions} onChange={form.changeRetention} />
            </div>
          </SectionCard>
          <SectionCard title="Scan reminders" description="The dashboard nudges you when a scan is due.">
            <ChoiceSelect id="frequency" label="Remind me" value={form.settings.scanFrequency} options={form.frequencyOptions} onChange={form.changeScanFrequency} />
          </SectionCard>
        </div>
        <ClearAllData />
      </AsyncContent>
    </>
  )
}
