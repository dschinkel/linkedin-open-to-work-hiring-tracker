import { AsyncContent } from '@/components/AsyncContent'
import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { HiringSnapshot } from '../Hiring/HiringSnapshot'
import { WhoIsHiringPreview } from '../Hiring/WhoIsHiringPreview'
import { OpenToWorkSnapshot } from '../OpenToWork/OpenToWorkSnapshot'
import { AnalyzeScreenshots } from '../Scan/AnalyzeScreenshots'
import { ScanQualityPanel } from '../Scan/ScanQualityPanel'
import { ViewScanHistory } from '../Scan/ViewScanHistory'
import { ViewOpenToWorkTrend } from '../Trend/ViewOpenToWorkTrend'
import { useViewDashboard } from './useViewDashboard'

export function ViewDashboard() {
  const dashboard = useViewDashboard()

  return (
    <AsyncContent status={dashboard.status} errorMessage={dashboard.errorMessage}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{dashboard.latestScanLabel}</h2>
          <p className="text-sm text-muted-foreground">{dashboard.sampleLabel}</p>
        </div>
        <AnalyzeScreenshots />
      </div>
      {dashboard.showFirstRunInvite && (
        <EmptyState title="No scans yet" description="Drop screenshots into LinkedinScreenShots/ to create your first scan." />
      )}
      {dashboard.hasScans && (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <OpenToWorkSnapshot tiles={dashboard.openToWorkTiles} />
            <HiringSnapshot tiles={dashboard.hiringTiles} />
          </div>
          <ViewOpenToWorkTrend />
          <div className="grid gap-6 xl:grid-cols-2">
            <WhoIsHiringPreview
              headline={dashboard.whoIsHiringHeadline}
              people={dashboard.whoIsHiringPeople}
              showNoHiringPeople={dashboard.showNoHiringPeople}
            />
            <SectionCard title="Latest scan quality" description="Check here before trusting an unusual move in the charts.">
              <ScanQualityPanel sections={dashboard.qualitySections} />
            </SectionCard>
          </div>
          <ViewScanHistory />
        </>
      )}
    </AsyncContent>
  )
}
