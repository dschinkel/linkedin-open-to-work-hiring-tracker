import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TrackerRoute } from '@/app/TrackerRoute'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

const homePath = isStaticDemoBuild ? '/demo/followers' : '/followers'

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Navigate to={homePath} replace />} />
        <Route path="/demo" element={<Navigate to="/demo/followers" replace />} />
        <Route path="/demo/:audience/*" element={<TrackerRoute mode="demo" />} />
        <Route path="/:audience/*" element={<TrackerRoute mode="live" />} />
      </Routes>
    </BrowserRouter>
  )
}
