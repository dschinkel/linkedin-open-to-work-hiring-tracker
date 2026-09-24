import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ExportListView } from '@/shared-exports/useExportList'

interface ExportMenuProps {
  exporting: ExportListView
  label?: string
}

/** [⤓ Export] opening Spreadsheet (.xlsx) / PDF / CSV, with what the last export did beside it. */
export function ExportMenu({ exporting, label = 'Export' }: ExportMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground" aria-live="polite">{exporting.exportMessage}</span>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" disabled={exporting.isExporting} />}>
          <Download />
          {exporting.isExporting ? 'Exporting…' : label}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto whitespace-nowrap">
          {exporting.formats.map((format) => (
            <DropdownMenuItem key={format.value} onClick={() => exporting.exportAs(format.value)}>
              {format.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
