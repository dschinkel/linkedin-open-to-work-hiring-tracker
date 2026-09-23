import type { LucideIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

export interface IconOption<Value extends string> {
  value: Value
  label: string
  icon: LucideIcon
}

interface IconChoiceSelectProps<Value extends string> {
  label: string
  value: Value
  icon: LucideIcon
  options: IconOption<Value>[]
  onChange: (value: Value) => void
}

/** A square icon button that opens a short list of labeled choices, e.g. Light / Dark / System. */
export function IconChoiceSelect<Value extends string>({ label, value, icon: CurrentIcon, options, onChange }: IconChoiceSelectProps<Value>) {
  return (
    <Select items={options} value={value} onValueChange={(next) => next && onChange(next as Value)}>
      <SelectTrigger aria-label={label} title={label} className="size-8 justify-center px-0 [&>svg:last-child]:hidden">
        <CurrentIcon />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <option.icon />
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
