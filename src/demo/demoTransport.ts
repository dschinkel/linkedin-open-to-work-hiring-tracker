import type { Transport } from '@/shared-repositories/apiClient'

type DemoRoute = (typeof import('../../mock-api/routes.ts'))['routeRequest']
type DemoApi = ReturnType<(typeof import('../../mock-api/demoTrackerApi.ts'))['createDemoTrackerApi']>

let demo: Promise<{ api: DemoApi; route: DemoRoute }> | null = null

/** Loaded on first use so the sample data never ships in the real app's startup bundle. */
function loadDemo(): Promise<{ api: DemoApi; route: DemoRoute }> {
  demo ??= Promise.all([import('../../mock-api/demoTrackerApi.ts'), import('../../mock-api/routes.ts')]).then(([demoModule, routesModule]) => ({
    api: demoModule.createDemoTrackerApi(),
    route: routesModule.routeRequest,
  }))
  return demo
}

/** Answers API requests in the browser from the static demo network, with no server involved. */
export const demoTransport: Transport = async ({ method, path, body }) => {
  const { api, route } = await loadDemo()
  const url = new URL(path, 'http://demo.local')
  return route(api, { method, path: url.pathname, query: Object.fromEntries(url.searchParams), body: body ?? null })
}
