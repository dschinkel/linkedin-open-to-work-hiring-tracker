// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { TrackerMode } from '@/shared-repositories/trackerEnvironment'
import { useTrackerRoute } from './useTrackerRoute'

function atAddress(path: string) {
  return function Browser({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/demo/:audience/*" element={children} />
          <Route path="/:audience/*" element={children} />
        </Routes>
      </MemoryRouter>
    )
  }
}

function routeAt(mode: TrackerMode, path: string) {
  return renderHook(() => useTrackerRoute(mode), { wrapper: atAddress(path) }).result.current
}

describe('tracker address', () => {
  it('opens the contacts tracker', () => {
    expect(routeAt('live', '/contacts/trends')).toEqual({ audience: 'contacts', redirectTo: null })
  })

  it('opens the followers demo', () => {
    expect(routeAt('demo', '/demo/followers')).toEqual({ audience: 'followers', redirectTo: null })
  })

  it('opens all audiences together', () => {
    expect(routeAt('live', '/all/hiring')).toEqual({ audience: 'all', redirectTo: null })
  })

  it('opens all audiences together in the demo', () => {
    expect(routeAt('demo', '/demo/all/open-to-work')).toEqual({ audience: 'all', redirectTo: null })
  })

  it('sends an unknown audience to the followers tracker', () => {
    expect(routeAt('live', '/colleagues')).toEqual({ audience: null, redirectTo: '/followers' })
  })

  it('sends an unknown audience in the demo to the followers demo', () => {
    expect(routeAt('demo', '/demo/colleagues')).toEqual({ audience: null, redirectTo: '/demo/followers' })
  })
})
