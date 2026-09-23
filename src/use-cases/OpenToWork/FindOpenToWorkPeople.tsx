import { AsyncContent } from '@/components/AsyncContent'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { LabeledInput } from '@/components/LabeledInput'
import { SectionCard } from '@/components/SectionCard'
import { useFindOpenToWorkPeople } from './useFindOpenToWorkPeople'

export function FindOpenToWorkPeople() {
  const open = useFindOpenToWorkPeople()

  return (
    <>
      <div>
        <h2 className="page-title">Open to Work</h2>
        <p className="mt-1 max-w-3xl text-label text-muted-foreground">
          People whose photo shows the public #OPENTOWORK frame. Greyed rows weren't in the latest scan, so the frame isn't confirmed for today.
        </p>
      </div>
      <SectionCard title={open.resultSummary}>
        <div className="mb-4 max-w-xs">
          <LabeledInput id="open-search" label="Search" placeholder="Name or title" value={open.search} onChange={open.searchByNameOrTitle} />
        </div>
        <AsyncContent status={open.status} errorMessage={open.errorMessage}>
          {open.hasPeople && <DataTable columns={open.columns} rows={open.rows} sortKey={open.sortKey} sortDirection={open.sortDirection} onSort={open.sortBy} />}
          {open.showNobodyOpen && <EmptyState title="Nobody is currently showing #OPENTOWORK." />}
        </AsyncContent>
      </SectionCard>
    </>
  )
}
