import {
  companyHiringSchema,
  hiringPeopleSchema,
  type CompanyHiring,
  type HiringPeopleQuery,
  type HiringPerson,
} from '@contracts/api'
import { type ApiClient, queryString } from '@/shared-repositories/apiClient'

export interface HiringRepository {
  people: (query: HiringPeopleQuery) => Promise<HiringPerson[]>
  companies: () => Promise<CompanyHiring>
}

export function hiringRepositoryFor(api: ApiClient): HiringRepository {
  return {
    people: async (query) => (await api.getJson(`/hiring/people?${queryString(query)}`, hiringPeopleSchema)).people,
    companies: () => api.getJson('/hiring/companies', companyHiringSchema),
  }
}
