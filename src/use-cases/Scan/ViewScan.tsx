import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AsyncContent } from '@/components/AsyncContent'
import { DefinitionList } from '@/components/DefinitionList'
import { SectionCard } from '@/components/SectionCard'
import { Button } from '@/components/ui/button'
import { ScanQualityPanel } from './ScanQualityPanel'
import { ScreenshotResults } from './ScreenshotResults'
import { useViewScan } from './useViewScan'

export function ViewScan() {
  const scan = useViewScan()

  return (
    <AsyncContent status={scan.status} errorMessage={scan.errorMessage}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/scans" className="text-sm text-muted-foreground hover:underline">
            ← All scans
          </Link>
          <h2 className="text-2xl font-semibold">{scan.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{scan.reprocessMessage}</span>
          <Button variant="outline" onClick={scan.reprocess} disabled={scan.isReprocessing}>
            <RefreshCw />
            Reprocess scan
          </Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Scan">
          <DefinitionList rows={scan.scanRows} />
        </SectionCard>
        <SectionCard title="Open to Work" description="Public frame only; uncertain excluded from rates.">
          <DefinitionList rows={scan.openToWorkRows} />
        </SectionCard>
        <SectionCard title="Hiring" description="Public #HIRING frame; counts people, not open roles.">
          <DefinitionList rows={scan.hiringRows} />
        </SectionCard>
      </div>
      <SectionCard title="Scan quality">
        <ScanQualityPanel sections={scan.qualitySections} />
      </SectionCard>
      <SectionCard title="Screenshots" description={scan.screenshotSummary}>
        <ScreenshotResults screenshots={scan.screenshots} />
      </SectionCard>
    </AsyncContent>
  )
}
