import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface NavItem {
  to: string
  label: string
  isExact: boolean
}

interface AppShellProps {
  title: string
  subtitle: string
  toggle?: ReactNode
  logoSrc: string
  navItems: NavItem[]
  banner?: ReactNode
  headerAction?: ReactNode
  children: ReactNode
}

export function AppShell({ title, subtitle, toggle, logoSrc, navItems, banner, headerAction, children }: AppShellProps) {
  return (
    <div className="min-h-svh text-foreground">
      <header className="border-b bg-card/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-5 pb-3 sm:pt-7">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <img src={logoSrc} alt="" className="h-10 w-auto shrink-0 [image-rendering:pixelated] sm:h-16 lg:h-18" />
              <div className="min-w-0">
                <h1 className="text-lg leading-tight font-bold tracking-figure text-primary sm:text-2xl lg:text-3xl">{title}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-base">{subtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">{headerAction}</div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pb-4 sm:mt-6 sm:pb-5">
            {toggle}
            <nav className="-mx-4 flex min-w-0 flex-1 basis-full gap-0.5 overflow-x-auto px-4 text-label whitespace-nowrap sm:mx-0 sm:basis-auto sm:px-0">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.isExact}
                  className={({ isActive }) =>
                    cn(buttonVariants({ variant: isActive ? 'default' : 'ghost' }), 'px-2.5', isActive ? 'font-bold' : 'font-normal text-muted-foreground')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>
      {banner}
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
