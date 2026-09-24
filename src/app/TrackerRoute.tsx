import { Navigate } from 'react-router-dom'
import type { TrackerMode } from '@/shared-repositories/trackerEnvironment'
import { Tracker } from './Tracker'
import { useTrackerRoute } from './useTrackerRoute'

export function TrackerRoute({ mode }: { mode: TrackerMode }) {
  const route = useTrackerRoute(mode)

  if (route.redirectTo !== null) return <Navigate to={route.redirectTo} replace />
  return <Tracker key={mode} mode={mode} audience={route.audience} />
}
