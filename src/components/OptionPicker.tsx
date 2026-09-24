import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export interface PickerOption<Value extends string> {
  value: Value
  label: string
}

interface OptionPickerProps<Value extends string> {
  label: string
  value: Value
  options: PickerOption<Value>[]
  onChange: (value: Value) => void
}

export function OptionPicker<Value extends string>({ label, value, options, onChange }: OptionPickerProps<Value>) {
  return (
    <ToggleGroup
      aria-label={label}
      variant="outline"
      size="default"
      spacing={0}
      value={[value]}
      onValueChange={(selected: string[]) => reportSelection(selected, onChange)}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function reportSelection<Value extends string>(selected: string[], onChange: (value: Value) => void): void {
  if (selected.length > 0) onChange(selected[0] as Value)
}
