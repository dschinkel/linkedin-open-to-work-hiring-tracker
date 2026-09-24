// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { Audience, ScanPeople, ScanPerson } from '@contracts/api'
import { ApiError } from '@/shared-repositories/apiClient'
import { insideTracker, recordingExporter } from '@/test-support/trackerFixtures'
import type { ListExporter } from '@/shared-exports/listExport'
import type { ScanRepository } from './ScanRepository'
import { useExportScanPeople } from './useExportScanPeople'

function scanPerson(overrides: Partial<ScanPerson> = {}): ScanPerson {
  return { personId: 'ann', displayName: 'Ann Brooks', headline: 'Staff Engineer at Acme', companyName: 'Acme', openToWork: 'OPEN', hiring: 'NOT_HIRING', ...overrides }
}

function scanPeople(people: ScanPerson[] = [scanPerson()]): ScanPeople {
  return { scanId: 'followers-2026-09-22', scanDate: '2026-09-22', people }
}

function peopleRepository(answer: () => Promise<ScanPeople> = async () => scanPeople()) {
  const scansAskedFor: string[] = []
  const repository = {
    people: async (scanId: string) => {
      scansAskedFor.push(scanId)
      return answer()
    },
  } as ScanRepository
  return { repository, scansAskedFor }
}

function onScanPage(audience: Audience = 'followers') {
  return insideTracker({ audience, path: `/${audience}/scans/followers-2026-09-22`, routePath: '/:audience/scans/:scanId' })
}

describe('exporting everyone in a scan', () => {
  it('asks for the people in the scan being viewed', async () => {
    const { repository, scansAskedFor } = peopleRepository()
    const { result } = renderHook(() => useExportScanPeople(undefined, repository, recordingExporter().exporter), { wrapper: onScanPage() })

    act(() => result.current.exportAs('xlsx'))

    await waitFor(() => expect(scansAskedFor).toEqual(['followers-2026-09-22']))
  })

  it('asks for the latest scan when told to export the latest', async () => {
    const { repository, scansAskedFor } = peopleRepository()
    const { result } = renderHook(() => useExportScanPeople('latest', repository, recordingExporter().exporter), { wrapper: insideTracker() })

    act(() => result.current.exportAs('pdf'))

    await waitFor(() => expect(scansAskedFor).toEqual(['latest']))
  })

  it('hands the exporter one row per person with their statuses in words and the scan date', async () => {
    const people = [scanPerson(), scanPerson({ personId: 'zoe', displayName: 'Zoe Adams', headline: null, companyName: null, openToWork: 'UNCERTAIN', hiring: 'HIRING' })]
    const { repository } = peopleRepository(async () => scanPeople(people))
    const { exporter, saved } = recordingExporter()
    const { result } = renderHook(() => useExportScanPeople(undefined, repository, exporter), { wrapper: onScanPage() })

    act(() => result.current.exportAs('xlsx'))

    await waitFor(() =>
      expect(saved[0].rows).toEqual([
        ['Ann Brooks', 'Staff Engineer at Acme', 'Acme', 'Open', 'Not hiring', '2026-09-22'],
        ['Zoe Adams', '', '', 'Unclear', 'Hiring', '2026-09-22'],
      ]),
    )
  })

  it('saves in the chosen format, named after the audience and scan date', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = renderHook(() => useExportScanPeople(undefined, peopleRepository().repository, exporter), { wrapper: onScanPage() })

    act(() => result.current.exportAs('pdf'))

    await waitFor(() => expect([saved[0].format, saved[0].fileName]).toEqual(['pdf', 'followers-2026-09-22.pdf']))
  })

  it('names a Connections export after Connections', async () => {
    const { exporter, saved } = recordingExporter()
    const { result } = renderHook(() => useExportScanPeople(undefined, peopleRepository().repository, exporter), { wrapper: onScanPage('contacts') })

    act(() => result.current.exportAs('xlsx'))

    await waitFor(() => expect(saved[0].fileName).toBe('connections-2026-09-22.xlsx'))
  })

  it('says how many people were exported and to which file', async () => {
    const { result } = renderHook(() => useExportScanPeople(undefined, peopleRepository().repository, recordingExporter().exporter), { wrapper: onScanPage() })

    act(() => result.current.exportAs('csv'))

    await waitFor(() => expect(result.current.exportMessage).toBe('Exported 1 person to followers-2026-09-22.csv.'))
  })

  it('says there is nothing to export before any scan exists', async () => {
    const { repository } = peopleRepository(async () => {
      throw new ApiError(404, 'GET /api/followers/scans/latest/people failed with 404')
    })
    const { result } = renderHook(() => useExportScanPeople('latest', repository, recordingExporter().exporter), { wrapper: insideTracker() })

    act(() => result.current.exportAs('xlsx'))

    await waitFor(() => expect(result.current.exportMessage).toBe('There is no scan to export yet.'))
  })

  it('explains why the file could not be made', async () => {
    const failingExporter: ListExporter = {
      save: async () => {
        throw new Error('out of memory')
      },
    }
    const { result } = renderHook(() => useExportScanPeople(undefined, peopleRepository().repository, failingExporter), { wrapper: onScanPage() })

    act(() => result.current.exportAs('pdf'))

    await waitFor(() => expect(result.current.exportMessage).toBe('Export failed: out of memory'))
  })
})
