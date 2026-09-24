import { useParams } from 'react-router-dom'
import type { ScanPeople, ScanPerson } from '@contracts/api'
import type { ListExporter } from '@/shared-exports/listExport'
import { type ExportContents, type ExportListView, useExportList } from '@/shared-exports/useExportList'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { type ScanRepository, scanRepositoryFor } from './ScanRepository'

const openToWorkLabels: Record<ScanPerson['openToWork'], string> = { OPEN: 'Open', NOT_OPEN: 'Not open', UNCERTAIN: 'Unclear' }
const hiringLabels: Record<ScanPerson['hiring'], string> = { HIRING: 'Hiring', NOT_HIRING: 'Not hiring', UNCERTAIN: 'Unclear' }
const columns = ['Name', 'Headline', 'Company', 'Open to Work', 'Hiring', 'Scan date']

export function useExportScanPeople(scanId?: string, injectedRepository?: ScanRepository, exporter?: ListExporter): ExportListView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? scanRepositoryFor(api)
  const params = useParams()
  const wantedScanId = scanId ?? params.scanId ?? ''
  return useExportList(async () => toContents(await repository.people(wantedScanId)), exporter)
}

function toContents({ scanDate, people }: ScanPeople): ExportContents {
  return {
    list: null,
    date: scanDate,
    columns,
    rows: people.map((person) => [
      person.displayName,
      person.headline ?? '',
      person.companyName ?? '',
      openToWorkLabels[person.openToWork],
      hiringLabels[person.hiring],
      scanDate,
    ]),
  }
}
