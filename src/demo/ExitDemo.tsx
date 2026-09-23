import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export function ExitDemo({ href }: { href: string }) {
  return (
    <Link to={href} className={buttonVariants({ variant: 'outline' })}>
      Exit demo
    </Link>
  )
}
