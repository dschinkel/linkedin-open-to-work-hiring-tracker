import { ArrowDown, ArrowUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export interface DataColumn {
  key: string
  label: string
  isNumeric?: boolean
  isSortable?: boolean
}

export interface DataCell {
  text: string
  note?: string
  /** What the column sorts by when the shown text would sort wrongly (dates, counts). */
  sortValue?: string | number
}

export interface DataRow {
  id: string
  cells: Record<string, DataCell>
  isMuted?: boolean
}

interface DataTableProps {
  columns: DataColumn[]
  rows: DataRow[]
  sortKey?: string
  sortDirection?: SortDirection
  onSort?: (key: string) => void
  onRowClick?: (rowId: string) => void
}

/** Sticky-header table with optional sortable columns and clickable rows. */
export function DataTable({ columns, rows, sortKey, sortDirection, onSort, onRowClick }: DataTableProps) {
  return (
    <div className="max-h-128 overflow-auto border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={cn('text-muted-foreground', column.isNumeric && 'text-right')}>
                <HeaderLabel column={column} activeKey={sortKey} direction={sortDirection} onSort={onSort} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={onRowClick && (() => onRowClick(row.id))}
              className={cn(onRowClick && 'cursor-pointer', row.isMuted && 'text-muted-foreground')}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={cn(column.isNumeric && 'text-right tabular-nums')}>
                  {row.cells[column.key]?.text}
                  {row.cells[column.key]?.note && (
                    <Badge variant="outline" className="ml-2">
                      {row.cells[column.key].note}
                    </Badge>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface HeaderLabelProps {
  column: DataColumn
  activeKey?: string
  direction?: SortDirection
  onSort?: (key: string) => void
}

function HeaderLabel({ column, activeKey, direction, onSort }: HeaderLabelProps) {
  if (!column.isSortable || !onSort) return <>{column.label}</>
  const DirectionIcon = direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <button type="button" className="inline-flex items-center gap-1 hover:text-prompt" onClick={() => onSort(column.key)}>
      {column.label}
      {activeKey === column.key && <DirectionIcon className="size-3 text-prompt" />}
    </button>
  )
}
