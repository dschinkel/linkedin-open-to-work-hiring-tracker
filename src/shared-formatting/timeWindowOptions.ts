import type { TimeWindow } from '@contracts/api'
import type { PickerOption } from '@/components/OptionPicker'

export const timeWindowOptions: PickerOption<TimeWindow>[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'All' },
]
