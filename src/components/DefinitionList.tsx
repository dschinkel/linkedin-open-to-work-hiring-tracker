export interface DefinitionRow {
  label: string
  value: string
}

export function DefinitionList({ rows }: { rows: DefinitionRow[] }) {
  return (
    <dl className="divide-y text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between gap-4 py-1.5">
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium tabular-nums">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
