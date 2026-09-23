import type { Route } from '../../app/HttpRouting.ts'
import type { TrackerHttp } from './TrackerHttp.ts'

/** Wiring only: method + path → adapter method. Paths are per audience (the audience prefix is stripped first). */
export const trackerRoutes = (http: TrackerHttp): Route[] => [
  { method: 'GET', pattern: /^\/api\/dashboard$/, respond: http.dashboard },
  { method: 'GET', pattern: /^\/api\/scans$/, respond: http.scans },
  { method: 'GET', pattern: /^\/api\/scans\/([\w-]+)$/, respond: http.scan },
  { method: 'GET', pattern: /^\/api\/analytics\/trends$/, respond: http.trends },
  { method: 'GET', pattern: /^\/api\/hiring\/people$/, respond: http.hiringPeople },
  { method: 'GET', pattern: /^\/api\/hiring\/companies$/, respond: http.hiringCompanies },
  { method: 'GET', pattern: /^\/api\/departed$/, respond: http.departed },
  { method: 'GET', pattern: /^\/api\/network-size$/, respond: http.networkSize },
  { method: 'GET', pattern: /^\/api\/settings$/, respond: http.settings },
  { method: 'PUT', pattern: /^\/api\/settings$/, respond: http.saveSettings },
  { method: 'DELETE', pattern: /^\/api\/all-data$/, respond: http.clearAllData },
]
