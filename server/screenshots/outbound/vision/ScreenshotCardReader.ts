import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createWorker, PSM, type Worker } from 'tesseract.js'
import { findAvatarColumn, hasLostItsName, rowSpacing, sitsOnThePage } from '../../domain/AvatarColumn.ts'
import type { DetectedCard } from '../../domain/Deduplication.ts'
import { type AvatarCircle, type Pixels, readFrames } from '../../domain/FrameDetection.ts'
import { photoPrint } from '../../domain/PhotoPrint.ts'
import { gapBetweenRowsAbove, hasATitle, isCutByTheBottom, isCutByTheTop, type NameBlock, photosWithoutAName, readNameStrip, sitsBeside, startsLevelWithTheTopOf, type TextBox, withoutACutTitle } from '../../domain/ScreenLayout.ts'
import type { CardReader } from './CardReader.ts'

/** OCR reads best when letters are about this many pixels tall. */
const readableTextHeight = 30
/** On LinkedIn lists a name is roughly this fraction of the photo's height. */
const nameToPhotoRatio = 0.3

interface NameStrip {
  left: number
  top: number
  /** Where the rows beside the photos found begin; above it only people with a title count. */
  firstRowTop: number
  width: number
  height: number
  scale: number
  /** Real text starts this far in; a word starting closer to the left edge was cut by it. */
  cutWordEdge: number
}

/**
 * Driven adapter. Finds the column of profile photos, reads the strip of text beside it (enlarged so small,
 * zoomed-out text becomes readable), and treats every name there as one person. Their photo, empty or not,
 * gives the #OPENTOWORK / #HIRING reading. OCR is tesseract.js, offline after a one-time download to data/ocr/.
 */
export const screenshotCardReader = (cacheFolder = path.resolve('data/ocr')): CardReader => {
  let worker: Promise<Worker> | null = null
  const ocr = () => {
    mkdirSync(cacheFolder, { recursive: true })
    worker ??= createWorker('eng', 1, { cachePath: cacheFolder, logger: () => undefined }).then(async (created) => {
      await created.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
      return created
    })
    return worker
  }

  const readCards = async (image: Buffer, fileName: string): Promise<DetectedCard[]> => {
    const pixels = await decode(image)
    const photos = findAvatarColumn(pixels)
    if (photos.length === 0) return []
    const names = await readWholeNames(await ocr(), { image, pixels, photos })
    return names
      .map((name) => ({ name, photo: photoFor(name, photos) }))
      .filter(({ photo }) => !hasLostItsName(photo))
      .filter(({ photo }) => photos.includes(photo) || sitsOnThePage(pixels, photo))
      .map(({ name, photo }) => toCard(name, { photo, wasFound: photos.includes(photo) }, pixels, fileName))
  }

  return { readCards }
}

interface Screenshot {
  image: Buffer
  pixels: Pixels
  photos: AvatarCircle[]
}

/**
 * Every name beside the photo column, top to bottom: read with the whole page, then any row whose photo got no name
 * read by itself. Names cut through by the top or bottom of the image are left out; the person shows whole in the
 * screenshot before or after.
 */
async function readWholeNames(worker: Worker, { image, pixels, photos }: Screenshot): Promise<NameBlock[]> {
  const pitch = rowSpacing(photos)
  const strip = nameStripBeside(photos, pitch, pixels)
  const namesOnThePage = readNameStrip(await readStrip(worker, image, strip), pitch).filter((name) => isAName(name, photos))
  const unreadRows = photosWithoutAName(photos, namesOnThePage).filter((photo) => !hasLostItsName(photo))
  const namesReadAlone = await readRowsAlone(worker, image, { strip, pitch, photos: unreadRows })
  const lineHeight = photos[0].radius * 2 * nameToPhotoRatio
  return [...namesOnThePage, ...namesReadAlone]
    .filter((name) => name.top >= strip.firstRowTop || hasATitle(name))
    .filter((name) => !isCutByTheBottom(name, pixels.height, lineHeight) && !isCutByTheTop(pixels, startOfTheText(strip.left, photos), name, pitch))
    .map((name) => withoutACutTitle(name, pixels.height))
    .sort((a, b) => a.top - b.top)
}

async function decode(image: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

/**
 * The whole text column right of the photos, top to bottom: any number of photos in a row can go unfound (light
 * photos blend into the page). The rows beside the photos found begin two rows above the first of them, in the gap
 * between two people there (rows differ in height).
 */
function nameStripBeside(photos: AvatarCircle[], pitch: number, pixels: Pixels): NameStrip {
  const diameter = photos[0].radius * 2
  const left = Math.round(typicalRightEdge(photos) + diameter * 0.12)
  const width = Math.min(pixels.width - left, Math.round(diameter * 18))
  const firstRowTop = gapBetweenRowsAbove(pixels, startOfTheText(left, photos), Math.max(0, photos[0].centreY - pitch * 2.5), pitch)
  const scale = Math.min(6, Math.max(1, Math.round(readableTextHeight / (diameter * nameToPhotoRatio))))
  return { left, top: 0, firstRowTop, width, height: pixels.height, scale, cutWordEdge: diameter * 0.07 }
}

/**
 * Where names and titles begin, just right of the photos: every line of text has its first letters here, and the
 * Follow buttons at the far end, taller than a line, are left out.
 */
function startOfTheText(left: number, photos: AvatarCircle[]): { left: number; right: number } {
  return { left, right: left + photos[0].radius * 6 }
}

/** Most photos' right edge; one photo read a little off-centre must not push the strip into the names. */
function typicalRightEdge(photos: AvatarCircle[]): number {
  const edges = photos.map((photo) => photo.centreX + photo.radius).sort((a, b) => a - b)
  return edges[Math.floor(edges.length / 2)]
}

/**
 * OCR weighs each row against the whole page, so a faint or unusual row (a trademark sign after a name, an emoji
 * before a title) can come out too unsure to count. Read such a row again by itself beside its photo, as it is and
 * then enlarged twice as much (OCR is surer of some rows at one size, some at the other), and keep it only when its
 * name was read: a title alone is not a name.
 */
async function readRowsAlone(worker: Worker, image: Buffer, { strip, pitch, photos }: { strip: NameStrip; pitch: number; photos: AvatarCircle[] }): Promise<NameBlock[]> {
  const names: NameBlock[] = []
  for (const photo of photos) {
    const top = Math.max(strip.top, Math.round(photo.centreY - pitch / 2))
    const bottom = Math.min(strip.top + strip.height, Math.round(photo.centreY + pitch / 2))
    for (const scale of [strip.scale, Math.min(6, strip.scale * 2)]) {
      const row = readNameStrip(await readStrip(worker, image, { ...strip, top, height: bottom - top, scale }), pitch)
      const named = row.filter((name) => sitsBeside(name, photo) && startsLevelWithTheTopOf(name, photo))
      names.push(...named)
      if (named.length > 0) break
    }
  }
  return names
}

async function readStrip(worker: Worker, image: Buffer, strip: NameStrip): Promise<TextBox[]> {
  const enlarged = await sharp(image)
    .extract({ left: strip.left, top: strip.top, width: strip.width, height: strip.height })
    .resize({ width: strip.width * strip.scale, kernel: 'lanczos3' })
    .grayscale()
    .normalise()
    .png()
    .toBuffer()
  const { data } = await worker.recognize(enlarged, {}, { blocks: true })
  return (data.blocks ?? [])
    .flatMap((block) => block.paragraphs)
    .flatMap((paragraph) => paragraph.lines)
    .flatMap((line) => line.words)
    .filter((word) => word.bbox.x0 / strip.scale >= strip.cutWordEdge)
    .map((word) => ({
      text: word.text,
      confidence: word.confidence,
      x0: strip.left + word.bbox.x0 / strip.scale,
      y0: strip.top + word.bbox.y0 / strip.scale,
      x1: strip.left + word.bbox.x1 / strip.scale,
      y1: strip.top + word.bbox.y1 / strip.scale,
    }))
}

/** Text beside a photo found in the column must start level with its top; lower down, it is a title whose name went unread. */
function isAName(name: NameBlock, photos: AvatarCircle[]): boolean {
  const photo = photos.find((candidate) => sitsBeside(name, candidate))
  return !photo || startsLevelWithTheTopOf(name, photo)
}

/** The photo on this person's row; for an empty photo that wasn't found, the spot where it sits. */
function photoFor(name: NameBlock, photos: AvatarCircle[]): AvatarCircle {
  const centre = (name.top + name.bottom) / 2
  const nearest = [...photos].sort((a, b) => Math.abs(a.centreY - centre) - Math.abs(b.centreY - centre))[0]
  if (sitsBeside(name, nearest)) return nearest
  return { centreX: nearest.centreX, centreY: centre, radius: nearest.radius }
}

/**
 * The person's card. Their photo print comes only from a photo found in the column: where the photo is only a guessed
 * spot (too light to find, or cut off by the edge of the screenshot), a print would be of whatever is there instead.
 */
function toCard(name: NameBlock, { photo, wasFound }: { photo: AvatarCircle; wasFound: boolean }, pixels: Pixels, fileName: string): DetectedCard {
  return {
    screenshotFileName: fileName,
    displayName: name.displayName,
    headline: name.headline,
    companyName: null,
    ...readFrames(pixels, photo),
    photoPrint: wasFound ? photoPrint(pixels, photo) : null,
  }
}
