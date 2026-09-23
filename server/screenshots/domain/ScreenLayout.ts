/** A word found by OCR, with its box in image pixels and how sure OCR was (0–100). */
export interface TextBox {
  text: string
  x0: number
  y0: number
  x1: number
  y1: number
  confidence: number
}

/** One person's row on a LinkedIn list: their visible text and the band of the image it sits in. */
export interface PersonRow {
  displayName: string
  headline: string | null
  textLeft: number
  top: number
  bottom: number
}

interface TextLine extends TextBox {
  height: number
}

const notAHeadline = /^(followed by|\d+ mutual|and \d+ others|follow|following|message|connect|pending)\b/i
const trustworthyConfidence = 60

/**
 * Finds people on a followers/connections list from OCR words. Names and headlines line up in one text
 * column; each tight block of lines in that column is one person (name first, headline next). Text outside
 * the column (page titles, buttons, the curved #OPENTOWORK label on a frame) is ignored.
 */
export function findPersonRows(words: TextBox[]): PersonRow[] {
  const lines = groupIntoLines(words.filter(isRealWord))
  const column = textColumn(lines)
  if (column === null) return []
  const inColumn = lines.filter((line) => Math.abs(line.x0 - column) <= medianHeight(lines)).sort((a, b) => a.y0 - b.y0)
  const blocks = splitIntoBlocks(inColumn)
  const pitch = rowPitch(blocks)
  return blocks.map((block) => toRow(block, pitch))
}

function isRealWord(word: TextBox): boolean {
  return word.confidence >= trustworthyConfidence && /[A-Za-z]{2}/.test(word.text)
}

/** Words that sit on the same baseline and close together become one line of text. */
export function groupIntoLines(words: TextBox[]): TextLine[] {
  const sorted = [...words].sort((a, b) => a.x0 - b.x0)
  const lines: TextLine[] = []
  for (const word of sorted) {
    const line = lines.find((candidate) => continuesLine(candidate, word))
    if (line) Object.assign(line, joinWord(line, word))
    else lines.push({ ...word, text: word.text.trim(), height: word.y1 - word.y0 })
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
  }
}

/** The left edge most lines share: that's where names and headlines start. */
function textColumn(lines: TextLine[]): number | null {
  const tolerance = medianHeight(lines)
  let best: { left: number; count: number } | null = null
  for (const line of lines) {
    const count = lines.filter((other) => Math.abs(other.x0 - line.x0) <= tolerance).length
    if (!best || count > best.count) best = { left: line.x0, count }
  }
  return best && best.count >= 2 ? best.left : null
}

function splitIntoBlocks(lines: TextLine[]): TextLine[][] {
  const gapBetweenPeople = medianHeight(lines) * 0.9
  const blocks: TextLine[][] = []
  for (const line of lines) {
    const current = blocks.at(-1)
    const previous = current?.at(-1)
    if (current && previous && line.y0 - previous.y1 <= gapBetweenPeople) current.push(line)
    else blocks.push([line])
  }
  return blocks
}

function rowPitch(blocks: TextLine[][]): number {
  const centres = blocks.map(blockCentre)
  const gaps = centres.slice(1).map((centre, index) => centre - centres[index]).sort((a, b) => a - b)
  if (gaps.length === 0) return (blocks[0]?.[0]?.height ?? 20) * 6
  return gaps[Math.floor(gaps.length / 2)]
}

function toRow(block: TextLine[], pitch: number): PersonRow {
  const [name, ...rest] = block
  const headline = rest.find((line) => !notAHeadline.test(line.text)) ?? null
  const centre = blockCentre(block)
  return {
    displayName: cleanName(name.text),
    headline: headline?.text ?? null,
    textLeft: Math.min(...block.map((line) => line.x0)),
    top: centre - pitch * 0.48,
    bottom: centre + pitch * 0.48,
  }
}

function blockCentre(block: TextLine[]): number {
  return (block[0].y0 + (block.at(-1) as TextLine).y1) / 2
}

function medianHeight(lines: TextLine[]): number {
  const heights = lines.map((line) => line.height).sort((a, b) => a - b)
  return heights[Math.floor(heights.length / 2)] ?? 20
}

/** Drops LinkedIn's connection-degree and pronoun suffixes: "Jane Smith · 2nd", "Jane Smith (She/Her)". */
export function cleanName(text: string): string {
  return text
    .replace(/\s*[•·]\s*(1st|2nd|3rd\+?)\s*$/i, '')
    .replace(/\s*\((he|she|they)\/\w+\)\s*$/i, '')
    .trim()
}
