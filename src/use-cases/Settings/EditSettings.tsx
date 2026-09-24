import { Save } from 'lucide-react'
import { AsyncContent } from '@/components/AsyncContent'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { LabeledInput } from '@/components/LabeledInput'
import { SectionCard } from '@/components/SectionCard'
import { SwitchField } from '@/components/SwitchField'
import { Button } from '@/components/ui/button'
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{form.saveMessage}</span>
          <Button onClick={form.save} disabled={form.isSaveDisabled}>
            <Save />
            Save
          </Button>
        </div>
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
          <SectionCard title="Frame detection" description="How sure the app must be, from 0 to 1, that a photo does or doesn’t show the #OPENTOWORK or #HIRING frame. Photos scoring between the two numbers are marked unclear and left out of the percentages.">
            <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2">
                <LabeledInput id="open-threshold" label="Open to Work: yes above" type="number" step="0.01" value={form.thresholds.open} onChange={form.changeThreshold('open')} />
                <LabeledInput id="not-open-threshold" label="Open to Work: no below" type="number" step="0.01" value={form.thresholds.notOpen} onChange={form.changeThreshold('notOpen')} />
                <LabeledInput id="hiring-threshold" label="Hiring: yes above" type="number" step="0.01" value={form.thresholds.hiring} onChange={form.changeThreshold('hiring')} />
                <LabeledInput id="not-hiring-threshold" label="Hiring: no below" type="number" step="0.01" value={form.thresholds.notHiring} onChange={form.changeThreshold('notHiring')} />
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
