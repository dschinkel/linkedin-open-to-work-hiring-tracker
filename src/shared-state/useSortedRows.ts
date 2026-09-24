import { useState } from 'react'
import type { DataCell, DataColumn, DataRow, SortDirection } from '@/components/DataTable'

export interface SortedRows {
  columns: DataColumn[]
  rows: DataRow[]
  sortKey: string
  sortDirection: SortDirection
  sortBy: (key: string) => void
}

export interface Sort {
  key: string
  direction: SortDirection
}

export function useSortedRows(columns: DataColumn[], rows: DataRow[], initialSort: Sort): SortedRows {
  const [sort, setSort] = useState<Sort>(initialSort)

  function sortBy(key: string): void {
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }))
  }

  return {
    columns: columns.map((column) => ({ ...column, isSortable: true })),
    rows: sortRows(rows, sort),
    sortKey: sort.key,
    sortDirection: sort.direction,
    sortBy,
  }
}

export function sortRows(rows: DataRow[], sort: Sort): DataRow[] {
  const ascending = [...rows].sort((a, b) => compareCells(a.cells[sort.key], b.cells[sort.key]))
  return sort.direction === 'asc' ? ascending : ascending.reverse()
}

function compareCells(a: DataCell | undefined, b: DataCell | undefined): number {
  const first = a?.sortValue ?? a?.text ?? ''
  const second = b?.sortValue ?? b?.text ?? ''
  if (typeof first === 'number' && typeof second === 'number') return first - second
  return String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: 'base' })
}
