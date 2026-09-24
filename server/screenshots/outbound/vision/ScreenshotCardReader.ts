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

const readableTextHeight = 30
const nameToPhotoRatio = 0.3
const legibleShareOfAPrintedName = 0.5

interface NameStrip {
  left: number
  top: number
  firstRowTop: number
  width: number
  height: number
  scale: number
  cutWordEdge: number
  paper: Paper
}

interface Paper {
  above: number
  below: number
  image: Buffer
  screenshotHeight: number
}

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
    const rows = names.map((name) => ({ name, photo: photoFor(name, photos) }))
    const drop = nameDrop(rows.filter(({ photo }) => photos.includes(photo)))
    return rows
      .filter(({ name, photo }) => !hasLostItsName(photo, { textBeside: name, nameDrop: drop }))
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

async function withoutPaperMargins(image: Buffer): Promise<{ pixels: Pixels; paper: Paper }> {
  const page = await decode(image)
  const { top, height } = screenshotOnThePage(page)
  const paper = { above: top, below: page.height - top - height, image, screenshotHeight: height }
  return { pixels: { ...page, data: page.data.subarray(top * page.width * 4, (top + height) * page.width * 4), height }, paper }
}

function endsAtAPageBreak({ below }: Paper): boolean {
  return below > 0
}

async function decode(image: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

function nameStripBeside(photos: AvatarCircle[], pitch: number, pixels: Pixels): Omit<NameStrip, 'paper'> {
  const diameter = photos[0].radius * 2
  const left = Math.round(leftmostRightEdge(photos) + diameter * 0.12)
  const width = Math.min(pixels.width - left, Math.round(diameter * 18))
  const firstRowTop = gapBetweenRowsAbove(pixels, startOfTheText(left, photos), Math.max(0, photos[0].centreY - pitch * 2.5), pitch)
  const scale = Math.min(6, Math.max(1, Math.round(readableTextHeight / (diameter * nameToPhotoRatio))))
  return { left, top: 0, firstRowTop, width, height: pixels.height, scale, cutWordEdge: diameter * 0.07 }
}

function startOfTheText(left: number, photos: AvatarCircle[]): { left: number; right: number } {
  return { left, right: left + photos[0].radius * 6 }
}

function leftmostRightEdge(photos: AvatarCircle[]): number {
  const edges = photos.map((photo) => photo.centreX + photo.radius).sort((a, b) => a - b)
  const typical = edges[Math.floor(edges.length / 2)]
  return edges.find((edge) => typical - edge <= photos[0].radius * 0.3) ?? typical
}

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

function onThePrintedPage({ top, height, paper }: NameStrip): { top: number; height: number } {
  const pageTop = top === 0 ? 0 : top + paper.above
  const pageBottom = top + height + paper.above + (top + height >= paper.screenshotHeight ? paper.below : 0)
  return { top: pageTop, height: pageBottom - pageTop }
}

function isAName(name: NameBlock, photos: AvatarCircle[]): boolean {
  const photo = photos.find((candidate) => sitsBeside(name, candidate))
  return !photo || startsLevelWithTheTopOf(name, photo)
}

function nameDrop(rows: { name: NameBlock; photo: AvatarCircle }[]): number {
  const drops = rows.map(({ name, photo }) => name.top - (photo.centreY - photo.radius)).sort((a, b) => a - b)
  return drops[Math.floor(drops.length / 2)] ?? 0
}

function photoFor(name: NameBlock, photos: AvatarCircle[]): AvatarCircle {
  const centre = (name.top + name.bottom) / 2
  const nearest = [...photos].sort((a, b) => Math.abs(a.centreY - centre) - Math.abs(b.centreY - centre))[0]
  if (sitsBeside(name, nearest)) return nearest
  return { centreX: nearest.centreX, centreY: centre, radius: nearest.radius }
}

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
