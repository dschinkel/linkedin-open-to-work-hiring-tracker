import { Camera, Eye, Trash2 } from 'lucide-react'
import { AsyncContent } from '@/components/AsyncContent'
import { EmptyState } from '@/components/EmptyState'
import { ExportMenu } from '@/components/ExportMenu'
import { LabeledInput } from '@/components/LabeledInput'
import { SectionCard } from '@/components/SectionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { KeepSnapshotsView, SavedSnapshotView } from './useKeepSnapshots'
import { DeleteSnapshotDialog } from './DeleteSnapshotDialog'

interface KeepSnapshotsProps {
  snapshots: KeepSnapshotsView
  inputId: string
}

export function KeepSnapshots({ snapshots, inputId }: KeepSnapshotsProps) {
  return (
    <SectionCard title="Snapshots" description="Save this list as it is now, to open or export later. Scans after saving never change a snapshot.">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <LabeledInput id={inputId} label="Snapshot name (optional)" placeholder="Defaults to today's date" value={snapshots.snapshotName} onChange={snapshots.nameSnapshot} />
        </div>
        <Button onClick={snapshots.saveSnapshot} disabled={!snapshots.canSave}>
          <Camera />
          {snapshots.isSaving ? 'Saving…' : 'Save snapshot'}
        </Button>
        <span className="text-label text-muted-foreground" aria-live="polite">{snapshots.message}</span>
      </div>
      <AsyncContent status={snapshots.status} errorMessage={snapshots.errorMessage}>
        {snapshots.hasSnapshots && (
          <ul className="divide-y border">
            {snapshots.snapshots.map((snapshot) => (
              <SavedSnapshot key={snapshot.id} snapshot={snapshot} />
            ))}
          </ul>
        )}
        {snapshots.showNoSnapshots && <EmptyState title="No snapshots yet." description="Saved snapshots appear here, newest first." />}
      </AsyncContent>
      <DeleteSnapshotDialog deleting={snapshots.deleting} />
    </SectionCard>
  )
}

function SavedSnapshot({ snapshot }: { snapshot: SavedSnapshotView }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-medium">
          {snapshot.name}
          {snapshot.isViewed && <Badge variant="secondary">On show</Badge>}
        </p>
        <p className="text-label text-muted-foreground">
          {snapshot.savedAt} · {snapshot.peopleCount}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={snapshot.load} disabled={snapshot.isViewed}>
          <Eye />
          Load
        </Button>
        <ExportMenu exporting={snapshot.exporting} />
        <Button variant="ghost" size="icon" aria-label={`Delete snapshot ${snapshot.name}`} onClick={snapshot.askToDelete}>
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
