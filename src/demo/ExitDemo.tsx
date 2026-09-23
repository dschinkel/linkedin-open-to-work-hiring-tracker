import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'

export function ExitDemo() {
  return (
    <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
      Exit demo
    </Link>
  )
}
