import type { CompanyHiring } from '../../../contracts/api.ts'
import { aggregateHiringCompanies } from '../domain/HiringPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const listHiringCompanies = ({ analytics }: TrackerPorts) => ({
  listHiringCompanies: (): CompanyHiring => aggregateHiringCompanies(analytics().hiringPeople),
})
