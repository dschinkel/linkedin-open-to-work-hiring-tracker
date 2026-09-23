import type { AvatarCircle } from './FrameDetection.ts'
import { rowSpacing, sitsOnThePage } from './AvatarColumn.ts'

const photoAt = (centreY: number): AvatarCircle => ({ centreX: 50, centreY, radius: 20 })

describe('spacing between rows of people', () => {
  it('is the distance between neighbouring photos', () => {
    expect(rowSpacing([photoAt(100), photoAt(240), photoAt(380)])).toBe(140)
  })

  it('stays one row when photos in between could not be found', () => {
    expect(rowSpacing([photoAt(100), photoAt(240), photoAt(520), photoAt(800), photoAt(1080)])).toBe(140)
  })

  it('guesses from the photo size when there is only one photo', () => {
    expect(rowSpacing([photoAt(100)])).toBe(60)
  })
})

/** A white list with grey page margins, under a dark browser toolbar 40 pixels tall. */
function browserShowingAList() {
  const width = 300
  const height = 400
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const colour = y < 40 ? [40, 40, 40] : x < 50 || x >= 250 ? [244, 242, 238] : [255, 255, 255]
      data.set([...colour, 255], (y * width + x) * 4)
    }
  }
  return { data, width, height }
}

describe('telling a photo spot on the page from browser chrome', () => {
  it('accepts a spot surrounded by the page', () => {
    expect(sitsOnThePage(browserShowingAList(), { centreX: 100, centreY: 200, radius: 12 })).toBe(true)
  })

  it('rejects a spot inside the browser toolbar', () => {
    expect(sitsOnThePage(browserShowingAList(), { centreX: 100, centreY: 20, radius: 12 })).toBe(false)
  })
})
