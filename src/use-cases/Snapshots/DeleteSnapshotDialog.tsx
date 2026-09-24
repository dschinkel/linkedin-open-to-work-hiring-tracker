import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { DeleteSnapshotView } from './useKeepSnapshots'

export function DeleteSnapshotDialog({ deleting }: { deleting: DeleteSnapshotView }) {
  return (
    <AlertDialog open={deleting.isConfirmOpen} onOpenChange={deleting.changeConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete snapshot “{deleting.snapshotName}”?</AlertDialogTitle>
          <AlertDialogDescription>The saved list is deleted for good. Your scans and the current list are not affected.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={deleting.confirmDelete} disabled={deleting.isDeleting}>
            Delete snapshot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
