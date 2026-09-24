import type { AvatarCircle, Pixels } from './FrameDetection.ts'

/** A word found by OCR, with its box in image pixels and how sure OCR was (0–100). */
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
  /** How sure OCR was of the clearest word on the line. */
  bestConfidence: number
}

/** Lines under a name that are not the person's title: shared connections, buttons, and the date a connection was made. */
const notAHeadline = /^(followed by|\d+ mutual|and \d+ others|follow|following|message|connect|pending|connected on)\b/i
const trustworthyConfidence = 60

const actionButton = /^(follow|following|message|connect|pending|remove)$/i
/** "Followed by Sam and John" or "12 mutual connections" under a title; the little faces before it can read as letters ("Hp Followed by…"). */
const sharedConnections = /\bfollowed by\b|\bmutual connections?\b/i
/** LinkedIn's own heading above the list: "Dave's Network", "Following  Followers", "1,452 people are following you". */
const listHeading = /(^|'s )network$|^(following|followers|connections)$|people (are following you|you follow)|^[\d,]+ (followers|connections)$/i

/** One person's text as read beside the photo column: name first, then title. */
export interface NameBlock {
  displayName: string
  headline: string | null
  top: number
  bottom: number
  /** Where the title's line ends, when it isn't the last line of the block. */
  headlineBottom?: number
}

/**
 * Every name in the strip of text beside the photo column is one person, whether or not their photo is empty.
 * Lines that sit close together belong to one person; a bigger gap starts the next person, and so does the line
 * nearest the top of a photo found in the column (a name starts level with it), however small the gap above it: on
 * some lists (Connections) a title wraps and a date follows it, leaving only a sliver between two people.
 */
export function readNameStrip(words: TextBox[], rowPitch: number, photos: AvatarCircle[] = []): NameBlock[] {
  const lines = groupIntoLines(withoutSlivers(words).filter(couldBeAWord)).filter(isReadableLine)
  const listLines = linesOfTheList(lines, rowPitch).sort((a, b) => a.y0 - b.y0)
  return splitIntoBlocksBy(listLines, { gapBetweenPeople: rowPitch * 0.3, names: namesLevelWithPhotos(listLines, photos) }).map(toNameBlock)
}

/** For each photo, the line starting nearest its top, when that is level with it: the person's name. */
function namesLevelWithPhotos(lines: TextLine[], photos: AvatarCircle[]): Set<TextLine> {
  const names = new Set<TextLine>()
  for (const photo of photos) {
    const top = photo.centreY - photo.radius
    const nearest = [...lines].sort((a, b) => Math.abs(a.y0 - top) - Math.abs(b.y0 - top))[0]
    if (nearest && Math.abs(nearest.y0 - top) <= photo.radius * 0.5) names.add(nearest)
  }
  return names
}

/** Every photo in the column is a person; these are the ones no name was read beside. */
export function photosWithoutAName(photos: AvatarCircle[], names: NameBlock[]): AvatarCircle[] {
  return photos.filter((photo) => !names.some((name) => sitsBeside(name, photo)))
}

/** A person's name and title sit level with their photo, give or take a little. */
export function sitsBeside(name: NameBlock, photo: AvatarCircle): boolean {
  return Math.abs(photo.centreY - (name.top + name.bottom) / 2) <= photo.radius * 1.2
}

/**
 * On LinkedIn a name starts level with the top of its photo and the title sits below it, about halfway down. Text
 * starting that low beside a photo is a title whose name went unread, not a name.
 */
export function startsLevelWithTheTopOf(name: NameBlock, photo: AvatarCircle): boolean {
  return Math.abs(name.top - (photo.centreY - photo.radius)) <= photo.radius * 0.5
}

/**
 * Where to start reading at or above `y` without cutting through anyone's text: the middle of the first blank band
 * tall enough to lie between two people (the gap between a name and its title is much smaller), or the top of the image.
 */
export function gapBetweenRowsAbove(pixels: Pixels, { left, right }: { left: number; right: number }, y: number, rowPitch: number): number {
  const gapBetweenPeople = Math.max(2, Math.round(rowPitch * 0.2))
  let blankRows = 0
  for (let row = Math.min(pixels.height - 1, Math.round(y)); row >= 0; row -= 1) {
    blankRows = hasText(pixels, row, left, right) ? 0 : blankRows + 1
    if (blankRows >= gapBetweenPeople) return row + Math.floor(gapBetweenPeople / 2)
  }
  return 0
}

/**
 * Whether this text is what is left of a row whose name the top of the image cut through: going up from it, there
 * is more text running into the top edge before any gap between people. A name whole at the very top has nothing
 * above it.
 */
export function isCutByTheTop(pixels: Pixels, { left, right }: { left: number; right: number }, name: NameBlock, rowPitch: number): boolean {
  const gapBetweenPeople = Math.max(2, Math.round(rowPitch * 0.2))
  let blankRows = 0
  for (let row = Math.round(name.top) - 1; row >= 0; row -= 1) {
    blankRows = hasText(pixels, row, left, right) ? 0 : blankRows + 1
    if (blankRows >= gapBetweenPeople) return false
  }
  return blankRows < Math.round(name.top)
}

/** Text is dark (black names, grey titles); the grey lines between people and light page colours are not. */
function hasText({ data, width }: Pixels, row: number, left: number, right: number): boolean {
  for (let x = Math.max(0, left); x < Math.min(width, right); x += 2) {
    const offset = (row * width + x) * 4
    if (data[offset] * 0.299 + data[offset + 1] * 0.587 + data[offset + 2] * 0.114 < 170) return true
  }
  return false
}

/**
 * A name starting less than a line of text above the bottom of the image, with its letters running off the bottom
 * edge, was cut through by it, and OCR only guesses at half-letters. The person shows whole in the next screenshot.
 * A name the edge passes just under (a PDF page break between a name and its title) is whole, and on the next page
 * only the title is left.
 */
export function isCutByTheBottom(pixels: Pixels, { left, right }: { left: number; right: number }, name: NameBlock, lineHeight: number): boolean {
  return name.top + lineHeight > pixels.height && hasText(pixels, pixels.height - 1, left, right)
}

/** A title touching the bottom of the image was cut through by it; OCR's guess at its half-letters is left out. */
export function withoutACutTitle(name: NameBlock, imageHeight: number): NameBlock {
  return (name.headlineBottom ?? name.bottom) >= imageHeight - 2 ? { ...name, headline: null } : name
}

/**
 * A person on the list has a title under their name. Above the photos the reader could find, a lone line is more
 * likely LinkedIn's or the browser's own text (the search box, a bookmark) than a person, so only people with a
 * title count there.
 */
export function hasATitle(name: NameBlock): boolean {
  return name.headline !== null
}

/**
 * Names and titles all start at one left edge. Text elsewhere in the strip (the page sidebar, the search box,
 * browser bookmarks) starts somewhere else, and would otherwise bridge the gap between two people. A name or title
 * with an emoji before it starts a little right of the edge, so it counts when a title sits right under it or a
 * name right above it.
 */
function linesOfTheList(lines: TextLine[], rowPitch: number): TextLine[] {
  const tolerance = rowPitch * 0.12
  const startsNear = (edge: number) => lines.filter((line) => Math.abs(line.x0 - edge) <= tolerance)
  const edge = lines.map((line) => line.x0).sort((a, b) => startsNear(b).length - startsNear(a).length || a - b)[0]
  if (edge === undefined) return []
  const aligned = startsNear(edge)
  const nudged = lines.filter((line) => line.x0 - edge > tolerance && (hasTitleUnder(line, aligned, rowPitch) || hasNameAbove(line, aligned, rowPitch)))
  return [...aligned, ...nudged]
}

/** Measured against the lines of its own row, which a stitching seam may have moved a little off the list's edge. */
function hasTitleUnder(name: TextLine, aligned: TextLine[], rowPitch: number): boolean {
  return aligned.some((line) => line.y0 >= name.y1 && line.y0 - name.y1 <= rowPitch * 0.2 && isNudgedRightOf(name, line, rowPitch))
}

function hasNameAbove(title: TextLine, aligned: TextLine[], rowPitch: number): boolean {
  return aligned.some((line) => title.y0 >= line.y1 && title.y0 - line.y1 <= rowPitch * 0.2 && isNudgedRightOf(title, line, rowPitch))
}

/** An emoji before a name or title moves it a little right of the line next to it. */
function isNudgedRightOf(line: TextLine, neighbour: TextLine, rowPitch: number): boolean {
  return line.x0 > neighbour.x0 && line.x0 - neighbour.x0 <= rowPitch * 0.3
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

/** A "word" far shorter than the others is a sliver of letters cut off by the edge of the image, not text. */
function withoutSlivers(words: TextBox[]): TextBox[] {
  const heights = words.map((word) => word.y1 - word.y0).sort((a, b) => a - b)
  const typicalHeight = heights[Math.floor(heights.length / 2)] ?? 0
  return words.filter((word) => word.y1 - word.y0 >= typicalHeight * 0.4)
}

/**
 * A trustworthy word, an initial like the "A." in "Azad A.", or letters OCR was unsure of (accents such as the
 * "ü" in "Jürgen" lower its confidence, and so does an emoji it ran into the name as "@" or a quote mark). Unsure
 * words only count on a line that also has a trustworthy word.
 */
function couldBeAWord(word: TextBox): boolean {
  const trusted = word.confidence >= trustworthyConfidence && (/[A-Za-z]{2}/.test(word.text) || /^[A-Z]\.$/.test(word.text))
  return trusted || /^[@©®“”"'‘’]?\p{L}{2,}$/u.test(word.text)
}

/** Words that sit on the same baseline and close together become one line of text. */
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

/**
 * Drops LinkedIn's connection-degree and pronoun suffixes ("Jane Smith · 2nd", "Jane Smith (She/Her)") and the quote
 * marks and at signs OCR sees in an emoji before a name, so one person reads the same in every screenshot.
 */
export function cleanName(text: string): string {
  return text
    .replace(/^[“”"'‘’«»@©®]+\s*/, '')
    .replace(/\s*[•·]\s*(1st|2nd|3rd\+?)\s*$/i, '')
    .replace(/\s*\((he|she|they)\/\w+\)\s*$/i, '')
    .trim()
}
