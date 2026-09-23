import { ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAnalyzeScreenshots } from './useAnalyzeScreenshots'

export function AnalyzeScreenshots() {
  const { analyze, isAnalyzing, resultMessage } = useAnalyzeScreenshots()

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground">{resultMessage}</span>
      <Button onClick={analyze} disabled={isAnalyzing}>
        <ScanSearch />
        Analyze new screenshots
      </Button>
    </div>
  )
}
