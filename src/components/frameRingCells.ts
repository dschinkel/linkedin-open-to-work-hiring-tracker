export type Signal = 'open-to-work' | 'hiring'

export interface RingCell {
  x: number
  y: number
  /** Degrees to turn the glyph so it sits along the ring. */
  rotation: number
  glyph: string
  isLit: boolean
  /** Lit cells switch on one after another, starting from the lower left. */
  delayMs: number
}

export const ringSize = 244
const center = ringSize / 2
const radius = 92
/** 50 cells: each lit cell is 2% of the network. */
const cellCount = 50
/** LinkedIn draws its frames from the lower left; the lit cells start there too. */
const startAngle = 135
const captionRadius = 114

/** The arc under the ring that the frame's caption (#OPENTOWORK, #HIRING) is set along. */
export const captionArc = `M ${center - captionRadius} ${center} A ${captionRadius} ${captionRadius} 0 0 0 ${center + captionRadius} ${center}`

/**
 * A LinkedIn profile frame drawn in characters: lit cells (■) are the share of people wearing the frame and the rest
 * are dots, every fifth a heavier tick so a short run of cells is easy to read. Reads the rate back from the text the
 * tile displays ("9.6%"), so the ring can only ever show what the tile says; anything else ("—") leaves it empty.
 */
export function frameRingCells(shownRate: string): RingCell[] {
  const litCount = litCellsFor(percentShown(shownRate))
  return Array.from({ length: cellCount }, (_, index) => {
    const degrees = startAngle + (index * 360) / cellCount
    const angle = (degrees * Math.PI) / 180
    const isLit = index < litCount
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      rotation: degrees + 90,
      glyph: isLit ? '■' : index % 5 === 0 ? '+' : '·',
      isLit,
      delayMs: 200 + index * 45,
    }
  })
}

function litCellsFor(rate: number | null): number {
  if (rate === null || rate <= 0) return 0
  const share = Math.min(rate, 100) / 100
  return Math.max(1, Math.round(share * cellCount))
}

function percentShown(value: string): number | null {
  const match = /^(-?\d+(?:\.\d+)?)%$/.exec(value.trim())
  return match ? Number(match[1]) : null
}
