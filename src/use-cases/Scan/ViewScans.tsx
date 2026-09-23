import { AnalyzeScreenshots } from './AnalyzeScreenshots'
import { ViewScanHistory } from './ViewScanHistory'

export function ViewScans() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Scans</h2>
          <p className="text-sm text-muted-foreground">Screenshot batches, classifier confidence, duplicates, and reprocessing.</p>
        </div>
        <AnalyzeScreenshots />
      </div>
      <ViewScanHistory />
    </>
  )
}
