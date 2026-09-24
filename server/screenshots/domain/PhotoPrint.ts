import type { AvatarCircle, Pixels } from './FrameDetection.ts'

export type PhotoPrint = string

const grid = 8
const middle = 0.55
const smallestPrintableRadius = 8
const samePhoto = 20
const clearlyDifferentPhotos = 26

export function photoPrint(pixels: Pixels, photo: AvatarCircle): PhotoPrint | null {
  if (photo.radius < smallestPrintableRadius || !middleIsInside(pixels, photo)) return null
  const channels = [0, 1, 2].map((channel) => cellAverages(pixels, photo, channel))
  return channels.flat().map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')
}

function middleIsInside({ width, height }: Pixels, { centreX, centreY, radius }: AvatarCircle): boolean {
  const half = radius * middle
  return centreX - half >= 0 && centreY - half >= 0 && centreX + half <= width && centreY + half <= height
}

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
