import { allDashboardSchema, type AllDashboard } from '@contracts/api'
import { type ApiClient } from '@/shared-repositories/apiClient'

export interface AllDashboardRepository {
  latest: () => Promise<AllDashboard>
}

export function allDashboardRepositoryFor(api: ApiClient): AllDashboardRepository {
  return {
    latest: () => api.getJson('/dashboard', allDashboardSchema),
  }
}
