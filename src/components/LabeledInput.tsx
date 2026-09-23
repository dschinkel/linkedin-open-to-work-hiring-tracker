import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LabeledInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  step?: string
}

export function LabeledInput({ id, label, value, onChange, placeholder, type = 'text', step }: LabeledInputProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} step={step} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
