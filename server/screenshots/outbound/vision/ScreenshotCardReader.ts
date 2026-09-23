import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createWorker, PSM, type Worker } from 'tesseract.js'
import type { DetectedCard } from '../../domain/Deduplication.ts'
import { locateAvatar, type Pixels, readFrames } from '../../domain/FrameDetection.ts'
import { findPersonRows, type PersonRow, type TextBox } from '../../domain/ScreenLayout.ts'
import type { CardReader } from './CardReader.ts'

/** Fewer rows than this on the first pass suggests tiny zoomed-out text, so the image is read again at double size. */
const rowsWorthTrusting = 2

/**
 * Driven adapter: reads a screenshot with sharp (pixels) and tesseract.js (OCR, offline once its English
 * data has been downloaded to data/ocr/ on first use). No face recognition: only visible text and frame colour.
 */
export const screenshotCardReader = (cacheFolder = path.resolve('data/ocr')): CardReader => {
  let worker: Promise<Worker> | null = null
  const ocr = () => {
    mkdirSync(cacheFolder, { recursive: true })
    worker ??= createWorker('eng', 1, { cachePath: cacheFolder, logger: () => undefined }).then(async (created) => {
      // Sparse-text mode: UI screenshots are scattered labels, not paragraphs of prose.
      await created.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
      return created
    })
    return worker
  }

  const readCards = async (image: Buffer, fileName: string): Promise<DetectedCard[]> => {
    const pixels = await decode(image)
    const firstPass = findPersonRows(await readWords(await ocr(), image, 1))
    const rows = firstPass.length >= rowsWorthTrusting ? firstPass : findPersonRows(await readWords(await ocr(), await enlarge(image, pixels), 2))
    return rows.flatMap((row) => toCard(row, pixels, fileName))
  }

  return { readCards }
}

async function decode(image: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

async function enlarge(image: Buffer, { width }: Pixels): Promise<Buffer> {
  return sharp(image).resize({ width: width * 2 }).png().toBuffer()
}

async function readWords(worker: Worker, image: Buffer, scale: number): Promise<TextBox[]> {
  const { data } = await worker.recognize(image, {}, { blocks: true })
  return (data.blocks ?? [])
    .flatMap((block) => block.paragraphs)
    .flatMap((paragraph) => paragraph.lines)
    .flatMap((line) => line.words)
    .map((word) => ({ text: word.text, confidence: word.confidence, x0: word.bbox.x0 / scale, y0: word.bbox.y0 / scale, x1: word.bbox.x1 / scale, y1: word.bbox.y1 / scale }))
}

function toCard(row: PersonRow, pixels: Pixels, fileName: string): DetectedCard[] {
  const avatar = locateAvatar(pixels, row.textLeft, row.top, row.bottom)
  if (!avatar) return []
  return [{ screenshotFileName: fileName, displayName: row.displayName, headline: row.headline, companyName: null, ...readFrames(pixels, avatar) }]
}
