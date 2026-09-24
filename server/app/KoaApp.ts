import { bodyParser } from '@koa/bodyparser'
import Koa from 'koa'
import type { ApiRequest, ApiResponse } from './HttpRouting.ts'

export const trackerKoaApp = (answer: (request: ApiRequest) => Promise<ApiResponse>): Koa => {
  const app = new Koa()
  app.use(bodyParser({ jsonLimit: '80mb' }))
  app.use(async (context, next) => {
    if (!context.path.startsWith('/api/')) return next()
    const response = await answer({ method: context.method, path: context.path, query: context.query as Record<string, string>, body: context.request.body ?? null })
    context.status = response.status
    context.body = response.body
  })
  return app
}
