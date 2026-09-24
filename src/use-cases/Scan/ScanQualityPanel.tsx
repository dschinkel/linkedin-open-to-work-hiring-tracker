import { DefinitionList } from '@/components/DefinitionList'
import type { QualitySection } from './describeScanQuality'

export function ScanQualityPanel({ sections }: { sections: QualitySection[] }) {
  return (
    <div className="@container">
      <div className="grid gap-4 @2xl:grid-cols-2">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-1 text-xs font-bold text-prompt">{section.title}</h3>
          <DefinitionList rows={section.rows} />
        </div>
      ))}
      </div>
    </div>
  )
}
