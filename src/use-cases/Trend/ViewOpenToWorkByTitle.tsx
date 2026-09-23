import type { TimeWindow } from '@contracts/api'
import { AsyncContent } from '@/components/AsyncContent'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { useViewOpenToWorkByTitle } from './useViewOpenToWorkByTitle'

export function ViewOpenToWorkByTitle({ timeWindow }: { timeWindow: TimeWindow }) {
  const byTitle = useViewOpenToWorkByTitle(timeWindow)

  return (
    <SectionCard title="Open to Work by job title" description="Share of people with each title showing #OPEN_TO_WORK, and how it's changing (open / people seen).">
      <AsyncContent status={byTitle.status} errorMessage={byTitle.errorMessage}>
        <p className="mb-3 border border-dashed px-3 py-2 text-label text-muted-foreground">{byTitle.coverageNote}</p>
        {byTitle.hasTitles && <DataTable columns={byTitle.columns} rows={byTitle.rows} />}
        {byTitle.showNoTitles && <EmptyState title="No job titles could be read yet." />}
      </AsyncContent>
    </SectionCard>
  )
}
