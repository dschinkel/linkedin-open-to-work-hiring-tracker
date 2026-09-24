import type { Transport } from '@/shared-repositories/apiClient'

type RoutesByAudience = ReturnType<(typeof import('../../server/sample/DemoTrackers.ts'))['demoTrackers']>
type AnswerAudienceRequest = (typeof import('../../server/app/AudienceRouting.ts'))['answerAudienceRequest']

let demo: Promise<{ routes: RoutesByAudience; answer: AnswerAudienceRequest }> | null = null

function loadDemo(): Promise<{ routes: RoutesByAudience; answer: AnswerAudienceRequest }> {
  demo ??= Promise.all([import('../../server/sample/DemoTrackers.ts'), import('../../server/app/AudienceRouting.ts')]).then(([demoModule, routingModule]) => ({
    routes: demoModule.demoTrackers(),
    answer: routingModule.answerAudienceRequest,
  }))
  return demo
}

export const demoTransport: Transport = async ({ method, path, body }) => {
  const { routes, answer } = await loadDemo()
  const url = new URL(path, 'http://demo.local')
  return answer(routes, { method, path: url.pathname, query: Object.fromEntries(url.searchParams), body: body ?? null })
}
