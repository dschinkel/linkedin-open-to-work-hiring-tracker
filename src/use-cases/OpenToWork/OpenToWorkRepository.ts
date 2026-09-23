import { type OpenToWorkPerson, openToWorkPeopleSchema } from '@contracts/api'
import type { ApiClient } from '@/shared-repositories/apiClient'

export interface OpenToWorkRepository {
  people: () => Promise<OpenToWorkPerson[]>
}

export function openToWorkRepositoryFor(api: ApiClient): OpenToWorkRepository {
  return {
    people: async () => (await api.getJson('/open-to-work/people', openToWorkPeopleSchema)).people,
  }
}
