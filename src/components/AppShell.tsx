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

export function AppShell({ title, subtitle, toggle, logoSrc, navItems, banner, headerAction, children }: AppShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            {toggle}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.isExact}
                  className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted', isActive ? 'bg-muted' : 'text-muted-foreground')}
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
