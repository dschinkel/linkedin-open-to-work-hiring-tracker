import { AsyncContent } from '@/components/AsyncContent'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { ExportMenu } from '@/components/ExportMenu'
import { LabeledInput } from '@/components/LabeledInput'
import { SectionCard } from '@/components/SectionCard'
import { KeepSnapshots } from '@/use-cases/Snapshots/KeepSnapshots'
import { SnapshotNotice } from '@/use-cases/Snapshots/SnapshotNotice'
import { useFindOpenToWorkPeople } from './useFindOpenToWorkPeople'

export function FindOpenToWorkPeople() {
  const open = useFindOpenToWorkPeople()

  return (
    <>
      <div>
        <h2 className="page-title">Open to Work</h2>
        <p className="mt-1 max-w-3xl text-label text-muted-foreground">People whose photo shows the public #OPENTOWORK frame.</p>
        <p className="mt-1 max-w-3xl text-label text-muted-foreground">Greyed rows were not in the latest scan, so the frame is not confirmed today.</p>
      </div>
      <SectionCard title={open.resultSummary}>
        {open.snapshots.isViewingSnapshot && <SnapshotNotice notice={open.snapshots.viewingNotice} detail={open.snapshotDetail} onBack={open.snapshots.backToCurrentList} />}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-xs">
            <LabeledInput id="open-search" label="Search" placeholder="Name or title" value={open.search} onChange={open.searchByNameOrTitle} />
          </div>
          <ExportMenu exporting={open.exporting} />
        </div>
        <AsyncContent status={open.status} errorMessage={open.errorMessage}>
          {open.hasPeople && <DataTable columns={open.columns} rows={open.rows} sortKey={open.sortKey} sortDirection={open.sortDirection} onSort={open.sortBy} />}
          {open.showNobodyOpen && <EmptyState title="Nobody is currently showing #OPENTOWORK." />}
        </AsyncContent>
      </SectionCard>
      <KeepSnapshots snapshots={open.snapshots} inputId="open-snapshot-name" />
    </>
  )
}
