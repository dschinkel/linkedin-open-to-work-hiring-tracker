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

/** Single-choice segmented control, e.g. [7D] [30D] [90D] [6M] [1Y] [ALL]. */
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

/** Ignores the empty selection Base UI reports when the active item is clicked again. */
function reportSelection<Value extends string>(selected: string[], onChange: (value: Value) => void): void {
  if (selected.length > 0) onChange(selected[0] as Value)
}
