import type { AvatarCircle, Pixels } from './FrameDetection.ts'

/**
 * A person's profile photo boiled down to its colours on a small grid, so one photo can be recognised in another
 * screenshot, even at another zoom. Only the middle of the photo is used: an #OPENTOWORK or #HIRING frame along the
 * edge comes and goes, the face doesn't. Written as hex: red, green, then blue for each cell, two digits each.
 */
export type PhotoPrint = string

/** Cells across (and down) the grid. */
const grid = 8
/** Half the side of the square read, as a share of the photo's radius; its corners stay inside any frame band. */
const middle = 0.55
/** Below this radius (in pixels) a photo is a smudge, and two different faces look alike. */
const smallestPrintableRadius = 8
/**
 * Average colour difference (0–255) under which two prints are one photo. The same photo at twice the zoom differs
 * by at most about 14; different people's photos by 29 or more, except LinkedIn's grey placeholder, shared by many.
 */
const samePhoto = 20
/** From here on two prints are clearly different photos; in between, a print tells nothing either way. */
const clearlyDifferentPhotos = 26

/** Null for a photo too small to tell faces apart, or whose middle runs off the screenshot (it would print the edge). */
export function photoPrint(pixels: Pixels, photo: AvatarCircle): PhotoPrint | null {
  if (photo.radius < smallestPrintableRadius || !middleIsInside(pixels, photo)) return null
  const channels = [0, 1, 2].map((channel) => cellAverages(pixels, photo, channel))
  return channels.flat().map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')
}

function middleIsInside({ width, height }: Pixels, { centreX, centreY, radius }: AvatarCircle): boolean {
  const half = radius * middle
  return centreX - half >= 0 && centreY - half >= 0 && centreX + half <= width && centreY + half <= height
}

/** Average colour difference between two prints, 0 (the same) to 255. */
export function photoDistance(first: PhotoPrint, second: PhotoPrint): number {
  const a = values(first)
  const b = values(second)
  return a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / a.length
}

export function photosMatch(first: PhotoPrint, second: PhotoPrint): boolean {
  return photoDistance(first, second) <= samePhoto
}

export function photosDiffer(first: PhotoPrint, second: PhotoPrint): boolean {
  return photoDistance(first, second) >= clearlyDifferentPhotos
}

/** Prints already turned back into numbers: a day's screenshots compare every photo with every other one. */
const parsedPrints = new Map<PhotoPrint, number[]>()

function values(print: PhotoPrint): number[] {
  const known = parsedPrints.get(print)
  if (known) return known
  const parsed = Array.from({ length: print.length / 2 }, (_, index) => Number.parseInt(print.slice(index * 2, index * 2 + 2), 16))
  if (parsedPrints.size > 20_000) parsedPrints.clear()
  parsedPrints.set(print, parsed)
  return parsed
}

function cellAverages(pixels: Pixels, { centreX, centreY, radius }: AvatarCircle, channel: number): number[] {
  const side = radius * middle * 2
  const size = side / grid
  const cells = Array.from({ length: grid * grid }, (_, index) => ({
    left: centreX - side / 2 + (index % grid) * size,
    top: centreY - side / 2 + Math.floor(index / grid) * size,
    size,
  }))
  return cells.map((cell) => averageIn(pixels, cell, channel))
}

/** One colour channel's average over a square, sampled about four times each way. */
function averageIn({ data, width, height }: Pixels, { left, top, size }: { left: number; top: number; size: number }, channel: number): number {
  const step = Math.max(1, size / 4)
  let sum = 0
  let count = 0
  for (let y = top; y < top + size; y += step) {
    for (let x = left; x < left + size; x += step) {
      const pixelX = Math.min(width - 1, Math.max(0, Math.round(x)))
      const pixelY = Math.min(height - 1, Math.max(0, Math.round(y)))
      sum += data[(pixelY * width + pixelX) * 4 + channel]
      count += 1
    }
  }
  return sum / count
}
