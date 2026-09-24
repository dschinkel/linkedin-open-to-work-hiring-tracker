import { useMutation } from '@tanstack/react-query'
import type { Audience } from '@contracts/api'
import { formatCount, formatLongDate } from '@/shared-formatting/formatMetric'
import { ApiError } from '@/shared-repositories/apiClient'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { browserListExporter } from './browserListExporter'
import type { ExportFormat, ExportTable, ListExporter } from './listExport'

/** What to export: the table, which list it is (none for a whole scan), and the date it describes. */
export interface ExportContents extends ExportTable {
  /** E.g. { slug: 'open-to-work', title: 'Open to Work' }; null for everyone in a scan. */
  list: { slug: string; title: string } | null
  date: string
}

export interface ExportFormatOption {
  value: ExportFormat
  label: string
}

export interface ExportListView {
  formats: ExportFormatOption[]
  exportAs: (format: ExportFormat) => void
  isExporting: boolean
  exportMessage: string
}

const formats: ExportFormatOption[] = [
  { value: 'xlsx', label: 'Spreadsheet (.xlsx)' },
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
]

const audienceNames: Record<Audience, string> = { followers: 'Followers', contacts: 'Connections' }

/**
 * Saves a list of people as a spreadsheet, PDF, or CSV, named after the audience, the list, and the date,
 * e.g. "followers-open-to-work-2026-09-23.xlsx" or, for a whole scan, "connections-2026-09-22.pdf".
 */
export function useExportList(contentsToExport: () => ExportContents | Promise<ExportContents>, exporter: ListExporter = browserListExporter): ExportListView {
  const { audience } = useTrackerEnvironment()
  const exporting = useMutation({
    mutationFn: async (format: ExportFormat) => {
      const { list, date, columns, rows } = await contentsToExport()
      const audienceName = audienceNames[audience]
      const fileName = `${[audienceName, list?.slug ?? '', date].filter(Boolean).join('-').toLowerCase()}.${format}`
      const title = [[audienceName, list?.title].filter(Boolean).join(' '), formatLongDate(date), peopleCount(rows.length)].join(' · ')
      await exporter.save({ format, fileName, title, columns, rows })
      return `Exported ${peopleCount(rows.length)} to ${fileName}.`
    },
  })

  return {
    formats,
    exportAs: (format) => exporting.mutate(format),
    isExporting: exporting.isPending,
    exportMessage: exporting.data ?? failureMessage(exporting.error),
  }
}

function peopleCount(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'person' : 'people'}`
}

function failureMessage(error: Error | null): string {
  if (!error) return ''
  if (error instanceof ApiError && error.status === 404) return 'There is no scan to export yet.'
  return `Export failed: ${error.message}`
}
