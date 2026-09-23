import { AsyncContent } from '@/components/AsyncContent'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { OptionPicker } from '@/components/OptionPicker'
import { SectionCard } from '@/components/SectionCard'
import { useViewScanHistory } from './useViewScanHistory'

export function ViewScanHistory() {
  const history = useViewScanHistory()

  return (
    <SectionCard
      title="Daily history"
      description="One row per scan. Click a row for scan detail and screenshot results."
      action={<OptionPicker label="Time window" value={history.timeWindow} options={history.windowOptions} onChange={history.chooseTimeWindow} />}
    >
      <AsyncContent status={history.status} errorMessage={history.errorMessage}>
        <div className="space-y-3">
          <OptionPicker label="Columns" value={history.columnSet} options={history.columnSetOptions} onChange={history.chooseColumnSet} />
          {history.hasScans && (
            <DataTable
              columns={history.columns}
              rows={history.rows}
              sortKey={history.sortKey}
              sortDirection={history.sortDirection}
              onSort={history.sortBy}
              onRowClick={history.openScan}
            />
          )}
          {history.showNoScans && <EmptyState title="No scans in this window" />}
        </div>
      </AsyncContent>
    </SectionCard>
  )
}
