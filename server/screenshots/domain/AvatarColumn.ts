import type { AvatarCircle, Pixels } from './FrameDetection.ts'

interface Blob {
  left: number
  top: number
  size: number
}

/** Photos this small (in pixels, on the detection image) are icons or mutual-connection faces, not profile photos. */
const smallestPhoto = 8
/** A filled circle covers about 79% of its bounding square; letters like "o" are hollow and cover far less. */
const circleFill = { least: 0.62, most: 0.95 }

/**
 * Finds every person on a LinkedIn list by their profile photo: the photos are round, the same size, and
 * stacked in one column. Browser menus, bookmark icons, and letters don't form such a column. A photo cut by the
 * top of the image is no longer round; it is placed where its whole circle would be, reaching above the image.
 */
export function findAvatarColumn(pixels: Pixels): AvatarCircle[] {
  const shapes = inkShapes(pixels)
  const columns = groupIntoColumns(shapes.map(asRoundBlob).filter((blob) => blob !== null))
  const best = columns.sort((a, b) => medianSize(b) - medianSize(a) || b.length - a.length)[0] ?? []
  const cutPhoto = best.length > 0 ? photoCutByTheTop(shapes, best) : null
  return [...(cutPhoto ? [cutPhoto] : []), ...best.filter((blob) => blob.top > 0)]
    .sort((a, b) => a.top - b.top)
    .map((blob) => ({ centreX: blob.left + blob.size / 2, centreY: blob.top + blob.size / 2, radius: blob.size / 2 }))
}

/** The shape touching the top of the image in the photo column, as wide as a photo: the lower part of a cut photo. */
function photoCutByTheTop(shapes: Component[], column: Blob[]): Blob | null {
  const size = medianSize(column)
  const left = column[0].left
  const cut = shapes.find((shape) => shape.minY === 0 && Math.abs(shape.minX - left) <= size * 0.3 && Math.abs(shape.maxX - shape.minX + 1 - size) <= size * 0.25)
  return cut ? { left: cut.minX, top: cut.maxY + 1 - size, size } : null
}

/**
 * How far apart one person's row is from the next. The closest pair of photos is one row apart; a median would
 * stretch across rows whose photo wasn't found (light photos blend into the page) and merge several people.
 */
export function rowSpacing(photos: AvatarCircle[]): number {
  const gaps = photos.slice(1).map((photo, index) => photo.centreY - photos[index].centreY)
  const rowGaps = gaps.filter((gap) => gap >= photos[0].radius * 2)
  return rowGaps.length > 0 ? Math.min(...rowGaps) : photos[0].radius * 3
}

/**
 * Whether a row was cut by the top of the image: its photo, or the spot where its photo should be, reaches well
 * past the top edge. A name starts level with the top of its photo, so such a row has lost its name and what is
 * left beside it is only a title. A row cut by the bottom edge keeps its name.
 */
export function hasLostItsName({ centreY, radius }: AvatarCircle): boolean {
  return centreY - radius < -radius * cutSliver
}

/** A photo (and the name level with it) cut by no more than this share of its radius still reads. */
const cutSliver = 0.2

/**
 * Whether a spot where a photo should be sits on the web page: the ring just outside it is the page's own
 * background. Text beside a spot in the browser's toolbars or bookmarks bar is not a person.
 */
export function sitsOnThePage(pixels: Pixels, spot: AvatarCircle): boolean {
  const background = backgroundColours(pixels.data, pixels.width * pixels.height)
  const ring = ringAround(spot, pixels)
  const onBackground = ring.filter((offset) => background.some((colour) => distance(colourAt(pixels.data, offset), colour) <= 45))
  return ring.length > 0 && onBackground.length / ring.length >= 0.5
}

function ringAround({ centreX, centreY, radius }: AvatarCircle, { width, height }: Pixels): number[] {
  const offsets: number[] = []
  for (let degrees = 0; degrees < 360; degrees += 10) {
    const x = Math.round(centreX + Math.cos((degrees * Math.PI) / 180) * radius * 1.3)
    const y = Math.round(centreY + Math.sin((degrees * Math.PI) / 180) * radius * 1.3)
    if (x >= 0 && x < width && y >= 0 && y < height) offsets.push((y * width + x) * 4)
  }
  return offsets
}

function colourAt(data: Pixels['data'], offset: number): number[] {
  return [data[offset], data[offset + 1], data[offset + 2]]
}

/** Every connected patch of ink at least as big as the smallest photo. */
function inkShapes(pixels: Pixels): Component[] {
  const ink = inkMask(pixels)
  const seen = new Uint8Array(pixels.width * pixels.height)
  const shapes: Component[] = []
  for (let index = 0; index < ink.length; index += 1) {
    if (!ink[index] || seen[index]) continue
    const component = floodFill(ink, seen, index, pixels.width, pixels.height)
    if (component.maxX - component.minX + 1 >= smallestPhoto) shapes.push(component)
  }
  return shapes
}

interface Component {
  minX: number
  minY: number
  maxX: number
  maxY: number
  area: number
}

function floodFill(ink: Uint8Array, seen: Uint8Array, start: number, width: number, height: number): Component {
  const stack = [start]
  seen[start] = 1
  const component: Component = { minX: width, minY: height, maxX: 0, maxY: 0, area: 0 }
  while (stack.length > 0) {
    const index = stack.pop() as number
    const x = index % width
    const y = (index - x) / width
    component.area += 1
    component.minX = Math.min(component.minX, x)
    component.maxX = Math.max(component.maxX, x)
    component.minY = Math.min(component.minY, y)
    component.maxY = Math.max(component.maxY, y)
    for (const next of [index - 1, index + 1, index - width, index + width]) {
      const neighbourX = next % width
      if (next < 0 || next >= ink.length || seen[next] || !ink[next] || Math.abs(neighbourX - x) > 1) continue
      seen[next] = 1
      stack.push(next)
    }
  }
  return component
}

function asRoundBlob({ minX, minY, maxX, maxY, area }: Component): Blob | null {
  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const size = (width + height) / 2
  const squareEnough = width / height > 0.8 && width / height < 1.25
  const fill = area / (width * height)
  if (size < smallestPhoto || !squareEnough || fill < circleFill.least || fill > circleFill.most) return null
  return { left: minX, top: minY, size }
}

/** Photos share a left edge and a size; group blobs that do. */
function groupIntoColumns(blobs: Blob[]): Blob[][] {
  const columns: Blob[][] = []
  for (const blob of [...blobs].sort((a, b) => a.left - b.left)) {
    const column = columns.find((candidate) => Math.abs(candidate[0].left - blob.left) <= blob.size * 0.3 && Math.abs(candidate[0].size - blob.size) <= blob.size * 0.25)
    if (column) column.push(blob)
    else columns.push([blob])
  }
  const repeated = columns.filter((column) => column.length >= 2)
  return repeated.length > 0 ? repeated : columns
}

function medianSize(column: Blob[]): number {
  const sizes = column.map((blob) => blob.size).sort((a, b) => a - b)
  return sizes[Math.floor(sizes.length / 2)]
}

/** Anything that isn't one of the page's two main background colours (the card and the page behind it). */
function inkMask({ data, width, height }: Pixels): Uint8Array {
  const [first, second] = backgroundColours(data, width * height)
  const ink = new Uint8Array(width * height)
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4
    const colour = [data[offset], data[offset + 1], data[offset + 2]]
    ink[index] = distance(colour, first) > 45 && distance(colour, second) > 45 ? 1 : 0
  }
  return ink
}

function backgroundColours(data: Pixels['data'], pixelCount: number): number[][] {
  const counts = new Map<number, number>()
  for (let index = 0; index < pixelCount; index += 7) {
    const offset = index * 4
    const key = ((data[offset] >> 3) << 10) | ((data[offset + 1] >> 3) << 5) | (data[offset + 2] >> 3)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const [first, second = first] = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => [((key >> 10) & 31) * 8 + 4, ((key >> 5) & 31) * 8 + 4, (key & 31) * 8 + 4])
  return [first, second]
}

function distance(a: number[], b: number[]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
}
