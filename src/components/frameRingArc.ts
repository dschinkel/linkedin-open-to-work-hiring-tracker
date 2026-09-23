export type Signal = 'open-to-work' | 'hiring'

export interface RingArc {
  /** Length of the colored arc along the ring, in SVG units; 0 draws no arc. */
  length: number
  circumference: number
}

export const ringSize = 244
export const ringCenter = ringSize / 2
export const ringRadius = 92
export const ringStroke = 10
/** LinkedIn draws its frames from the lower left; the arc starts there too. */
export const ringStartAngle = 135
const captionRadius = 114
const circumference = 2 * Math.PI * ringRadius

/** The arc under the ring that the frame's caption (#OPENTOWORK, #HIRING) is set along. */
export const captionArc = `M ${ringCenter - captionRadius} ${ringCenter} A ${captionRadius} ${captionRadius} 0 0 0 ${ringCenter + captionRadius} ${ringCenter}`

/**
 * A LinkedIn profile frame as a gauge: the colored arc is the share of people wearing the frame. Reads the rate back
 * from the text the tile displays ("9.6%"), so the ring can only ever show what the tile says; anything else ("—")
 * leaves it empty. A rate above zero always shows at least a short arc.
 */
export function frameRingArc(shownRate: string): RingArc {
  const rate = percentShown(shownRate)
  const share = rate === null ? 0 : Math.min(Math.max(rate, 0), 100) / 100
  return { length: share > 0 ? Math.max(share * circumference, ringStroke) : 0, circumference }
}

function percentShown(value: string): number | null {
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(value.trim())
  return match ? Number(match[1]) : null
}
