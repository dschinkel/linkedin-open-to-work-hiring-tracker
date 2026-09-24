import { EmptyState } from '@/components/EmptyState'
import { AsyncContent } from '@/components/AsyncContent'
import { SectionCard } from '@/components/SectionCard'
import { HiringSnapshot } from '../Hiring/HiringSnapshot'
import { WhoIsHiringPreview } from '../Hiring/WhoIsHiringPreview'
import { OpenToWorkSnapshot } from '../OpenToWork/OpenToWorkSnapshot'
import { ScanQualityPanel } from '../Scan/ScanQualityPanel'
import { useViewAllDashboard } from './useViewAllDashboard'

export function ViewAllDashboard() {
  const dashboard = useViewAllDashboard()

  return (
    <AsyncContent status={dashboard.status} errorMessage={dashboard.errorMessage}>
      {dashboard.hasScans && (
        <div>
          <h2 className="page-title">{dashboard.latestScanLabel}</h2>
          <p className="mt-1 text-base text-muted-foreground sm:text-lg">
            <strong className="figure text-primary">{dashboard.sampledCount}</strong> different people across both latest scans
          </p>
          <p className="mt-1 text-label text-muted-foreground">{dashboard.audienceBreakdown}</p>
        </div>
      )}
      <p className="text-label text-muted-foreground">Pick Followers or Connections to add screenshots.</p>
      {!dashboard.hasScans && <EmptyState title="Neither followers nor connections have been scanned yet." />}
      {dashboard.hasScans && (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <OpenToWorkSnapshot tiles={dashboard.openToWorkTiles} />
            <HiringSnapshot tiles={dashboard.hiringTiles} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <WhoIsHiringPreview
              people={dashboard.whoIsHiringPeople}
              showNoHiringPeople={dashboard.showNoHiringPeople}
              hiringHref={dashboard.hiringHref}
            />
            <SectionCard title="Latest scans quality" description="Both latest scans together. Check here before trusting an unusual number.">
              <ScanQualityPanel sections={dashboard.qualitySections} />
            </SectionCard>
          </div>
        </>
      )}
    </AsyncContent>
  )
}
