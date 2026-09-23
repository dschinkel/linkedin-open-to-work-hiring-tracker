import { dashboardSchema, type Dashboard } from '@contracts/api'
import { getJson } from '@/shared-repositories/apiClient'

export interface DashboardRepository {
  latest: () => Promise<Dashboard>
}

export const dashboardRepository: DashboardRepository = {
  latest: () => getJson('/api/dashboard', dashboardSchema),
}
