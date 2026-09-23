import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell, type NavItem } from '@/components/AppShell'
import { ViewDashboard } from '@/use-cases/Dashboard/ViewDashboard'
import { FindHiringPeople } from '@/use-cases/Hiring/FindHiringPeople'
import { ViewScan } from '@/use-cases/Scan/ViewScan'
import { ViewScans } from '@/use-cases/Scan/ViewScans'
import { EditSettings } from '@/use-cases/Settings/EditSettings'
import { ViewTrends } from '@/use-cases/Trend/ViewTrends'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } })

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/trends', label: 'Trends' },
  { to: '/hiring', label: 'Hiring' },
  { to: '/scans', label: 'Scans' },
  { to: '/settings', label: 'Settings' },
]

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell title="LinkedIn Open-to-Work & Hiring Tracker" subtitle="Visible avatar frames in your sampled network, over time" navItems={navItems}>
          <Routes>
            <Route path="/" element={<ViewDashboard />} />
            <Route path="/trends" element={<ViewTrends />} />
            <Route path="/hiring" element={<FindHiringPeople />} />
            <Route path="/scans" element={<ViewScans />} />
            <Route path="/scans/:scanId" element={<ViewScan />} />
            <Route path="/settings" element={<EditSettings />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
