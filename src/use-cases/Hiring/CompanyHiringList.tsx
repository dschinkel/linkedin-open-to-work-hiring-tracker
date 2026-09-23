import { DefinitionList, type DefinitionRow } from '@/components/DefinitionList'
import { SectionCard } from '@/components/SectionCard'

export function CompanyHiringList({ rows }: { rows: DefinitionRow[] }) {
  return (
    <SectionCard
      title="Companies represented by hiring frames"
      description="People currently observed Hiring, per reliably visible company. Not a count of open positions."
    >
      <div className="columns-1 gap-8 sm:columns-2 lg:columns-3">
        <DefinitionList rows={rows} />
      </div>
    </SectionCard>
  )
}
