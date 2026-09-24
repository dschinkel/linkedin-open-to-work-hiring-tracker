import type { ReactNode } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SectionCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <Card>
      <CardHeader className="max-sm:grid-cols-1">
        <CardTitle className="text-title font-bold">
          <span className="panel-tag bg-tag text-tag-foreground">{title}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction className="max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:justify-self-start">{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
