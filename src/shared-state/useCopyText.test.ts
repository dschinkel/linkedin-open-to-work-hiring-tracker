// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { useCopyText } from './useCopyText'

function clipboard() {
  const written: string[] = []
  return { written, writeText: async (text: string) => void written.push(text) }
}

describe('copying text', () => {
  it('puts the text on the clipboard', async () => {
    const board = clipboard()
    const { result } = renderHook(() => useCopyText('https://example.com/repo', board.writeText))

    act(() => result.current.copy())

    await waitFor(() => expect(board.written).toEqual(['https://example.com/repo']))
  })

  it('says it was copied once the clipboard has it', async () => {
    const board = clipboard()
    const { result } = renderHook(() => useCopyText('https://example.com/repo', board.writeText))

    act(() => result.current.copy())

    await waitFor(() => expect(result.current.wasCopied).toBe(true))
  })

  it('does not claim a copy before one is made', () => {
    const { result } = renderHook(() => useCopyText('https://example.com/repo', clipboard().writeText))

    expect(result.current.wasCopied).toBe(false)
  })
})
