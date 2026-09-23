import type { CompanyHiring } from '../../../contracts/api.ts'
import { aggregateHiringCompanies } from '../domain/HiringPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Currently-hiring people counted per reliably visible company. */
export const listHiringCompanies = ({ analytics }: TrackerPorts) => ({
  listHiringCompanies: (): CompanyHiring => aggregateHiringCompanies(analytics().hiringPeople),
})
