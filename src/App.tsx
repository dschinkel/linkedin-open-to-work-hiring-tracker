import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TrackerRoute } from '@/app/TrackerRoute'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Navigate to={isStaticDemoBuild ? '/demo/contacts' : '/contacts'} replace />} />
        <Route path="/demo" element={<Navigate to="/demo/contacts" replace />} />
        <Route path="/demo/:audience/*" element={<TrackerRoute mode="demo" />} />
        <Route path="/:audience/*" element={<TrackerRoute mode="live" />} />
      </Routes>
    </BrowserRouter>
  )
}
