import type { Route } from '../../app/HttpRouting.ts'
import type { ScreenshotsHttp } from './ScreenshotsHttp.ts'

export const screenshotRoutes = (http: ScreenshotsHttp): Route[] => [
  { method: 'POST', pattern: /^\/api\/screenshots$/, respond: http.addScreenshots },
  { method: 'POST', pattern: /^\/api\/scans\/([\w-]+)\/reprocess$/, respond: http.reprocessScan },
]
