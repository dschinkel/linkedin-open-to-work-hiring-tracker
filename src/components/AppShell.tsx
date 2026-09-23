import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
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

/** On phones the header stacks: title, then the toggle, then the page links, which wrap rather than scroll. */
export function AppShell({ title, subtitle, toggle, logoSrc, navItems, banner, headerAction, children }: AppShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <img src={logoSrc} alt="" className="h-10 w-auto sm:h-14" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
            </div>
            {toggle}
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <nav className="flex min-w-0 flex-1 flex-wrap gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.isExact}
                  className={({ isActive }) => cn('shrink-0 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted', isActive ? 'bg-muted' : 'text-muted-foreground')}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            {headerAction}
          </div>
        </div>
      </header>
      {banner}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">{children}</main>
    </div>
  )
}
