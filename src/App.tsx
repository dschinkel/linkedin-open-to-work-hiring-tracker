import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Tracker } from '@/app/Tracker'
import { isStaticDemoBuild } from '@/demo/demoEnvironment'

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/demo/*" element={<Tracker mode="demo" />} />
        <Route path="/*" element={isStaticDemoBuild ? <Navigate to="/demo" replace /> : <Tracker mode="live" />} />
      </Routes>
    </BrowserRouter>
  )
}
