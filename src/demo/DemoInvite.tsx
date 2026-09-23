import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDemoInvite } from './useDemoInvite'

export function DemoInvite() {
  const { isHighlighted } = useDemoInvite()

  return (
    <Link
      to="/demo"
      className={cn(buttonVariants({ size: 'sm' }), 'bg-open-to-work text-white hover:bg-open-to-work/90', isHighlighted && 'demo-invite-highlight')}
    >
      <Sparkles />
      Demo
    </Link>
  )
}
