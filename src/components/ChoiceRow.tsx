import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Choice<Value extends string> {
  value: Value
  label: string
}

export interface IconOption<Value extends string> extends Choice<Value> {
  icon: LucideIcon
}

interface ChoiceRowProps<Value extends string, Option extends Choice<Value>> {
  label: string
  value: Value
  options: Option[]
  onChange: (value: Value) => void
  renderMark: (option: Option) => React.ReactNode
}

export function ChoiceRow<Value extends string, Option extends Choice<Value>>({ label, value, options, onChange, renderMark }: ChoiceRowProps<Value, Option>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          aria-label={option.label}
          title={option.label}
          onClick={() => onChange(option.value)}
          className={cn(
            'grid size-7 cursor-pointer place-items-center border transition-colors',
            option.value === value ? 'border-prompt bg-accent ring-2 ring-prompt/40' : 'border-transparent text-muted-foreground hover:border-input hover:text-foreground',
          )}
        >
          {renderMark(option)}
        </button>
      ))}
    </div>
  )
}

export function IconMark({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-4" />
}

export function SwatchMark({ color }: { color: string }) {
  return <span aria-hidden className="size-3.5 border border-input" style={{ backgroundColor: color }} />
}
