import { AsyncContent } from '@/components/AsyncContent'
import { ChoiceSelect } from '@/components/ChoiceSelect'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { LabeledInput } from '@/components/LabeledInput'
import { CompanyHiringList } from './CompanyHiringList'
import { useFindHiringPeople } from './useFindHiringPeople'

export function FindHiringPeople() {
  const hiring = useFindHiringPeople()

  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Who's hiring</h2>
        <p className="text-sm text-muted-foreground">
          People in your screenshots showing the public #HIRING frame. Greyed rows were not in the latest scan, so the frame is not confirmed today.
        </p>
      </div>
      <div className="grid gap-6">
        <SectionCard title="Hiring people" description={hiring.resultSummary}>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <LabeledInput id="hiring-search" label="Name" placeholder="Search by name" value={hiring.filters.search} onChange={hiring.searchByName} />
            <LabeledInput id="hiring-company" label="Company" placeholder="Filter by company" value={hiring.filters.company} onChange={hiring.filterByCompany} />
            <ChoiceSelect id="hiring-status" label="Status" value={hiring.filters.status} options={hiring.statusOptions} onChange={hiring.filterByStatus} />
            <ChoiceSelect id="hiring-company-known" label="Company visibility" value={hiring.filters.companyKnown} options={hiring.companyKnownOptions} onChange={hiring.filterByCompanyKnown} />
            <ChoiceSelect id="hiring-sort" label="Sort by" value={hiring.filters.sort} options={hiring.sortOptions} onChange={hiring.sortBy} />
          </div>
          <AsyncContent status={hiring.status} errorMessage={hiring.errorMessage}>
            {hiring.hasPeople && <DataTable columns={hiring.columns} rows={hiring.rows} />}
            {hiring.showNoMatches && <EmptyState title="No hiring people match these filters." />}
          </AsyncContent>
        </SectionCard>
        <CompanyHiringList rows={hiring.companyRows} />
      </div>
    </>
  )
}
