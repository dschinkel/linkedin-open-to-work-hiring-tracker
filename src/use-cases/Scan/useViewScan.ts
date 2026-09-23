import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import type { ScanDetail, ScanSummary, ScreenshotResult } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import type { DefinitionRow } from '@/components/DefinitionList'
import {
  formatCount,
  formatLongDate,
  formatPercent,
  formatPercentagePoints,
  formatRatio,
  formatSignedCount,
} from '@/shared-formatting/formatMetric'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { describeScanQuality, type QualitySection } from './describeScanQuality'
import { type ScanRepository, scanRepository } from './ScanRepository'
import type { ScreenshotRow } from './ScreenshotResults'

export interface ScanView {
  status: LoadStatus
  errorMessage: string
  title: string
  scanRows: DefinitionRow[]
  openToWorkRows: DefinitionRow[]
  hiringRows: DefinitionRow[]
  qualitySections: QualitySection[]
  screenshots: ScreenshotRow[]
  screenshotSummary: string
  reprocess: () => void
  isReprocessing: boolean
  reprocessMessage: string
}

export function useViewScan(repository: ScanRepository = scanRepository): ScanView {
  const { scanId = '' } = useParams()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['scan', scanId], queryFn: () => repository.detail(scanId) })
  const reprocessing = useMutation({
    mutationFn: () => repository.reprocess(scanId),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  return {
    ...loadStatusOf(query),
    ...describeDetail(query.data),
    reprocess: () => reprocessing.mutate(),
    isReprocessing: reprocessing.isPending,
    reprocessMessage: reprocessing.data?.message ?? reprocessing.error?.message ?? '',
  }
}

type DetailFields = Pick<ScanView, 'title' | 'scanRows' | 'openToWorkRows' | 'hiringRows' | 'qualitySections' | 'screenshots' | 'screenshotSummary'>

function describeDetail(detail: ScanDetail | undefined): DetailFields {
  if (!detail) return { title: '', scanRows: [], openToWorkRows: [], hiringRows: [], qualitySections: [], screenshots: [], screenshotSummary: '' }
  return {
    title: formatLongDate(detail.summary.scanDate),
    scanRows: describeScan(detail.summary),
    openToWorkRows: describeOpenToWork(detail.summary),
    hiringRows: describeHiring(detail.summary),
    qualitySections: describeScanQuality(detail.quality),
    screenshots: detail.screenshots.map(describeScreenshot),
    screenshotSummary: `${detail.screenshots.length} screenshots · ${formatCount(detail.summary.peopleCount)} unique people · ${detail.summary.duplicateCount} duplicates removed`,
  }
}

function describeScan(summary: ScanSummary): DefinitionRow[] {
  return [
    { label: 'Screenshots', value: formatCount(summary.screenshotCount) },
    { label: 'Unique people', value: formatCount(summary.peopleCount) },
    { label: 'Duplicates removed', value: formatCount(summary.duplicateCount) },
  ]
}

function describeOpenToWork({ openToWork }: ScanSummary): DefinitionRow[] {
  return [
    { label: 'Open', value: formatCount(openToWork.open) },
    { label: 'Not open', value: formatCount(openToWork.notOpen) },
    { label: 'Uncertain', value: formatCount(openToWork.uncertain) },
    { label: 'Open rate', value: formatPercent(openToWork.rate) },
    { label: `Matched rate (${openToWork.matchedCount} matched)`, value: formatPercent(openToWork.matchedRate) },
    { label: '7-day change', value: formatPercentagePoints(openToWork.sevenDayChangePp) },
    { label: 'Newly open', value: formatSignedCount(openToWork.added) },
    { label: 'Removed open', value: formatSignedCount(-openToWork.removed) },
    { label: 'Net', value: formatSignedCount(openToWork.net) },
    { label: 'Entry rate', value: formatPercent(openToWork.entryRate) },
    { label: 'Removal rate', value: formatPercent(openToWork.removalRate) },
    { label: 'Entry / exit ratio', value: formatRatio(openToWork.entryExitRatio) },
  ]
}

function describeHiring({ hiring }: ScanSummary): DefinitionRow[] {
  return [
    { label: 'Hiring', value: formatCount(hiring.hiring) },
    { label: 'Not hiring', value: formatCount(hiring.notHiring) },
    { label: 'Uncertain', value: formatCount(hiring.uncertain) },
    { label: 'Hiring rate', value: formatPercent(hiring.rate) },
    { label: 'Newly hiring', value: formatSignedCount(hiring.added) },
    { label: 'Removed hiring', value: formatSignedCount(-hiring.removed) },
    { label: 'Net hiring', value: formatSignedCount(hiring.net) },
    { label: 'Companies identified', value: formatCount(hiring.companyCount) },
  ]
}

function describeScreenshot(screenshot: ScreenshotResult): ScreenshotRow {
  const people = `${screenshot.peopleDetected} people`
  return {
    fileName: screenshot.fileName,
    outcome: screenshot.outcome,
    result: screenshot.uncertainCount > 0 ? `${people} / ${screenshot.uncertainCount} uncertain` : people,
  }
}
