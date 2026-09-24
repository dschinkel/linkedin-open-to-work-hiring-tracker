import { useParams } from 'react-router-dom'
import { type AudienceChoice, audienceChoiceSchema } from '@contracts/api'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'
import type { TrackerMode } from '@/shared-repositories/trackerEnvironment'

export type TrackerRouteView = { audience: AudienceChoice; redirectTo: null } | { audience: null; redirectTo: string }

export function useTrackerRoute(mode: TrackerMode): TrackerRouteView {
  const parsed = audienceChoiceSchema.safeParse(useParams().audience)
  const modeBase = mode === 'demo' || isStaticDemoBuild ? '/demo' : ''
  if (!parsed.success) return { audience: null, redirectTo: `${modeBase}/followers` }
  if (mode === 'live' && isStaticDemoBuild) return { audience: null, redirectTo: `/demo/${parsed.data}` }
  return { audience: parsed.data, redirectTo: null }
}
