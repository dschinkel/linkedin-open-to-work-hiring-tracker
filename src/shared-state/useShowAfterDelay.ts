import { useEffect, useState } from 'react'

/** Loads that finish within this long never show a placeholder, so fast pages don't flash. */
export const placeholderDelayMilliseconds = 300

/** True only once `isWaiting` has held for the delay; false again as soon as the wait ends. */
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
