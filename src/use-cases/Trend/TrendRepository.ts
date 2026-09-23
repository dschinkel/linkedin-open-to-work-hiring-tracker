import { titleTrendsSchema, trendsSchema, type TimeWindow, type TitleTrends, type Trends } from '@contracts/api'
import { type ApiClient, queryString } from '@/shared-repositories/apiClient'

export interface TrendRepository {
  trends: (window: TimeWindow) => Promise<Trends>
  titleTrends: (window: TimeWindow) => Promise<TitleTrends>
}

export function trendRepositoryFor(api: ApiClient): TrendRepository {
  return {
    trends: (window) => api.getJson(`/analytics/trends?${queryString({ window })}`, trendsSchema),
    titleTrends: (window) => api.getJson(`/analytics/titles?${queryString({ window })}`, titleTrendsSchema),
  }
}
