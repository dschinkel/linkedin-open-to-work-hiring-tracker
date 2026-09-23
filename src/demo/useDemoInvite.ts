import { useEffect, useState } from 'react'

const seenKey = 'tracker.demoInviteSeen'

/** Highlights the Demo button on a visitor's first load only, then remembers it was seen. */
export function useDemoInvite(): { isHighlighted: boolean } {
  const [isHighlighted] = useState(() => !hasSeenInvite())
  useEffect(rememberInviteSeen, [])
  return { isHighlighted }
}

function hasSeenInvite(): boolean {
  try {
    return window.localStorage.getItem(seenKey) === 'yes'
  } catch {
    return false
  }
}

function rememberInviteSeen(): void {
  try {
    window.localStorage.setItem(seenKey, 'yes')
  } catch {
    // Storage can be unavailable (private mode); the highlight just shows again next time.
  }
}
