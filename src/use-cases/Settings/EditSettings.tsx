import { Save } from 'lucide-react'
import { AsyncContent } from '@/components/AsyncContent'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { LabeledInput } from '@/components/LabeledInput'
import { SectionCard } from '@/components/SectionCard'
import { SwitchField } from '@/components/SwitchField'
import { Button } from '@/components/ui/button'
import { useEditSettings } from './useEditSettings'

export function EditSettings() {
  const form = useEditSettings()

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Everything stays local, in data/linkedin.sqlite.</p>
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
          <SectionCard title="Screenshots" description="Where screenshots are dropped and where originals are archived by date">
            <div className="space-y-4">
              <LabeledInput id="inbox" label="Screenshot inbox directory" value={form.settings.inboxDirectory} onChange={form.changeInboxDirectory} />
              <LabeledInput id="archive" label="Archive directory" value={form.settings.archiveDirectory} onChange={form.changeArchiveDirectory} />
              <SwitchField
                id="automatic-processing"
                label="Watch the inbox folders"
                description="Also import screenshots copied straight into the folders. Dropped screenshots are always imported."
                checked={form.settings.automaticProcessing}
                onChange={form.changeAutomaticProcessing}
              />
              <ChoiceSelect id="after-analysis" label="After a screenshot is imported" value={form.settings.afterAnalysis} options={form.afterAnalysisOptions} onChange={form.changeAfterAnalysis} />
              <ChoiceSelect id="retention" label="Archive retention" value={form.settings.retention} options={form.retentionOptions} onChange={form.changeRetention} />
            </div>
          </SectionCard>
          <SectionCard title="Frame detection" description="How sure a reading must be to count. Anything less sure is marked Uncertain.">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <LabeledInput id="open-threshold" label="Open to Work: match above" type="number" step="0.01" value={form.thresholds.open} onChange={form.changeThreshold('open')} />
                <LabeledInput id="not-open-threshold" label="Open to Work: no match below" type="number" step="0.01" value={form.thresholds.notOpen} onChange={form.changeThreshold('notOpen')} />
                <LabeledInput id="hiring-threshold" label="Hiring: match above" type="number" step="0.01" value={form.thresholds.hiring} onChange={form.changeThreshold('hiring')} />
                <LabeledInput id="not-hiring-threshold" label="Hiring: no match below" type="number" step="0.01" value={form.thresholds.notHiring} onChange={form.changeThreshold('notHiring')} />
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Scan reminders" description="The dashboard reminds you when a new scan is due">
            <ChoiceSelect id="frequency" label="Scan frequency" value={form.settings.scanFrequency} options={form.frequencyOptions} onChange={form.changeScanFrequency} />
          </SectionCard>
        </div>
      </AsyncContent>
    </>
  )
}
