// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { useDemoInvite } from './useDemoInvite'

function visit() {
  return renderHook(() => useDemoInvite())
}

function storageUnavailable() {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Storage is disabled in private mode')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage is disabled in private mode')
  })
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('demo invite', () => {
  it('highlights the demo on a first visit', () => {
    const { result } = visit()

    expect(result.current.isHighlighted).toBe(true)
  })

  it('stops highlighting the demo on later visits', () => {
    visit().unmount()

    const { result } = visit()

    expect(result.current.isHighlighted).toBe(false)
  })

  it('still highlights the demo when the browser cannot remember visits', () => {
    storageUnavailable()

    const { result } = visit()

    expect(result.current.isHighlighted).toBe(true)
  })

  it('keeps highlighting on every visit when the browser cannot remember visits', () => {
    storageUnavailable()
    visit().unmount()

    const { result } = visit()

    expect(result.current.isHighlighted).toBe(true)
  })
})
