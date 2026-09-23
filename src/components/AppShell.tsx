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

/** Two rows: title with the header controls, then the Followers / Contacts toggle beside the page links. */
export function AppShell({ title, subtitle, toggle, logoSrc, navItems, banner, headerAction, children }: AppShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={logoSrc} alt="" className="h-10 w-auto sm:h-14" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">{headerAction}</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {toggle}
            <nav className="flex flex-wrap gap-1">
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
          </div>
        </div>
      </header>
      {banner}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">{children}</main>
    </div>
  )
}
