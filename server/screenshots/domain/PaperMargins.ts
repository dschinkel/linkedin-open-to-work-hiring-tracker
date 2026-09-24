import type { Pixels } from './FrameDetection.ts'

/** Colour difference (per channel, 0–255) a row may have and still be blank paper. */
const paperTolerance = 4

/**
 * The rows of an image that show the screenshot. A screenshot printed to a PDF sits on the page between blank paper
 * margins, and a page break cuts through the list at the edge of the screenshot, not the edge of the page: a person
 * cut there must count as cut by the edge of the image, or the title left below the break reads as someone's name.
 * A screenshot of a web page never has a blank row right across it (the page's own background differs from the
 * list's), so only paper is left out.
 */
export function screenshotOnThePage(pixels: Pixels): { top: number; height: number } {
  let top = 0
  while (top < pixels.height && isBlank(pixels, top)) top += 1
  if (top === pixels.height) return { top: 0, height: pixels.height }
  let bottom = pixels.height
  while (bottom > top && isBlank(pixels, bottom - 1)) bottom -= 1
  return { top, height: bottom - top }
}

/** One colour all the way across. */
function isBlank({ data, width }: Pixels, row: number): boolean {
  const start = row * width * 4
  for (let offset = start + 4; offset < start + width * 4; offset += 4) {
    for (let channel = 0; channel < 4; channel += 1) if (Math.abs(data[offset + channel] - data[start + channel]) > paperTolerance) return false
  }
  return true
}
