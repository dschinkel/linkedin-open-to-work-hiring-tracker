import type { DataColumn, DataRow } from '@/components/DataTable'

export type ExportFormat = 'xlsx' | 'pdf' | 'csv'

/** A list as it should appear in the file: column headings and one row of cell text per person. */
export interface ExportTable {
  columns: string[]
  rows: string[][]
}

/** A finished list, ready to be saved in the chosen format. */
export interface ListExport extends ExportTable {
  format: ExportFormat
  fileName: string
  title: string
}

/** Port: turns a list into a file and hands it to the user. */
export interface ListExporter {
  save: (listExport: ListExport) => Promise<void>
}

/** The table exactly as shown: the same columns, the same rows in the same order. */
export function exportTableOf(columns: DataColumn[], rows: DataRow[]): ExportTable {
  return {
    columns: columns.map((column) => column.label),
    rows: rows.map((row) => columns.map((column) => row.cells[column.key]?.text ?? '')),
  }
}

/** Today in the browser's time zone, as YYYY-MM-DD. */
export function localToday(now: Date = new Date()): string {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
}

/** The day of a moment (ISO timestamp) in the browser's time zone, as YYYY-MM-DD. */
export function localDateOf(timestamp: string): string {
  return localToday(new Date(timestamp))
}
