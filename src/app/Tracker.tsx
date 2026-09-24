import { QueryClientProvider } from '@tanstack/react-query'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { DemoBanner } from '@/demo/DemoBanner'
import { DemoInvite } from '@/demo/DemoInvite'
import { ExitDemo } from '@/demo/ExitDemo'
import { TrackerEnvironmentContext } from '@/shared-repositories/trackerEnvironment'
import { ViewDashboard } from '@/use-cases/Dashboard/ViewDashboard'
import { FindDepartedPeople } from '@/use-cases/Departure/FindDepartedPeople'
import { FindHiringPeople } from '@/use-cases/Hiring/FindHiringPeople'
import { FindOpenToWorkPeople } from '@/use-cases/OpenToWork/FindOpenToWorkPeople'
import { ViewScan } from '@/use-cases/Scan/ViewScan'
import { ViewScans } from '@/use-cases/Scan/ViewScans'
import { EditSettings } from '@/use-cases/Settings/EditSettings'
import { ViewTrends } from '@/use-cases/Trend/ViewTrends'
import { ChooseAppearance } from '@/use-cases/Appearance/ChooseAppearance'
import type { Audience } from '@contracts/api'
import { GitHubLink } from '@/components/GitHubLink'
import { SegmentedLinks } from '@/components/SegmentedLinks'
import type { TrackerMode } from '@/shared-repositories/trackerEnvironment'
import { useTracker } from './useTracker'

export function Tracker({ mode, audience }: { mode: TrackerMode; audience: Audience }) {
  const tracker = useTracker(mode, audience)

  return (
    <QueryClientProvider client={tracker.queryClient}>
      <TrackerEnvironmentContext.Provider value={tracker.environment}>
        <AppShell
          title="LinkedIn Open-to-Work & Hiring Tracker"
          subtitle={tracker.subtitle}
          toggle={<SegmentedLinks label="Followers or connections" links={tracker.audienceLinks} />}
          logoSrc={tracker.logoSrc}
          navItems={tracker.navItems}
          banner={tracker.showDemoBanner && <DemoBanner sampleDescription={tracker.demoSampleDescription} />}
          headerAction={
            <>
              {tracker.showDemoInvite && <DemoInvite href={tracker.demoHref} />}
              {tracker.showExitDemo && <ExitDemo href={tracker.exitDemoHref} />}
              <GitHubLink />
              <ChooseAppearance />
            </>
          }
        >
          <Routes key={audience}>
            <Route index element={<ViewDashboard />} />
            <Route path="trends" element={<ViewTrends />} />
            <Route path="open-to-work" element={<FindOpenToWorkPeople />} />
            <Route path="hiring" element={<FindHiringPeople />} />
            <Route path="departed" element={<FindDepartedPeople />} />
            <Route path="scans" element={<ViewScans />} />
            <Route path="scans/:scanId" element={<ViewScan />} />
            <Route path="settings" element={<EditSettings />} />
          </Routes>
        </AppShell>
      </TrackerEnvironmentContext.Provider>
    </QueryClientProvider>
  )
}
