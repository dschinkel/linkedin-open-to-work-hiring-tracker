import { useEffect, useState } from 'react'

const seenKey = 'tracker.demoInviteSeen'

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
  }
}
