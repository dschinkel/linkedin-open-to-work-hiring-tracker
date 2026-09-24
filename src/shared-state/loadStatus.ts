import type { LoadStatus } from '@/components/AsyncContent'

interface QueryLike {
  isPending: boolean
  isError: boolean
  error: Error | null
}

export function loadStatusOf(query: QueryLike): { status: LoadStatus; errorMessage: string } {
  if (query.isPending) return { status: 'loading', errorMessage: '' }
  if (query.isError) return { status: 'error', errorMessage: query.error?.message ?? 'Unknown error' }
  return { status: 'ready', errorMessage: '' }
}
