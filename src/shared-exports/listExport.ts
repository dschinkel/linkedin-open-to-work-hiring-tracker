import type { DataColumn, DataRow } from '@/components/DataTable'

export type ExportFormat = 'xlsx' | 'pdf' | 'csv'

export interface ExportTable {
  columns: string[]
  rows: string[][]
}

export interface ListExport extends ExportTable {
  format: ExportFormat
  fileName: string
  title: string
}

export interface ListExporter {
  save: (listExport: ListExport) => Promise<void>
}

export function exportTableOf(columns: DataColumn[], rows: DataRow[]): ExportTable {
  return {
    columns: columns.map((column) => column.label),
    rows: rows.map((row) => columns.map((column) => row.cells[column.key]?.text ?? '')),
  }
}

export function localToday(now: Date = new Date()): string {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
}

export function localDateOf(timestamp: string): string {
  return localToday(new Date(timestamp))
}
