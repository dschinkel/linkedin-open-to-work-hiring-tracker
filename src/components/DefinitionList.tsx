import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface DefinitionRow {
  label: string
  value: string
  /** Plain-English explanation shown when hovering or focusing the label. */
  help?: string
}

/** Label and value joined by a dotted leader, like a printed table of contents: Screenshots ........ 54 */
export function DefinitionList({ rows }: { rows: DefinitionRow[] }) {
  return (
    <dl className="text-label">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline gap-2 py-1">
          <dt className="flex min-w-0 flex-1 items-baseline gap-2 text-muted-foreground">
            <RowLabel {...row} />
            <span aria-hidden className="dot-leader" />
          </dt>
          <dd className="figure text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RowLabel({ label, help }: DefinitionRow) {
  if (!help) return <>{label}</>
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help text-left underline decoration-dotted underline-offset-4">{label}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">{help}</TooltipContent>
    </Tooltip>
  )
}
