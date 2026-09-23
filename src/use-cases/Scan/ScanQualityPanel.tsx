import { DefinitionList } from '@/components/DefinitionList'
import type { QualitySection } from './describeScanQuality'

export function ScanQualityPanel({ sections }: { sections: QualitySection[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{section.title}</h3>
          <DefinitionList rows={section.rows} />
        </div>
      ))}
    </div>
  )
}
