export type Signal = 'open-to-work' | 'hiring'

export interface RingArc {
  length: number
  circumference: number
}

export const ringSize = 244
export const ringCenter = ringSize / 2
export const ringRadius = 92
export const ringStroke = 10
export const ringStartAngle = 135
const captionRadius = 114
const circumference = 2 * Math.PI * ringRadius

export const captionArc = `M ${ringCenter - captionRadius} ${ringCenter} A ${captionRadius} ${captionRadius} 0 0 0 ${ringCenter + captionRadius} ${ringCenter}`

export function frameRingArc(shownRate: string): RingArc {
  const rate = percentShown(shownRate)
  const share = rate === null ? 0 : Math.min(Math.max(rate, 0), 100) / 100
  return { length: share > 0 ? Math.max(share * circumference, ringStroke) : 0, circumference }
}

function percentShown(value: string): number | null {
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(value.trim())
  return match ? Number(match[1]) : null
}
