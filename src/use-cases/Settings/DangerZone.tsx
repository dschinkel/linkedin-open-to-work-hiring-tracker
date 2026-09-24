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
import { type ClearingScope, useClearData } from './useClearData'

export function DangerZone() {
  return (
    <SectionCard title="Danger zone" description="Start over with an empty list for Followers, Connections, or both.">
      <div className="space-y-3">
        <ClearData scope="followers" />
        <ClearData scope="contacts" />
        <ClearData scope="everything" />
      </div>
    </SectionCard>
  )
}

function ClearData({ scope }: { scope: ClearingScope }) {
  const clear = useClearData(scope)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="destructive" onClick={clear.askToConfirm}>
        <Trash2 />
        {clear.buttonLabel}
      </Button>
      <span className="text-label text-muted-foreground">{clear.resultMessage}</span>
      <AlertDialog open={clear.isConfirmOpen} onOpenChange={clear.changeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{clear.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{clear.confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clear.confirmClear} disabled={clear.isClearing}>
              {clear.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
