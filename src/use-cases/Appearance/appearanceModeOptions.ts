import { Monitor, Moon, Sun } from 'lucide-react'
import type { IconOption } from '@/components/ChoiceRow'
import type { AppearanceMode } from './appearance'

export const appearanceModeOptions: IconOption<AppearanceMode>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

