import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

export type LoadStatus = 'loading' | 'error' | 'ready'

interface AsyncContentProps {
  status: LoadStatus
  errorMessage?: string
  children: ReactNode
}

/** Shows a skeleton while loading, an alert on failure, and the content once ready. */
export function AsyncContent({ status, errorMessage, children }: AsyncContentProps) {
  if (status === 'loading') return <Skeleton className="h-40 w-full" />
  if (status === 'error')
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load data</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    )
  return <>{children}</>
}
