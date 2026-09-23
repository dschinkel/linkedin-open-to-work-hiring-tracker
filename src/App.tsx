import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Tracker } from '@/app/Tracker'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        {/* Keyed by mode so switching to the demo builds a fresh tracker (and query cache) instead of reusing the live one. */}
        <Route path="/demo/*" element={<Tracker key="demo" mode="demo" />} />
        <Route path="/*" element={isStaticDemoBuild ? <Navigate to="/demo" replace /> : <Tracker key="live" mode="live" />} />
      </Routes>
    </BrowserRouter>
  )
}
