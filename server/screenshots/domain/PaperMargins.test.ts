import { screenshotOnThePage } from './PaperMargins.ts'

const white = [255, 255, 255]
const pageGrey = [244, 242, 238]

/**
 * A 200 × 300 image of a list (grey page either side of a white card) with blank white paper `above` and `below`
 * it, as a screenshot printed to a PDF page sits on the paper.
 */
function printedPage({ above, below }: { above: number; below: number }) {
  const width = 200
  const height = 300
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const onPaper = y < above || y >= height - below
      const colour = onPaper ? white : x < 30 || x >= 170 ? pageGrey : white
      data.set([...colour, 255], (y * width + x) * 4)
    }
  }
  return { data, width, height }
}

describe('finding the screenshot on a printed page', () => {
  it('leaves out the blank paper above and below the screenshot', () => {
    expect(screenshotOnThePage(printedPage({ above: 40, below: 25 }))).toEqual({ top: 40, height: 235 })
  })

  it('keeps the whole image of a screenshot that was never printed', () => {
    expect(screenshotOnThePage(printedPage({ above: 0, below: 0 }))).toEqual({ top: 0, height: 300 })
  })

  it('keeps the whole image when it is blank all over', () => {
    expect(screenshotOnThePage(printedPage({ above: 300, below: 0 }))).toEqual({ top: 0, height: 300 })
  })
})
