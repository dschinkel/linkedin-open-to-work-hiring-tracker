import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createWorker, PSM, type Worker } from 'tesseract.js'
import { findAvatarColumn, hasLostItsName, rowSpacing, sitsOnThePage } from '../../domain/AvatarColumn.ts'
import type { DetectedCard } from '../../domain/Deduplication.ts'
import { type AvatarCircle, type Pixels, readFrames } from '../../domain/FrameDetection.ts'
import { screenshotOnThePage } from '../../domain/PaperMargins.ts'
import { photoPrint } from '../../domain/PhotoPrint.ts'
import { gapBetweenRowsAbove, hasATitle, isCutByTheBottom, isCutByTheTop, type NameBlock, photosWithoutAName, readNameStrip, sitsBeside, startsLevelWithTheTopOf, type TextBox, withoutACutTitle } from '../../domain/ScreenLayout.ts'
import type { CardReader } from './CardReader.ts'

/** OCR reads best when letters are about this many pixels tall. */
const readableTextHeight = 30
/** On LinkedIn lists a name is roughly this fraction of the photo's height. */
const nameToPhotoRatio = 0.3
/**
 * How much of a line a name cut by a PDF page break must show to be read. The next page has only the rest of the row
 * (a photo that lost its name), so a name cut at its foot is kept rather than lost; screenshots overlap, and there a
 * cut name waits for the next screenshot, where it shows whole.
 */
const legibleShareOfAPrintedName = 0.5

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
  /** The blank paper around a screenshot printed on a PDF page; none around a screenshot. */
  paper: Paper
}

/**
 * The blank paper above and below a screenshot printed on a PDF page, in the image as uploaded. OCR reads the page as
 * printed, paper and all: a name a page break cut at its foot reads only with the paper under it, not with its
 * letters running into the edge of the image.
 */
interface Paper {
  above: number
  below: number
  image: Buffer
  screenshotHeight: number
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
    const { pixels, paper } = await withoutPaperMargins(image)
    const photos = findAvatarColumn(pixels)
    if (photos.length === 0) return []
    const names = await readWholeNames(await ocr(), { pixels, photos, paper })
    return names
      .map((name) => ({ name, photo: photoFor(name, photos) }))
      .filter(({ photo }) => !hasLostItsName(photo))
      .filter(({ photo }) => photos.includes(photo) || sitsOnThePage(pixels, photo))
      .map(({ name, photo }) => toCard(name, { photo, wasFound: photos.includes(photo) }, pixels, fileName))
  }

  return { readCards }
}

interface Screenshot {
  pixels: Pixels
  photos: AvatarCircle[]
  paper: Paper
}

/**
 * Every name beside the photo column, top to bottom: read with the whole page, then any row whose photo got no name
 * read by itself. Names cut through by the top or bottom of the image are left out; the person shows whole in the
 * screenshot before or after. A PDF page break shows each row once, so there a name cut only at its foot is kept.
 */
async function readWholeNames(worker: Worker, { pixels, photos, paper }: Screenshot): Promise<NameBlock[]> {
  const pitch = rowSpacing(photos)
  const strip = { ...nameStripBeside(photos, pitch, pixels), paper }
  const namesOnThePage = readNameStrip(await readStrip(worker, strip), pitch, photos).filter((name) => isAName(name, photos))
  const unreadRows = photosWithoutAName(photos, namesOnThePage).filter((photo) => !hasLostItsName(photo))
  const namesReadAlone = await readRowsAlone(worker, { strip, pitch, photos: unreadRows })
  const lineHeight = photos[0].radius * 2 * nameToPhotoRatio * (endsAtAPageBreak(paper) ? legibleShareOfAPrintedName : 1)
  const textColumn = startOfTheText(strip.left, photos)
  return [...namesOnThePage, ...namesReadAlone]
    .filter((name) => name.top >= strip.firstRowTop || hasATitle(name))
    .filter((name) => !isCutByTheBottom(pixels, textColumn, name, lineHeight) && !isCutByTheTop(pixels, textColumn, name, pitch))
    .map((name) => withoutACutTitle(name, pixels.height))
    .sort((a, b) => a.top - b.top)
}

/** Only the screenshot, where it was printed on a PDF page: the edges of the page's blank paper are not its edges. */
async function withoutPaperMargins(image: Buffer): Promise<{ pixels: Pixels; paper: Paper }> {
  const page = await decode(image)
  const { top, height } = screenshotOnThePage(page)
  const paper = { above: top, below: page.height - top - height, image, screenshotHeight: height }
  return { pixels: { ...page, data: page.data.subarray(top * page.width * 4, (top + height) * page.width * 4), height }, paper }
}

/** Paper under the screenshot: the bottom of the screenshot is a page break, and no other page shows the row it cuts. */
function endsAtAPageBreak({ below }: Paper): boolean {
  return below > 0
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
function nameStripBeside(photos: AvatarCircle[], pitch: number, pixels: Pixels): Omit<NameStrip, 'paper'> {
  const diameter = photos[0].radius * 2
  const left = Math.round(leftmostRightEdge(photos) + diameter * 0.12)
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

/**
 * The photos' right edge, where it is furthest left: a full-page capture is stitched from scrolled screenshots, and a
 * seam can land the rows below it a few pixels left of those above, names and all. Starting the strip right of the
 * rows further right would cut the first letters off the names below the seam. One photo read well off-centre (much
 * further left than the rest) must not push the strip into the photos.
 */
function leftmostRightEdge(photos: AvatarCircle[]): number {
  const edges = photos.map((photo) => photo.centreX + photo.radius).sort((a, b) => a - b)
  const typical = edges[Math.floor(edges.length / 2)]
  return edges.find((edge) => typical - edge <= photos[0].radius * 0.3) ?? typical
}

/**
 * OCR weighs each row against the whole page, so a faint or unusual row (a trademark sign after a name, an emoji
 * before a title) can come out too unsure to count. Read such a row again by itself beside its photo, as it is and
 * then enlarged twice as much (OCR is surer of some rows at one size, some at the other), and keep it only when its
 * name was read: a title alone is not a name.
 */
async function readRowsAlone(worker: Worker, { strip, pitch, photos }: { strip: NameStrip; pitch: number; photos: AvatarCircle[] }): Promise<NameBlock[]> {
  const names: NameBlock[] = []
  for (const photo of photos) {
    const top = Math.max(strip.top, Math.round(photo.centreY - pitch / 2))
    const bottom = Math.min(strip.top + strip.height, Math.round(photo.centreY + pitch / 2))
    for (const scale of [strip.scale, Math.min(6, strip.scale * 2)]) {
      const row = readNameStrip(await readStrip(worker, { ...strip, top, height: bottom - top, scale }), pitch, [photo])
      const named = row.filter((name) => sitsBeside(name, photo) && startsLevelWithTheTopOf(name, photo))
      names.push(...named)
      if (named.length > 0) break
    }
  }
  return names
}

async function readStrip(worker: Worker, strip: NameStrip): Promise<TextBox[]> {
  const { top, height } = onThePrintedPage(strip)
  const enlarged = await sharp(strip.paper.image)
    .extract({ left: strip.left, top, width: strip.width, height })
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
      y0: top - strip.paper.above + word.bbox.y0 / strip.scale,
      x1: strip.left + word.bbox.x1 / strip.scale,
      y1: top - strip.paper.above + word.bbox.y1 / strip.scale,
    }))
}

/** Where a strip of the screenshot lies on the page as uploaded, with the paper beyond it where it reaches an edge. */
function onThePrintedPage({ top, height, paper }: NameStrip): { top: number; height: number } {
  const pageTop = top === 0 ? 0 : top + paper.above
  const pageBottom = top + height + paper.above + (top + height >= paper.screenshotHeight ? paper.below : 0)
  return { top: pageTop, height: pageBottom - pageTop }
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
