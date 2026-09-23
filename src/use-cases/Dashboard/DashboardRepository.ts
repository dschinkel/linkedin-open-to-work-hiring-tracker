import { dashboardSchema, type Dashboard } from '@contracts/api'
import { type ApiClient } from '@/shared-repositories/apiClient'

export interface DashboardRepository {
  latest: () => Promise<Dashboard>
}

export function dashboardRepositoryFor(api: ApiClient): DashboardRepository {
  return {
    latest: () => api.getJson('/api/dashboard', dashboardSchema),
  }
}
