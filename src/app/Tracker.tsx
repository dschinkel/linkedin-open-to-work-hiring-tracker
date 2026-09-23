import { QueryClientProvider } from '@tanstack/react-query'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { DemoBanner } from '@/demo/DemoBanner'
import { DemoInvite } from '@/demo/DemoInvite'
import { ExitDemo } from '@/demo/ExitDemo'
import { TrackerEnvironmentContext } from '@/shared-repositories/trackerEnvironment'
import { ViewDashboard } from '@/use-cases/Dashboard/ViewDashboard'
import { FindHiringPeople } from '@/use-cases/Hiring/FindHiringPeople'
import { ViewScan } from '@/use-cases/Scan/ViewScan'
import { ViewScans } from '@/use-cases/Scan/ViewScans'
import { EditSettings } from '@/use-cases/Settings/EditSettings'
import { ViewTrends } from '@/use-cases/Trend/ViewTrends'
import { type TrackerMode, useTracker } from './useTracker'

export function Tracker({ mode }: { mode: TrackerMode }) {
  const tracker = useTracker(mode)

  return (
    <QueryClientProvider client={tracker.queryClient}>
      <TrackerEnvironmentContext.Provider value={tracker.environment}>
        <AppShell
          title="LinkedIn Open-to-Work & Hiring Tracker"
          subtitle="Visible avatar frames in your sampled network, over time"
          logoSrc={tracker.logoSrc}
          navItems={tracker.navItems}
          banner={tracker.showDemoBanner && <DemoBanner />}
          headerAction={
            <>
              {tracker.showDemoInvite && <DemoInvite />}
              {tracker.showExitDemo && <ExitDemo />}
            </>
          }
        >
          <Routes>
            <Route index element={<ViewDashboard />} />
            <Route path="trends" element={<ViewTrends />} />
            <Route path="hiring" element={<FindHiringPeople />} />
            <Route path="scans" element={<ViewScans />} />
            <Route path="scans/:scanId" element={<ViewScan />} />
            <Route path="settings" element={<EditSettings />} />
          </Routes>
        </AppShell>
      </TrackerEnvironmentContext.Provider>
    </QueryClientProvider>
  )
}
