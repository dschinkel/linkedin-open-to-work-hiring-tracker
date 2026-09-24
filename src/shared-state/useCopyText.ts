import { useEffect, useState } from 'react'

export interface CopyText {
  copy: () => void
  wasCopied: boolean
}

export const copiedNoticeMilliseconds = 1_500

export function useCopyText(text: string, writeText: (text: string) => Promise<void> = (value) => navigator.clipboard.writeText(value)): CopyText {
  const [wasCopied, setWasCopied] = useState(false)

  useEffect(() => {
    if (!wasCopied) return undefined
    const timer = setTimeout(() => setWasCopied(false), copiedNoticeMilliseconds)
    return () => clearTimeout(timer)
  }, [wasCopied])

  return {
    copy: () => {
      void writeText(text).then(() => setWasCopied(true))
    },
    wasCopied,
  }
}
