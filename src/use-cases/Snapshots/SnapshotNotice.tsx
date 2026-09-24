import { ArrowLeft, History } from 'lucide-react'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface SnapshotNoticeProps {
  notice: string
  detail: string
  onBack: () => void
}

/** Above a list while a saved snapshot is on show in its place. */
export function SnapshotNotice({ notice, detail, onBack }: SnapshotNoticeProps) {
  return (
    <Alert className="mb-4 border-primary">
      <History />
      <AlertTitle>{notice}</AlertTitle>
      <AlertDescription>{detail}</AlertDescription>
      <AlertAction>
        <Button size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to current list
        </Button>
      </AlertAction>
    </Alert>
  )
}
