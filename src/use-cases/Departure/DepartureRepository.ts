import { type DepartedPeople, departedPeopleSchema } from '@contracts/api'
import type { ApiClient } from '@/shared-repositories/apiClient'

export interface DepartureRepository {
  departed: () => Promise<DepartedPeople>
}

export function departureRepositoryFor(api: ApiClient): DepartureRepository {
  return {
    departed: () => api.getJson('/departed', departedPeopleSchema),
  }
}
