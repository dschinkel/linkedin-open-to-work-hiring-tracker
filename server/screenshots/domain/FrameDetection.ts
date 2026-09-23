import type { Classification, HiringStatus, OpenToWorkStatus } from '../../shared/domain/Observation.ts'

/** Raw RGBA pixels of a screenshot. */
export interface Pixels {
  data: Uint8Array
  width: number
  height: number
}

export interface AvatarCircle {
  centreX: number
  centreY: number
  radius: number
}

export interface FrameReadings {
  openToWork: Classification<OpenToWorkStatus>
  hiring: Classification<HiringStatus>
}

/**
 * Below this radius (in screenshot pixels) the frame band is only a few pixels wide and its label is a blur,
 * so a green or purple photo background looks the same as a frame. Such photos are Uncertain, never "no frame".
 */
export const smallestReadablePhotoRadius = 20

const tooSmallToRead: FrameReadings = {
  openToWork: { status: 'UNCERTAIN', confidence: 0, classificationMethod: 'pixels' },
  hiring: { status: 'UNCERTAIN', confidence: 0, classificationMethod: 'pixels' },
}

/** A real frame is one unbroken coloured band along the avatar's edge, at least this long, carrying light lettering. */
const frameArcDegrees = 120
const noFrameArcDegrees = 40
const stepDegrees = 2

/**
 * Finds the round avatar just left of a row's text: moving left from the text, the first non-background
 * shape is the avatar. Returns null when nothing is there.
 */
export function locateAvatar(pixels: Pixels, textLeft: number, top: number, bottom: number): AvatarCircle | null {
  const rowTop = Math.max(0, Math.round(top))
  const rowBottom = Math.min(pixels.height - 1, Math.round(bottom))
  const background = colourAt(pixels, Math.max(0, Math.round(textLeft) - 3), rowTop + 2)
  const columns = avatarColumns(pixels, Math.round(textLeft) - 3, rowTop, rowBottom, background)
  if (!columns) return null
  const rows = avatarRows(pixels, columns, rowTop, rowBottom, background)
  if (!rows) return null
  const size = Math.min(columns.right - columns.left, rows.bottom - rows.top)
  if (size < 8) return null
  return { centreX: (columns.left + columns.right) / 2, centreY: (rows.top + rows.bottom) / 2, radius: size / 2 }
}

function avatarColumns(pixels: Pixels, startX: number, top: number, bottom: number, background: Rgb): { left: number; right: number } | null {
  let right = -1
  for (let x = startX; x >= 0; x -= 1) {
    const occupied = columnHasShape(pixels, x, top, bottom, background)
    if (occupied && right < 0) right = x
    if (!occupied && right >= 0 && right - x > 6) return { left: x + 1, right }
    if (right < 0 && startX - x > (bottom - top) * 1.5) return null
  }
  return right >= 0 ? { left: 0, right } : null
}

function avatarRows(pixels: Pixels, columns: { left: number; right: number }, top: number, bottom: number, background: Rgb): { top: number; bottom: number } | null {
  const occupiedRows: number[] = []
  for (let y = top; y <= bottom; y += 1) if (rowHasShape(pixels, y, columns.left, columns.right, background)) occupiedRows.push(y)
  return occupiedRows.length > 0 ? { top: occupiedRows[0], bottom: occupiedRows[occupiedRows.length - 1] } : null
}

function columnHasShape(pixels: Pixels, x: number, top: number, bottom: number, background: Rgb): boolean {
  for (let y = top; y <= bottom; y += 2) if (differs(colourAt(pixels, x, y), background)) return true
  return false
}

function rowHasShape(pixels: Pixels, y: number, left: number, right: number, background: Rgb): boolean {
  for (let x = left; x <= right; x += 2) if (differs(colourAt(pixels, x, y), background)) return true
  return false
}

/**
 * Reads both frames from the avatar's edge. LinkedIn draws #OPENTOWORK as a green band and #HIRING as a purple
 * band along the outside of the photo, with the label in light letters on it. A photo that merely has green or
 * purple in it (a shirt, a background) rarely forms an unbroken band with lettering, so it isn't counted.
 */
export function readFrames(pixels: Pixels, avatar: AvatarCircle): FrameReadings {
  if (avatar.radius < smallestReadablePhotoRadius) return tooSmallToRead
  return {
    openToWork: classify(frameBand(pixels, avatar, isFrameGreen), 'OPEN', 'NOT_OPEN'),
    hiring: classify(frameBand(pixels, avatar, isFramePurple), 'HIRING', 'NOT_HIRING'),
  }
}

interface FrameBand {
  arcDegrees: number
  hasLettering: boolean
}

export function frameBand(pixels: Pixels, { centreX, centreY, radius }: AvatarCircle, isBandColour: (colour: Rgb) => boolean): FrameBand {
  const at = (degrees: number, fraction: number) => {
    const angle = (degrees * Math.PI) / 180
    return colourAt(pixels, Math.round(centreX + Math.cos(angle) * radius * fraction), Math.round(centreY + Math.sin(angle) * radius * fraction))
  }
  const angles = Array.from({ length: 360 / stepDegrees }, (_, index) => index * stepDegrees)
  const inBand = angles.map((degrees) => bandRadii.some((fraction) => isBandColour(at(degrees, fraction))))
  const lettered = angles.map((degrees) => hasLetteringInside(radialProfile.map((fraction) => at(degrees, fraction)), isBandColour))
  const run = longestCircularRun(inBand, maximumLetterGap)
  const letteringInRun = run.indices.filter((index) => lettered[index]).length
  return { arcDegrees: run.length * stepDegrees, hasLettering: letteringInRun >= 3 }
}

/** Radii (as a share of the avatar's radius) where the frame band sits. */
const bandRadii = [0.86, 0.9, 0.94, 0.98]
/** Samples from inside the photo out to the edge, to find label letters sitting inside the band. */
const radialProfile = Array.from({ length: 16 }, (_, index) => 0.7 + index * 0.02)

/** A light pixel with band colour both further in and further out is a letter printed on the band. */
function hasLetteringInside(colours: Rgb[], isBandColour: (colour: Rgb) => boolean): boolean {
  const band = colours.map(isBandColour)
  return colours.some((colour, index) => isLight(colour) && band.slice(0, index).some(Boolean) && band.slice(index + 1).some(Boolean))
}
/** Letters on the band interrupt its colour; breaks up to this many steps still count as one band. */
const maximumLetterGap = 5

function longestCircularRun(flags: boolean[], allowedGap: number): { length: number; indices: number[] } {
  if (flags.every(Boolean)) return { length: flags.length, indices: flags.map((_, index) => index) }
  const start = flags.indexOf(false)
  let best: number[] = []
  let current: number[] = []
  let gap = 0
  for (let offset = 1; offset <= flags.length; offset += 1) {
    const index = (start + offset) % flags.length
    if (flags[index]) {
      current.push(index)
      gap = 0
    } else if (current.length > 0 && gap < allowedGap) {
      current.push(index)
      gap += 1
    } else {
      current = []
      gap = 0
    }
    if (current.length - gap > best.length) best = current.slice(0, current.length - gap)
  }
  return { length: best.length, indices: best }
}

function classify<Status extends string>({ arcDegrees, hasLettering }: FrameBand, present: Status, absent: Status): { status: Status | 'UNCERTAIN'; confidence: number; classificationMethod: 'pixels' } {
  if (arcDegrees >= frameArcDegrees && hasLettering) return { status: present, confidence: Math.min(0.99, 0.8 + arcDegrees / 1000), classificationMethod: 'pixels' }
  if (arcDegrees <= noFrameArcDegrees) return { status: absent, confidence: 0.97, classificationMethod: 'pixels' }
  if (arcDegrees < frameArcDegrees && !hasLettering) return { status: absent, confidence: 0.85, classificationMethod: 'pixels' }
  return { status: 'UNCERTAIN', confidence: 0.5, classificationMethod: 'pixels' }
}

interface Rgb {
  r: number
  g: number
  b: number
}

function colourAt({ data, width, height }: Pixels, x: number, y: number): Rgb {
  const clampedX = Math.min(width - 1, Math.max(0, x))
  const clampedY = Math.min(height - 1, Math.max(0, y))
  const offset = (clampedY * width + clampedX) * 4
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2] }
}

function isLight({ r, g, b }: Rgb): boolean {
  return r > 200 && g > 200 && b > 200
}

function differs(a: Rgb, b: Rgb): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) > 60
}

function hsv({ r, g, b }: Rgb): { hue: number; saturation: number; value: number } {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const delta = max - min
  const hue = delta === 0 ? 0 : max === r / 255 ? 60 * (((g - b) / 255 / delta) % 6) : max === g / 255 ? 60 * ((b - r) / 255 / delta + 2) : 60 * ((r - g) / 255 / delta + 4)
  return { hue: (hue + 360) % 360, saturation: max === 0 ? 0 : delta / max, value: max }
}

/** LinkedIn's #OPENTOWORK green. */
export function isFrameGreen(colour: Rgb): boolean {
  const { hue, saturation, value } = hsv(colour)
  return hue >= 85 && hue <= 160 && saturation >= 0.35 && value >= 0.25
}

/** LinkedIn's #HIRING purple. */
export function isFramePurple(colour: Rgb): boolean {
  const { hue, saturation, value } = hsv(colour)
  return hue >= 245 && hue <= 290 && saturation >= 0.35 && value >= 0.3
}
