import { useEffect, useState } from 'react'

export const placeholderDelayMilliseconds = 300

export function useShowAfterDelay(isWaiting: boolean, delayMilliseconds = placeholderDelayMilliseconds): boolean {
  const [hasWaitedLongEnough, setHasWaitedLongEnough] = useState(false)

  useEffect(() => {
    if (!isWaiting) return undefined
    const timer = setTimeout(() => setHasWaitedLongEnough(true), delayMilliseconds)
    return () => {
      clearTimeout(timer)
      setHasWaitedLongEnough(false)
    }
  }, [isWaiting, delayMilliseconds])

  return isWaiting && hasWaitedLongEnough
}
