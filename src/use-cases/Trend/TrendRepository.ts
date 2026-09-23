import { trendsSchema, type TimeWindow, type Trends } from '@contracts/api'
import { getJson, queryString } from '@/shared-repositories/apiClient'

export interface TrendRepository {
  trends: (window: TimeWindow) => Promise<Trends>
}

export const trendRepository: TrendRepository = {
  trends: (window) => getJson(`/api/analytics/trends?${queryString({ window })}`, trendsSchema),
}
