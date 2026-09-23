import { AsyncContent } from '@/components/AsyncContent'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { LabeledInput } from '@/components/LabeledInput'
import { SectionCard } from '@/components/SectionCard'
import { useFindDepartedPeople } from './useFindDepartedPeople'

export function FindDepartedPeople() {
  const departed = useFindDepartedPeople()

  return (
    <>
      <div>
        <h2 className="page-title">{departed.title}</h2>
        <p className="mt-1 max-w-3xl text-label text-muted-foreground">{departed.explanation}</p>
        <p className="mt-2 max-w-3xl border-l-2 border-prompt pl-3 text-label text-muted-foreground">{departed.caveat}</p>
      </div>
      <SectionCard title={departed.resultSummary}>
        <div className="mb-4 max-w-xs">
          <LabeledInput id="departed-search" label="Name" placeholder="Search by name" value={departed.search} onChange={departed.searchByName} />
        </div>
        <AsyncContent status={departed.status} errorMessage={departed.errorMessage}>
          {departed.hasPeople && <DataTable columns={departed.columns} rows={departed.rows} sortKey={departed.sortKey} sortDirection={departed.sortDirection} onSort={departed.sortBy} />}
          {departed.showNobodyLeft && <EmptyState title="Nobody has gone missing from your recent scans." />}
        </AsyncContent>
      </SectionCard>
    </>
  )
}
