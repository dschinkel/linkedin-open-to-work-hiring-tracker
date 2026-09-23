import {
  companyHiringSchema,
  hiringPeopleSchema,
  type CompanyHiring,
  type HiringPeopleQuery,
  type HiringPerson,
} from '@contracts/api'
import { getJson, queryString } from '@/shared-repositories/apiClient'

export interface HiringRepository {
  people: (query: HiringPeopleQuery) => Promise<HiringPerson[]>
  companies: () => Promise<CompanyHiring>
}

export const hiringRepository: HiringRepository = {
  people: async (query) => (await getJson(`/api/hiring/people?${queryString(query)}`, hiringPeopleSchema)).people,
  companies: () => getJson('/api/hiring/companies', companyHiringSchema),
}
