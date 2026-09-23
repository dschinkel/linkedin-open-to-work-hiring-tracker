import { trendsSchema, type TimeWindow, type Trends } from '@contracts/api'
import { type ApiClient, queryString } from '@/shared-repositories/apiClient'

export interface TrendRepository {
  trends: (window: TimeWindow) => Promise<Trends>
}

export function trendRepositoryFor(api: ApiClient): TrendRepository {
  return {
    trends: (window) => api.getJson(`/analytics/trends?${queryString({ window })}`, trendsSchema),
  }
}
