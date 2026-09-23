import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PickerOption } from './OptionPicker'

interface ChoiceSelectProps<Value extends string> {
  id: string
  label: string
  value: Value
  options: PickerOption<Value>[]
  onChange: (value: Value) => void
}

export function ChoiceSelect<Value extends string>({ id, label, value, options, onChange }: ChoiceSelectProps<Value>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select items={options} value={value} onValueChange={(next) => next && onChange(next as Value)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
