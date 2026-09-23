export interface DefinitionRow {
  label: string
  value: string
}

/** Label and value joined by a dotted leader, like a printed table of contents: Screenshots ........ 54 */
export function DefinitionList({ rows }: { rows: DefinitionRow[] }) {
  return (
    <dl className="text-label">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline gap-2 py-1">
          <dt className="flex min-w-0 flex-1 items-baseline gap-2 text-muted-foreground">
            {row.label}
            <span aria-hidden className="dot-leader" />
          </dt>
          <dd className="figure text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
