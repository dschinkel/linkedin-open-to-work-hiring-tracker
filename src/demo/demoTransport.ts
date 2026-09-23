import type { Transport } from '@/shared-repositories/apiClient'

type DemoRoute = (typeof import('../../mock-api/audienceRoutes.ts'))['routeAudienceRequest']
type DemoApis = ReturnType<(typeof import('../../mock-api/demoTrackerApi.ts'))['createDemoTrackerApis']>

let demo: Promise<{ apis: DemoApis; route: DemoRoute }> | null = null

/** Loaded on first use so the sample data never ships in the real app's startup bundle. */
function loadDemo(): Promise<{ apis: DemoApis; route: DemoRoute }> {
  demo ??= Promise.all([import('../../mock-api/demoTrackerApi.ts'), import('../../mock-api/audienceRoutes.ts')]).then(([demoModule, routesModule]) => ({
    apis: demoModule.createDemoTrackerApis(),
    route: routesModule.routeAudienceRequest,
  }))
  return demo
}

/** Answers API requests in the browser from the static demo networks, with no server involved. */
export const demoTransport: Transport = async ({ method, path, body }) => {
  const { apis, route } = await loadDemo()
  const url = new URL(path, 'http://demo.local')
  return route(apis, { method, path: url.pathname, query: Object.fromEntries(url.searchParams), body: body ?? null })
}
