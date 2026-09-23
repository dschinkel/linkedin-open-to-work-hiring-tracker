import { CircleAlert, CircleCheck, CircleX } from 'lucide-react'

export interface ScreenshotRow {
  fileName: string
  result: string
  outcome: 'processed' | 'warning' | 'failed'
}

const outcomeIcons = {
  processed: <CircleCheck className="size-4 text-open-to-work" aria-label="Processed" />,
  warning: <CircleAlert className="size-4 text-warning" aria-label="Warning" />,
  failed: <CircleX className="size-4 text-removed" aria-label="Failed" />,
}

export function ScreenshotResults({ screenshots }: { screenshots: ScreenshotRow[] }) {
  return (
    <ul className="max-h-96 divide-y divide-dashed overflow-auto border text-sm">
      {screenshots.map((screenshot) => (
        <li key={screenshot.fileName} className="flex items-center gap-3 px-3 py-2">
          {outcomeIcons[screenshot.outcome]}
          <span className="flex-1 truncate text-xs text-primary">{screenshot.fileName}</span>
          <span className="text-muted-foreground">{screenshot.result}</span>
        </li>
      ))}
    </ul>
  )
}
