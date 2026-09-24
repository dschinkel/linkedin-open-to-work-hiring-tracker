import type { AvatarCircle } from './FrameDetection.ts'
import { findAvatarColumn, hasLostItsName, rowSpacing, sitsOnThePage } from './AvatarColumn.ts'

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

function browserShowingAList(toolbarHeight = 40) {
  const width = 300
  const height = 400
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const colour = y < toolbarHeight ? [40, 40, 40] : x < 50 || x >= 250 ? [244, 242, 238] : [255, 255, 255]
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

describe('telling a whole row from one cut by the top of the image', () => {
  it('has lost its name when its photo reaches well above the top of the image', () => {
    expect(hasLostItsName({ centreX: 100, centreY: 10, radius: 20 })).toBe(true)
  })

  it('keeps its name when only a sliver of the photo is cut off', () => {
    expect(hasLostItsName({ centreX: 100, centreY: 19, radius: 20 })).toBe(false)
  })

  it('keeps the name beside a photo cut by more than a sliver, when the name starts below the cut as far down the photo as names on this list do', () => {
    const nameUnderTheCut = { displayName: 'Chase Doyle', headline: 'Client Engagement Manager', top: 1, bottom: 30 }

    expect(hasLostItsName({ centreX: 100, centreY: 15, radius: 20 }, { textBeside: nameUnderTheCut, nameDrop: 5 })).toBe(false)
  })

  it('has lost its name when the text beside its cut photo starts further down it than names on this list do, as a title does', () => {
    const titleLeftOver = { displayName: 'Client Engagement Manager', headline: null, top: 2, bottom: 20 }

    expect(hasLostItsName({ centreX: 100, centreY: 10, radius: 20 }, { textBeside: titleLeftOver, nameDrop: 1 })).toBe(true)
  })

  it('keeps its name when the whole photo shows', () => {
    expect(hasLostItsName({ centreX: 100, centreY: 25, radius: 20 })).toBe(false)
  })
})

function listWithPhotosAt(centres: number[], againstAWhiteWall: number[] = []) {
  const page = browserShowingAList(0)
  for (const centreY of centres) {
    for (let y = Math.max(0, centreY - 20); y < Math.min(page.height, centreY + 20); y += 1) {
      for (let x = 80; x < 120; x += 1) {
        const wallShows = againstAWhiteWall.includes(centreY) && x < 100 && y < centreY
        if ((x - 100) ** 2 + (y - centreY) ** 2 <= 400 && !wallShows) page.data.set([60, 60, 60, 255], (y * page.width + x) * 4)
      }
    }
  }
  return page
}

describe('finding the column of photos', () => {
  it('places a photo slightly cut by the bottom of the image where its whole circle would be', () => {
    const photos = findAvatarColumn(listWithPhotosAt([100, 185, 270, 386]))

    expect(photos.map((photo) => [Math.round(photo.centreY), Math.round(photo.radius)])).toEqual([[100, 20], [185, 20], [270, 20], [386, 20]])
  })

  it('finds a photo whose white background blends into the page, by its height and place in the column', () => {
    expect(findAvatarColumn(listWithPhotosAt([100, 185, 270], [185])).map((photo) => Math.round(photo.centreY))).toEqual([100, 185, 270])
  })

  it('places a photo cut by the top of the image where its whole circle would be', () => {
    expect(findAvatarColumn(listWithPhotosAt([2, 100, 185, 270])).map((photo) => Math.round(photo.centreY))).toEqual([2, 100, 185, 270])
  })
})
