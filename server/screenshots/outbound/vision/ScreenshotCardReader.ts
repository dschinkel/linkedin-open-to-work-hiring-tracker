import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createWorker, PSM, type Worker } from 'tesseract.js'
import { findAvatarColumn } from '../../domain/AvatarColumn.ts'
import type { DetectedCard } from '../../domain/Deduplication.ts'
import { type AvatarCircle, type Pixels, readFrames } from '../../domain/FrameDetection.ts'
import { type NameBlock, readNameStrip, type TextBox } from '../../domain/ScreenLayout.ts'
import type { CardReader } from './CardReader.ts'

/** OCR reads best when letters are about this many pixels tall. */
const readableTextHeight = 30
/** On LinkedIn lists a name is roughly this fraction of the photo's height. */
const nameToPhotoRatio = 0.3

interface NameStrip {
  left: number
  top: number
  width: number
  height: number
  scale: number
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
    const pitch = rowPitch(photos)
    const strip = nameStripBeside(photos, pitch, pixels)
    const names = readNameStrip(await readStrip(await ocr(), image, strip), pitch)
    return names.map((name) => toCard(name, photoFor(name, photos), pixels, fileName))
  }

  return { readCards }
}

async function decode(image: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

function rowPitch(photos: AvatarCircle[]): number {
  const gaps = photos.slice(1).map((photo, index) => photo.centreY - photos[index].centreY).sort((a, b) => a - b)
  return gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : photos[0].radius * 3
}

/** The text column right of the photos, from a row above the first photo to a row below the last (for empty photos). */
function nameStripBeside(photos: AvatarCircle[], pitch: number, { width, height }: Pixels): NameStrip {
  const diameter = photos[0].radius * 2
  const left = Math.round(Math.max(...photos.map((photo) => photo.centreX + photo.radius)) + diameter * 0.12)
  const top = Math.max(0, Math.round(photos[0].centreY - pitch * 1.5))
  const bottom = Math.min(height, Math.round((photos.at(-1) as AvatarCircle).centreY + pitch * 1.5))
  const scale = Math.min(6, Math.max(1, Math.round(readableTextHeight / (diameter * nameToPhotoRatio))))
  return { left, top, width: Math.min(width - left, Math.round(diameter * 18)), height: bottom - top, scale }
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
    .map((word) => ({
      text: word.text,
      confidence: word.confidence,
      x0: strip.left + word.bbox.x0 / strip.scale,
      y0: strip.top + word.bbox.y0 / strip.scale,
      x1: strip.left + word.bbox.x1 / strip.scale,
      y1: strip.top + word.bbox.y1 / strip.scale,
    }))
}

/** The photo on this person's row; for an empty photo that wasn't found, the spot where it sits. */
function photoFor(name: NameBlock, photos: AvatarCircle[]): AvatarCircle {
  const centre = (name.top + name.bottom) / 2
  const nearest = [...photos].sort((a, b) => Math.abs(a.centreY - centre) - Math.abs(b.centreY - centre))[0]
  if (Math.abs(nearest.centreY - centre) <= nearest.radius * 1.2) return nearest
  return { centreX: nearest.centreX, centreY: centre, radius: nearest.radius }
}

function toCard(name: NameBlock, photo: AvatarCircle, pixels: Pixels, fileName: string): DetectedCard {
  return { screenshotFileName: fileName, displayName: name.displayName, headline: name.headline, companyName: null, ...readFrames(pixels, photo) }
}
