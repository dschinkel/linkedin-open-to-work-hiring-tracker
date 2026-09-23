import { Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDemoInvite } from './useDemoInvite'

export function DemoInvite({ href }: { href: string }) {
  const { isHighlighted } = useDemoInvite()

  return (
    <Link
      to={href}
      className={cn(buttonVariants(), 'bg-open-to-work font-bold text-background hover:bg-open-to-work/90', isHighlighted && 'invite-highlight')}
    >
      <Sparkles />
      Demo
    </Link>
  )
}
