import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface SwatchOption<Value extends string> {
  value: Value
  label: string
  /** Any CSS color. */
  swatch: string
}

interface SwatchSelectProps<Value extends string> {
  label: string
  value: Value
  swatch: string
  options: SwatchOption<Value>[]
  onChange: (value: Value) => void
}

/** A compact picker of colors: phones see only the current swatch, wider screens also see its name. */
export function SwatchSelect<Value extends string>({ label, value, swatch, options, onChange }: SwatchSelectProps<Value>) {
  return (
    <Select items={options} value={value} onValueChange={(next) => next && onChange(next as Value)}>
      <SelectTrigger aria-label={label} title={label}>
        <Swatch color={swatch} />
        <span className="hidden sm:inline">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <Swatch color={option.swatch} />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="size-3.5 shrink-0 border border-input" style={{ backgroundColor: color }} />
}
