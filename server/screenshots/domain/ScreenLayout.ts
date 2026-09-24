import type { AvatarCircle, Pixels } from './FrameDetection.ts'

export interface TextBox {
  text: string
  x0: number
  y0: number
  x1: number
  y1: number
  confidence: number
}

interface TextLine extends TextBox {
  height: number
  bestConfidence: number
}

const notAHeadline = /^(followed by|\d+ mutual|and \d+ others|follow|following|message|connect|pending|connected on)\b/i
const trustworthyConfidence = 60

const actionButton = /^(follow|following|message|connect|pending|remove)$/i
const sharedConnections = /\bfollowed by\b|\bmutual connections?\b/i
const listHeading = /(^|'s )network$|^(following|followers|connections)$|people (are following you|you follow)|^[\d,]+ (followers|connections)$/i

export interface NameBlock {
  displayName: string
  headline: string | null
  top: number
  bottom: number
  headlineBottom?: number
}

export function readNameStrip(words: TextBox[], rowPitch: number, photos: AvatarCircle[] = []): NameBlock[] {
  const lines = groupIntoLines(withoutSlivers(words).filter(couldBeAWord)).filter(isReadableLine)
  const listLines = linesOfTheList(lines, rowPitch).sort((a, b) => a.y0 - b.y0)
  return splitIntoBlocksBy(listLines, { gapBetweenPeople: rowPitch * 0.3, names: namesLevelWithPhotos(listLines, photos) }).map(toNameBlock)
}

function namesLevelWithPhotos(lines: TextLine[], photos: AvatarCircle[]): Set<TextLine> {
  const names = new Set<TextLine>()
  for (const photo of photos) {
    const top = photo.centreY - photo.radius
    const nearest = [...lines].sort((a, b) => Math.abs(a.y0 - top) - Math.abs(b.y0 - top))[0]
    if (nearest && Math.abs(nearest.y0 - top) <= photo.radius * 0.5) names.add(nearest)
  }
  return names
}

export function photosWithoutAName(photos: AvatarCircle[], names: NameBlock[]): AvatarCircle[] {
  return photos.filter((photo) => !names.some((name) => sitsBeside(name, photo)))
}

export function sitsBeside(name: NameBlock, photo: AvatarCircle): boolean {
  return Math.abs(photo.centreY - (name.top + name.bottom) / 2) <= photo.radius * 1.2
}

export function startsLevelWithTheTopOf(name: NameBlock, photo: AvatarCircle): boolean {
  return Math.abs(name.top - (photo.centreY - photo.radius)) <= photo.radius * 0.5
}

export function gapBetweenRowsAbove(pixels: Pixels, { left, right }: { left: number; right: number }, y: number, rowPitch: number): number {
  const gapBetweenPeople = Math.max(2, Math.round(rowPitch * 0.2))
  let blankRows = 0
  for (let row = Math.min(pixels.height - 1, Math.round(y)); row >= 0; row -= 1) {
    blankRows = hasText(pixels, row, left, right) ? 0 : blankRows + 1
    if (blankRows >= gapBetweenPeople) return row + Math.floor(gapBetweenPeople / 2)
  }
  return 0
}

export function isCutByTheTop(pixels: Pixels, { left, right }: { left: number; right: number }, name: NameBlock, rowPitch: number): boolean {
  const gapBetweenPeople = Math.max(2, Math.round(rowPitch * 0.2))
  let blankRows = 0
  for (let row = Math.round(name.top) - 1; row >= 0; row -= 1) {
    blankRows = hasText(pixels, row, left, right) ? 0 : blankRows + 1
    if (blankRows >= gapBetweenPeople) return false
  }
  return blankRows < Math.round(name.top)
}

function hasText({ data, width }: Pixels, row: number, left: number, right: number): boolean {
  for (let x = Math.max(0, left); x < Math.min(width, right); x += 2) {
    const offset = (row * width + x) * 4
    if (data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114 < 170) return true
  }
  return false
}

export function isCutByTheBottom(pixels: Pixels, { left, right }: { left: number; right: number }, name: NameBlock, lineHeight: number): boolean {
  return name.top + lineHeight > pixels.height && hasText(pixels, pixels.height - 1, left, right)
}

export function withoutACutTitle(name: NameBlock, imageHeight: number): NameBlock {
  return (name.headlineBottom ?? name.bottom) >= imageHeight - 2 ? { ...name, headline: null } : name
}

export function hasATitle(name: NameBlock): boolean {
  return name.headline !== null
}

function linesOfTheList(lines: TextLine[], rowPitch: number): TextLine[] {
  const tolerance = rowPitch * 0.12
  const startsNear = (edge: number) => lines.filter((line) => Math.abs(line.x0 - edge) <= tolerance)
  const edge = lines.map((line) => line.x0).sort((a, b) => startsNear(b).length - startsNear(a).length || a - b)[0]
  if (edge === undefined) return []
  const aligned = startsNear(edge)
  const nudged = lines.filter((line) => line.x0 - edge > tolerance && (hasTitleUnder(line, aligned, rowPitch) || hasNameAbove(line, aligned, rowPitch)))
  return [...aligned, ...nudged]
}

function hasTitleUnder(name: TextLine, aligned: TextLine[], rowPitch: number): boolean {
  return aligned.some((line) => line.y0 >= name.y1 && line.y0 - name.y1 <= rowPitch * 0.2 && isNudgedRightOf(name, line, rowPitch))
}

function hasNameAbove(title: TextLine, aligned: TextLine[], rowPitch: number): boolean {
  return aligned.some((line) => title.y0 >= line.y1 && title.y0 - line.y1 <= rowPitch * 0.2 && isNudgedRightOf(title, line, rowPitch))
}

function isNudgedRightOf(line: TextLine, neighbour: TextLine, rowPitch: number): boolean {
  return line.x0 > neighbour.x0 && line.x0 - neighbour.x0 <= Math.max(rowPitch * 0.3, line.height * 2.5)
}

function isReadableLine(line: TextLine): boolean {
  return line.bestConfidence >= trustworthyConfidence && /[A-Za-z]{2}/.test(line.text) && !actionButton.test(line.text) && !listHeading.test(line.text) && !sharedConnections.test(line.text)
}

function toNameBlock(block: TextLine[]): NameBlock {
  const [name, ...rest] = block
  const headline = rest.find((line) => !notAHeadline.test(line.text))
  return {
    displayName: cleanName(name.text),
    headline: headline?.text ?? null,
    top: block[0].y0,
    bottom: (block.at(-1) as TextLine).y1,
    ...(headline ? { headlineBottom: headline.y1 } : {}),
  }
}

function splitIntoBlocksBy(lines: TextLine[], { gapBetweenPeople, names }: { gapBetweenPeople: number; names: Set<TextLine> }): TextLine[][] {
  const blocks: TextLine[][] = []
  for (const line of lines) {
    const current = blocks.at(-1)
    const previous = current?.at(-1)
    if (current && previous && line.y0 - previous.y1 <= gapBetweenPeople && !names.has(line)) current.push(line)
    else blocks.push([line])
  }
  return blocks
}

function withoutSlivers(words: TextBox[]): TextBox[] {
  const heights = words.map((word) => word.y1 - word.y0).sort((a, b) => a - b)
  const typicalHeight = heights[Math.floor(heights.length / 2)] ?? 0
  return words.filter((word) => word.y1 - word.y0 >= typicalHeight * 0.4)
}

function couldBeAWord(word: TextBox): boolean {
  const trusted = word.confidence >= trustworthyConfidence && (/[A-Za-z]{2}/.test(word.text) || /^[A-Z]\.$/.test(word.text))
  return trusted || /^[@©®]?\p{L}{2,}([-'’]\p{L}+)*$/u.test(word.text)
}

export function groupIntoLines(words: TextBox[]): TextLine[] {
  const sorted = [...words].sort((a, b) => a.x0 - b.x0)
  const lines: TextLine[] = []
  for (const word of sorted) {
    const line = lines.find((candidate) => continuesLine(candidate, word))
    if (line) Object.assign(line, joinWord(line, word))
    else lines.push({ ...word, text: word.text.trim(), height: word.y1 - word.y0, bestConfidence: word.confidence })
  }
  return lines
}

function continuesLine(line: TextLine, word: TextBox): boolean {
  const centre = (word.y0 + word.y1) / 2
  const horizontalGap = Math.max(word.x0 - line.x1, line.x0 - word.x1)
  return centre > line.y0 && centre < line.y1 && horizontalGap < line.height * 1.6
}

function joinWord(line: TextLine, word: TextBox): TextLine {
  return {
    text: word.x0 >= line.x0 ? `${line.text} ${word.text.trim()}` : `${word.text.trim()} ${line.text}`,
    x0: Math.min(line.x0, word.x0),
    y0: Math.min(line.y0, word.y0),
    x1: Math.max(line.x1, word.x1),
    y1: Math.max(line.y1, word.y1),
    height: Math.max(line.height, word.y1 - word.y0),
    confidence: Math.min(line.confidence, word.confidence),
    bestConfidence: Math.max(line.bestConfidence, word.confidence),
  }
}

export function cleanName(text: string): string {
  return text
    .replace(/^[“”"'‘’«»@©®]+\s*/, '')
    .replace(/\s*[•·]\s*(1st|2nd|3rd\+?)\s*$/i, '')
    .replace(/\s*\((he|she|they)\/\w+\)\s*$/i, '')
    .trim()
}
