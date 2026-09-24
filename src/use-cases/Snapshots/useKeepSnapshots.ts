import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { HiringPeopleQuery, Snapshot, SnapshotKind, SnapshotSummary } from '@contracts/api'
import type { LoadStatus } from '@/components/AsyncContent'
import { type ExportTable, type ListExporter, localDateOf } from '@/shared-exports/listExport'
import { type ExportContents, type ExportListView, useExportList } from '@/shared-exports/useExportList'
import { formatDateTime, formatDayOf, formatPeople } from '@/shared-formatting/formatMetric'
import { useTrackerEnvironment } from '@/shared-repositories/trackerEnvironment'
import { loadStatusOf } from '@/shared-state/loadStatus'
import { type SnapshotRepository, snapshotRepositoryFor } from './SnapshotRepository'

export interface SnapshotSource {
  kind: SnapshotKind
  list: { slug: string; title: string }
  filters?: HiringPeopleQuery
  tableOf: (snapshot: Snapshot) => ExportTable
}

export interface SavedSnapshotView {
  id: string
  name: string
  savedAt: string
  peopleCount: string
  isViewed: boolean
  load: () => void
  askToDelete: () => void
  exporting: ExportListView
}

export interface DeleteSnapshotView {
  isConfirmOpen: boolean
  snapshotName: string
  changeConfirmOpen: (open: boolean) => void
  confirmDelete: () => void
  isDeleting: boolean
}

export type SnapshotExportName = Pick<ExportContents, 'list' | 'date'>

export interface KeepSnapshotsView {
  status: LoadStatus
  errorMessage: string
  snapshots: SavedSnapshotView[]
  hasSnapshots: boolean
  showNoSnapshots: boolean
  snapshotName: string
  nameSnapshot: (name: string) => void
  saveSnapshot: () => void
  canSave: boolean
  isSaving: boolean
  message: string
  isViewingSnapshot: boolean
  viewedSnapshot: Snapshot | null
  viewedStatus: { status: LoadStatus; errorMessage: string }
  viewingNotice: string
  backToCurrentList: () => void
  viewedExportName: SnapshotExportName | null
  deleting: DeleteSnapshotView
}

export function useKeepSnapshots(source: SnapshotSource, injectedRepository?: SnapshotRepository, exporter?: ListExporter): KeepSnapshotsView {
  const { api } = useTrackerEnvironment()
  const repository = injectedRepository ?? snapshotRepositoryFor(api)
  const queryClient = useQueryClient()
  const listKey = ['snapshots', source.kind]
  const [snapshotName, nameSnapshot] = useState('')
  const [viewedId, setViewedId] = useState<string | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<SnapshotSummary | null>(null)
  const [exportedId, setExportedId] = useState<string | null>(null)
  const exportTarget = useRef<string | null>(null)
  const loadSnapshot = (snapshotId: string) => ({ queryKey: ['snapshot', snapshotId], queryFn: () => repository.load(snapshotId) })

  const saved = useQuery({ queryKey: listKey, queryFn: () => repository.list(source.kind) })
  const viewed = useQuery({ ...loadSnapshot(viewedId ?? ''), enabled: viewedId !== null })
  const saving = useMutation({
    mutationFn: () => repository.save(source.kind, { name: snapshotName.trim(), ...(source.kind === 'hiring' ? { filters: source.filters } : {}) }),
    onSuccess: () => {
      nameSnapshot('')
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })
  const removing = useMutation({
    mutationFn: (snapshotId: string) => repository.remove(snapshotId),
    onSuccess: (removed) => {
      setViewedId((current) => (current === removed.id ? null : current))
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
    onSettled: () => setDeleteCandidate(null),
  })
  const exporting = useExportList(async () => {
    const snapshot = await queryClient.fetchQuery(loadSnapshot(exportTarget.current ?? ''))
    return { ...exportNameOf(source, snapshot), ...source.tableOf(snapshot) }
  }, exporter)

  function exportingOf(snapshotId: string): ExportListView {
    const isTarget = exportedId === snapshotId
    return {
      formats: exporting.formats,
      exportAs: (format) => {
        exportTarget.current = snapshotId
        setExportedId(snapshotId)
        exporting.exportAs(format)
      },
      isExporting: isTarget && exporting.isExporting,
      exportMessage: isTarget ? exporting.exportMessage : '',
    }
  }

  const summaries = saved.data?.filter((snapshot) => snapshot.kind === source.kind) ?? []
  const viewedSnapshot = viewedId !== null && viewed.data?.id === viewedId ? viewed.data : null
  return {
    ...loadStatusOf(saved),
    snapshots: summaries.map((summary) => ({
      id: summary.id,
      name: summary.name,
      savedAt: `Saved ${formatDateTime(summary.createdAt)}`,
      peopleCount: formatPeople(summary.peopleCount),
      isViewed: summary.id === viewedId,
      load: () => setViewedId(summary.id),
      askToDelete: () => setDeleteCandidate(summary),
      exporting: exportingOf(summary.id),
    })),
    hasSnapshots: summaries.length > 0,
    showNoSnapshots: saved.isSuccess && summaries.length === 0,
    snapshotName,
    nameSnapshot,
    saveSnapshot: () => saving.mutate(),
    canSave: viewedId === null && !saving.isPending,
    isSaving: saving.isPending,
    message: saving.submittedAt > removing.submittedAt ? savedMessage(saving.data, saving.error) : deletedMessage(removing.data, removing.error),
    isViewingSnapshot: viewedId !== null,
    viewedSnapshot,
    viewedStatus: loadStatusOf(viewed),
    viewingNotice: viewingNoticeOf(viewedId, viewedSnapshot),
    backToCurrentList: () => setViewedId(null),
    viewedExportName: viewedSnapshot ? exportNameOf(source, viewedSnapshot) : null,
    deleting: {
      isConfirmOpen: deleteCandidate !== null,
      snapshotName: deleteCandidate?.name ?? '',
      changeConfirmOpen: (open) => setDeleteCandidate(open ? deleteCandidate : null),
      confirmDelete: () => deleteCandidate && removing.mutate(deleteCandidate.id),
      isDeleting: removing.isPending,
    },
  }
}

function viewingNoticeOf(viewedId: string | null, viewedSnapshot: Snapshot | null): string {
  if (viewedSnapshot) return `Viewing snapshot “${viewedSnapshot.name}”, saved ${formatDayOf(viewedSnapshot.createdAt)}`
  return viewedId === null ? '' : 'Loading snapshot…'
}

function exportNameOf(source: SnapshotSource, snapshot: Snapshot): SnapshotExportName {
  return {
    list: { slug: `${source.list.slug}-snapshot`, title: `${source.list.title} snapshot “${snapshot.name}”` },
    date: localDateOf(snapshot.createdAt),
  }
}

function savedMessage(saved: SnapshotSummary | undefined, error: Error | null): string {
  if (saved) return `Saved snapshot “${saved.name}”.`
  return error ? `Saving the snapshot failed: ${error.message}` : ''
}

function deletedMessage(removed: SnapshotSummary | undefined, error: Error | null): string {
  if (removed) return `Deleted snapshot “${removed.name}”.`
  return error ? `Deleting the snapshot failed: ${error.message}` : ''
}
