import { AddScreenshots } from './AddScreenshots'
import { ViewScanHistory } from './ViewScanHistory'

export function ViewScans() {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Scans</h2>
          <p className="mt-1 text-label text-muted-foreground">Screenshot batches, classifier confidence, duplicates, and reprocessing.</p>
        </div>
      </div>
      <AddScreenshots />
      <ViewScanHistory />
    </>
  )
}
