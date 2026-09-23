// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { useShowAfterDelay } from './useShowAfterDelay'

describe('showing a loading placeholder', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('hides the placeholder while a load is still quick', () => {
    const { result } = renderHook(() => useShowAfterDelay(true, 300))

    act(() => vi.advanceTimersByTime(299))

    expect(result.current).toBe(false)
  })

  it('shows the placeholder once a load takes longer than the delay', () => {
    const { result } = renderHook(() => useShowAfterDelay(true, 300))

    act(() => vi.advanceTimersByTime(300))

    expect(result.current).toBe(true)
  })

  it('drops the placeholder as soon as the load finishes', () => {
    const { result, rerender } = renderHook(({ isWaiting }) => useShowAfterDelay(isWaiting, 300), { initialProps: { isWaiting: true } })
    act(() => vi.advanceTimersByTime(300))

    rerender({ isWaiting: false })

    expect(result.current).toBe(false)
  })
})
