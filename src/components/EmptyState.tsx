import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-input p-8 text-center">
      <p className="font-medium text-primary">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-measure text-label text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
