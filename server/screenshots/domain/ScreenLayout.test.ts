import { cleanName, gapBetweenRowsAbove, hasATitle, isCutByTheBottom, isCutByTheTop, withoutACutTitle, photosWithoutAName, readNameStrip, startsLevelWithTheTopOf, type TextBox } from './ScreenLayout.ts'

function word(text: string, x0: number, y0: number, confidence = 95): TextBox {
  return { text, x0, y0, x1: x0 + text.length * 9, y1: y0 + 18, confidence }
}

const pitch = 100
const nameStrip: TextBox[] = [
  word('Ada', 100, 60), word('Lovelace', 140, 60), word('Mathematician', 100, 82), word('Follow', 600, 70),
  word('Alan', 100, 160), word('Turing', 145, 160), word('Codebreaker', 100, 182),
  word('Grace', 100, 260), word('Hopper', 150, 260),
]

describe('reading names beside the photo column', () => {
  it('makes every name a person, with the title under it', () => {
    expect(readNameStrip(nameStrip, pitch).map((person) => [person.displayName, person.headline])).toEqual([
      ['Ada Lovelace', 'Mathematician'],
      ['Alan Turing', 'Codebreaker'],
      ['Grace Hopper', null],
    ])
  })

  it('ignores text beside the list, like the page sidebar, even where it sits between two people', () => {
    const sidebar = [word('About', 900, 40), word('Privacy', 900, 120), word('Help', 900, 200), word('Center', 950, 200)]

    expect(readNameStrip([...nameStrip, ...sidebar], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('ignores header text that starts a little right of the names', () => {
    const searchBox = [word("I'm", 115, 20), word('looking', 150, 20)]

    expect(readNameStrip([...searchBox, ...nameStrip], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('keeps a name that starts a little right because of an emoji before it', () => {
    const emojiName = [word('Adrian', 120, 360), word('Kodja', 180, 360), word('Mentor', 100, 382)]

    expect(readNameStrip([...nameStrip, ...emojiName], pitch).map((person) => [person.displayName, person.headline])).toContainEqual(['Adrian Kodja', 'Mentor'])
  })

  it('skips the heading of the list', () => {
    const heading = [word("Dave's", 100, -80), word('Network', 160, -80), word('1,452', 100, -40), word('people', 150, -40), word('are', 210, -40), word('following', 240, -40), word('you', 330, -40)]

    expect(readNameStrip([...heading, ...nameStrip], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('keeps a title that starts a little right because of an emoji before it', () => {
    const emojiTitle = [word('Raimund', 100, 360), word('Kramer', 170, 360), word('Software', 130, 382), word('Craftsman', 210, 382)]

    expect(readNameStrip([...nameStrip, ...emojiTitle], pitch).map((person) => [person.displayName, person.headline])).toContainEqual(['Raimund Kramer', 'Software Craftsman'])
  })

  it('keeps a hard-to-read word when the rest of its line reads clearly', () => {
    const accentedName = [word('Jurgen', 100, 360, 23), word('De', 160, 360), word('Smet', 185, 360), word('Coach', 100, 382)]

    expect(readNameStrip([...nameStrip, ...accentedName], pitch).map((person) => [person.displayName, person.headline])).toContainEqual(['Jurgen De Smet', 'Coach'])
  })

  it('keeps initials in names', () => {
    expect(readNameStrip([word('Azad', 100, 60), word('A.', 145, 60)], pitch).map((person) => person.displayName)).toEqual(['Azad A.'])
  })

  it('never mistakes the line of shared connections for a name', () => {
    const sharedConnections = [word('Hp', 100, 360, 30), word('Followed', 130, 360), word('by', 210, 360), word('Sam', 235, 360)]

    expect(readNameStrip([...nameStrip, ...sharedConnections], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('leaves out a sliver of a letter cut off by the bottom of the image, even beside a name', () => {
    const sliver = { text: 'Co', x0: 212, y0: 276, x1: 232, y1: 278, confidence: 0 }

    expect(readNameStrip([...nameStrip, sliver], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('never mistakes the Follow button for a name', () => {
    expect(readNameStrip([word('Follow', 600, 70)], pitch)).toEqual([])
  })

  it('skips text it could barely read', () => {
    expect(readNameStrip([word('Xq', 100, 60, 20)], pitch)).toEqual([])
  })
})

describe('reading a list whose rows sit close together, like Connections', () => {
  // Name, a title wrapping onto two lines, and the date the connection was made: the next name follows a small gap below.
  const connections: TextBox[] = [
    word('Ada', 100, 60), word('Lovelace', 140, 60), word('Mathematician', 100, 80), word('and', 230, 80), word('writer', 265, 80), word('on', 100, 98), word('engines', 125, 98), word('Connected', 100, 116), word('on', 190, 116), word('March', 215, 116), word('1,', 270, 116), word('2020', 290, 116),
    word('Alan', 100, 144), word('Turing', 145, 144), word('Codebreaker', 100, 164), word('Connected', 100, 182), word('on', 190, 182), word('May', 215, 182), word('2,', 250, 182), word('2019', 270, 182),
  ]
  const photosAt = (...tops: number[]) => tops.map((top) => ({ centreX: 40, centreY: top + 40, radius: 40 }))

  it('starts a new person at each name level with the top of a photo, however small the gap above it', () => {
    expect(readNameStrip(connections, pitch, photosAt(58, 142)).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing'])
  })

  it('keeps a name an emoji moved right, below a stitching seam that moved the rows below it left of the list edge', () => {
    const aboveTheSeam = [word('Ada', 100, 60), word('Lovelace', 140, 60), word('Mathematician', 100, 82), word('Alan', 100, 160), word('Turing', 145, 160), word('Codebreaker', 100, 182)]
    const belowTheSeam = [word('Grace', 116, 260), word('Hopper', 166, 260), word('Admiral', 88, 282), word('Katherine', 88, 360), word('Johnson', 170, 360), word('Mathematician', 88, 382), word('Mary', 88, 460), word('Jackson', 130, 460), word('Engineer', 88, 482)]

    expect(readNameStrip([...aboveTheSeam, ...belowTheSeam], pitch).map((person) => person.displayName)).toContain('Grace Hopper')
  })

  it('never takes the date a connection was made for their title', () => {
    const noTitle = [word('Grace', 100, 60), word('Hopper', 150, 60), word('Connected', 100, 80), word('on', 190, 80), word('June', 215, 80), word('3,', 255, 80), word('2018', 275, 80)]

    expect(readNameStrip(noTitle, pitch).map((person) => person.headline)).toEqual([null])
  })
})

describe('cleaning names', () => {
  it('drops the connection degree', () => {
    expect(cleanName('Jane Smith · 2nd')).toBe('Jane Smith')
  })

  it('drops pronouns', () => {
    expect(cleanName('Jane Smith (She/Her)')).toBe('Jane Smith')
  })

  it('drops a quote mark OCR saw in an emoji before the name', () => {
    expect(cleanName('“Ezequiel Birman')).toBe('Ezequiel Birman')
  })
})

describe('finding photos with no name read beside them', () => {
  const photoAt = (centreY: number) => ({ centreX: 40, centreY, radius: 30 })

  it('lists each photo that has no name beside it', () => {
    const people = readNameStrip(nameStrip, pitch)

    expect(photosWithoutAName([photoAt(80), photoAt(180), photoAt(280), photoAt(380)], people)).toEqual([photoAt(380)])
  })
})

describe('telling a name from a title left without its name', () => {
  const photo = { centreX: 40, centreY: 100, radius: 30 }
  const block = (top: number) => ({ displayName: 'Ada Lovelace', headline: null, top, bottom: top + 40 })

  it('takes text starting level with the top of the photo for a name', () => {
    expect(startsLevelWithTheTopOf(block(72), photo)).toBe(true)
  })

  it('takes text starting halfway down the photo for a title whose name went unread', () => {
    expect(startsLevelWithTheTopOf(block(100), photo)).toBe(false)
  })
})

describe('telling a whole name from one cut by the bottom of the image', () => {
  const alanTuring = { displayName: 'Alan Turing', headline: null, top: 110, bottom: 130 }

  it('takes a name running off the bottom of the image, less than a line above it, for a cut one', () => {
    expect(isCutByTheBottom(cropToHeight(twoPeopleOfText(), 120), { left: 0, right: 200 }, alanTuring, 24)).toBe(true)
  })

  it('keeps a name with room for the whole line, even when the text under it runs off the bottom', () => {
    expect(isCutByTheBottom(cropToHeight(twoPeopleOfText(), 158), { left: 0, right: 200 }, alanTuring, 24)).toBe(false)
  })

  it('keeps a whole name the bottom of the image passes just under, as a page break between a name and its title does', () => {
    expect(isCutByTheBottom(cropToHeight(twoPeopleOfText(), 133), { left: 0, right: 200 }, alanTuring, 24)).toBe(false)
  })
})

describe('telling a person from a lone line of text', () => {
  it('takes a name with a title under it for a person', () => {
    expect(hasATitle({ displayName: 'Ada Lovelace', headline: 'Mathematician', top: 0, bottom: 40 })).toBe(true)
  })

  it('does not take a lone line, like a search box or a bookmark, for a person', () => {
    expect(hasATitle({ displayName: "I'm looking for...", headline: null, top: 0, bottom: 20 })).toBe(false)
  })
})

/** A white page with dark lines of text: a name and a title for each of two people, 100 pixels apart. */
function twoPeopleOfText() {
  const width = 200
  const height = 200
  const data = new Uint8Array(width * height * 4).fill(255)
  for (const [top, bottom] of [[10, 30], [40, 60], [110, 130], [140, 160]]) {
    for (let y = top; y <= bottom; y += 1) for (let x = 20; x < 180; x += 1) data.set([30, 30, 30, 255], (y * width + x) * 4)
  }
  return { data, width, height }
}

describe('finding where to start reading so no line of text is cut', () => {
  it('moves up from inside a name to the gap between people above it', () => {
    const top = gapBetweenRowsAbove(twoPeopleOfText(), { left: 0, right: 200 }, 120, 100)

    expect(top).toBeGreaterThan(60)
    expect(top).toBeLessThan(110)
  })

  it('moves up past the small gap between a name and its title', () => {
    expect(gapBetweenRowsAbove(twoPeopleOfText(), { left: 0, right: 200 }, 45, 100)).toBe(0)
  })
})

describe('telling a title left over from a name cut by the top of the image', () => {
  it('takes text right under a line cut by the top of the image for what is left of a cut row', () => {
    const cutThroughTheFirstName = cropFromTheTop(twoPeopleOfText(), 20)
    const titleLeftOver = { displayName: 'Mathematician', headline: null, top: 20, bottom: 40 }

    expect(isCutByTheTop(cutThroughTheFirstName, { left: 0, right: 200 }, titleLeftOver, 100)).toBe(true)
  })

  it('keeps the first person when nothing above them was cut', () => {
    const firstPerson = { displayName: 'Ada Lovelace', headline: 'Mathematician', top: 10, bottom: 60 }

    expect(isCutByTheTop(twoPeopleOfText(), { left: 0, right: 200 }, firstPerson, 100)).toBe(false)
  })

  it('keeps a person with a gap between people above them', () => {
    const secondPerson = { displayName: 'Alan Turing', headline: 'Codebreaker', top: 110, bottom: 160 }

    expect(isCutByTheTop(cropFromTheTop(twoPeopleOfText(), 20), { left: 0, right: 200 }, { ...secondPerson, top: 90, bottom: 140 }, 100)).toBe(false)
  })
})

function cropToHeight(pixels: { data: Uint8Array; width: number; height: number }, height: number) {
  return { data: pixels.data.slice(0, height * pixels.width * 4), width: pixels.width, height }
}

function cropFromTheTop(pixels: { data: Uint8Array; width: number; height: number }, rows: number) {
  return { data: pixels.data.slice(rows * pixels.width * 4), width: pixels.width, height: pixels.height - rows }
}

describe('a title cut through by the bottom of the image', () => {
  it('is dropped, since OCR only guesses at half-letters', () => {
    expect(withoutACutTitle({ displayName: 'James Humelsine', headline: 'Ratired Saftware EnAainaar', top: 460, bottom: 500 }, 500).headline).toBeNull()
  })

  it('is kept when there is room below it', () => {
    expect(withoutACutTitle({ displayName: 'James Humelsine', headline: 'Retired Software Engineer', top: 400, bottom: 440 }, 500).headline).toBe('Retired Software Engineer')
  })
})
