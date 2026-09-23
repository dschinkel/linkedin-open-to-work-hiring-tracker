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

const notAHeadline = /^(followed by|\d+ mutual|and \d+ others|follow|following|message|connect|pending)\b/i
const trustworthyConfidence = 60

const actionButton = /^(follow|following|message|connect|pending|remove)$/i
/** LinkedIn's own heading above the list: "Dave's Network", "Following  Followers", "1,452 people are following you". */
const listHeading = /(^|'s )network$|^(following|followers|connections)$|people (are following you|you follow)|^[\d,]+ (followers|connections)$/i

/** One person's text as read beside the photo column: name first, then title. */
export interface NameBlock {
  displayName: string
  headline: string | null
  top: number
  bottom: number
}

/**
 * Every name in the strip of text beside the photo column is one person, whether or not their photo is empty.
 * Lines that sit close together belong to one person; a bigger gap starts the next person.
 */
export function readNameStrip(words: TextBox[], rowPitch: number): NameBlock[] {
  const lines = groupIntoLines(words.filter(couldBeAWord)).filter(isReadableLine)
  const listLines = linesOfTheList(lines, rowPitch).sort((a, b) => a.y0 - b.y0)
  return splitIntoBlocksBy(listLines, rowPitch * 0.3).map(toNameBlock)
}

/**
 * Names and titles all start at one left edge. Text elsewhere in the strip (the page sidebar, the search box,
 * browser bookmarks) starts somewhere else, and would otherwise bridge the gap between two people. A name with
 * an emoji before it starts a little right of the edge, so it counts when a title sits right under it.
 */
function linesOfTheList(lines: TextLine[], rowPitch: number): TextLine[] {
  const tolerance = rowPitch * 0.12
  const startsNear = (edge: number) => lines.filter((line) => Math.abs(line.x0 - edge) <= tolerance)
  const edge = lines.map((line) => line.x0).sort((a, b) => startsNear(b).length - startsNear(a).length || a - b)[0]
  if (edge === undefined) return []
  const aligned = startsNear(edge)
  const nudgedNames = lines.filter((line) => line.x0 - edge > tolerance && line.x0 - edge <= rowPitch * 0.3 && hasTitleUnder(line, aligned, rowPitch))
  return [...aligned, ...nudgedNames]
}

function hasTitleUnder(name: TextLine, aligned: TextLine[], rowPitch: number): boolean {
  return aligned.some((line) => line.y0 >= name.y1 && line.y0 - name.y1 <= rowPitch * 0.2)
}

function isReadableLine(line: TextLine): boolean {
  return line.bestConfidence >= trustworthyConfidence && /[A-Za-z]{2}/.test(line.text) && !actionButton.test(line.text) && !listHeading.test(line.text)
}

function toNameBlock(block: TextLine[]): NameBlock {
  const [name, ...rest] = block
  return {
    displayName: cleanName(name.text),
    headline: rest.find((line) => !notAHeadline.test(line.text))?.text ?? null,
    top: block[0].y0,
    bottom: (block.at(-1) as TextLine).y1,
  }
}

function splitIntoBlocksBy(lines: TextLine[], gapBetweenPeople: number): TextLine[][] {
  const blocks: TextLine[][] = []
  for (const line of lines) {
    const current = blocks.at(-1)
    const previous = current?.at(-1)
    if (current && previous && line.y0 - previous.y1 <= gapBetweenPeople) current.push(line)
    else blocks.push([line])
  }
  return blocks
}

/**
 * A trustworthy word, an initial like the "A." in "Azad A.", or letters OCR was unsure of (accents such as the
 * "ü" in "Jürgen" lower its confidence). Unsure words only count on a line that also has a trustworthy word.
 */
function couldBeAWord(word: TextBox): boolean {
  const trusted = word.confidence >= trustworthyConfidence && (/[A-Za-z]{2}/.test(word.text) || /^[A-Z]\.$/.test(word.text))
  return trusted || /^\p{L}{2,}$/u.test(word.text)
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

/** Drops LinkedIn's connection-degree and pronoun suffixes: "Jane Smith · 2nd", "Jane Smith (She/Her)". */
export function cleanName(text: string): string {
  return text
    .replace(/\s*[•·]\s*(1st|2nd|3rd\+?)\s*$/i, '')
    .replace(/\s*\((he|she|they)\/\w+\)\s*$/i, '')
    .trim()
}
