import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SwitchFieldProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SwitchField({ id, label, description, checked, onChange }: SwitchFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
