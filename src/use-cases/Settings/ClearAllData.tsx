import { Trash2 } from 'lucide-react'
import { SectionCard } from '@/components/SectionCard'
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
import { Button } from '@/components/ui/button'
import { useClearAllData } from './useClearAllData'

export function ClearAllData() {
  const clear = useClearAllData()

  return (
    <SectionCard title="Danger zone" description="Start over with an empty database.">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="destructive" onClick={clear.askToConfirm}>
          <Trash2 />
          Clear all data
        </Button>
        <span className="text-sm text-muted-foreground">{clear.resultMessage}</span>
      </div>
      <AlertDialog open={clear.isConfirmOpen} onOpenChange={clear.changeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes everything for both Followers and Contacts: every person, scan, and trend, your settings, and any screenshots
              still waiting in the inbox. It can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clear.confirmClear} disabled={clear.isClearing}>
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}
