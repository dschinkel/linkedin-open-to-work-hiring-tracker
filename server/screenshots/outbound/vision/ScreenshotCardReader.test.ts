import { readFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { DetectedCard } from '../../domain/Deduplication.ts'
import { photosMatch } from '../../domain/PhotoPrint.ts'
import { screenshotCardReader } from './ScreenshotCardReader.ts'

const fixture = (name: string) => readFileSync(path.resolve('server/screenshots/fixtures', name))
const reader = screenshotCardReader()

describe('reading a LinkedIn followers screenshot', () => {
  it('finds every person with their headline and both frames', async () => {
    const cards = await reader.readCards(fixture('Screenshot 2026-09-22 at 9.01.12 AM.png'), 'first.png')

    expect(cards.map(({ displayName, headline, openToWork, hiring }) => [displayName, headline, openToWork.status, hiring.status])).toEqual([
      ['Avery Quinlan', 'Staff Engineer at Northwind', 'OPEN', 'NOT_HIRING'],
      ['Bram Okonkwo', 'Engineering Manager at Globex', 'NOT_OPEN', 'HIRING'],
      ['Celia Marchetti', 'Product Designer', 'NOT_OPEN', 'NOT_HIRING'],
      ['Dmitri Havel', 'Senior Data Scientist at Initech', 'OPEN', 'NOT_HIRING'],
      ['Esme Talbot', 'Talent Partner at Umbrella Health', 'NOT_OPEN', 'HIRING'],
    ])
  }, 60_000)

  it("recognises one person's photo in two overlapping screenshots, and tells different people's photos apart", async () => {
    const first = await reader.readCards(fixture('Screenshot 2026-09-22 at 9.01.12 AM.png'), 'first.png')
    const second = await reader.readCards(fixture('Screenshot 2026-09-22 at 9.01.19 AM.png'), 'second.png')
    const dmitri = (cards: DetectedCard[]) => cards.find((card) => card.displayName === 'Dmitri Havel')?.photoPrint as string

    expect(photosMatch(dmitri(first), dmitri(second))).toBe(true)
    expect(photosMatch(dmitri(first), second.find((card) => card.displayName === 'Farid Nasser')?.photoPrint as string)).toBe(false)
  }, 60_000)

  it('takes no photo print where the photo is cut off by the bottom of the screenshot and only its spot is guessed', async () => {
    const photoCutOff = await sharp(fixture('Followers full page.png')).extract({ left: 0, top: 0, width: 1800, height: throughTamsinEllerysPhoto }).png().toBuffer()

    const cards = await reader.readCards(photoCutOff, 'first-part.png')

    expect(cards.at(-1)).toMatchObject({ displayName: 'Tamsin Ellery', photoPrint: null })
  }, 120_000)

  it('finds every person on a full-page capture of a long list', async () => {
    const cards = await reader.readCards(fixture('Followers full page.png'), 'full-page.png')

    expect(cards).toHaveLength(31)
    expect(cards.at(-2)?.displayName).toBe('Niall Blackwood')
  }, 120_000)

  it('reads a row by itself when its text was too faint to read among the whole page', async () => {
    const cards = await reader.readCards(fixture('Followers full page.png'), 'full-page.png')

    expect(cards.at(-1)).toMatchObject({ displayName: 'Corwin Hale', headline: 'Talent Partner' })
  }, 120_000)

  it('does not take the title of a person cut off at the top of the image for a name', async () => {
    const belowTheCut = await sharp(fixture('Followers full page.png')).extract({ left: 0, top: throughSorenDrummondsName, width: 1800, height: 6200 - throughSorenDrummondsName }).png().toBuffer()

    const cards = await reader.readCards(belowTheCut, 'second-part.png')

    expect(cards[0].displayName).toBe('Tamsin Ellery')
  }, 120_000)

  it('does not guess at a name cut through by the bottom of the image', async () => {
    const aboveTheCut = await sharp(fixture('Followers full page.png')).extract({ left: 0, top: 0, width: 1800, height: throughTamsinEllerysName }).png().toBuffer()

    const cards = await reader.readCards(aboveTheCut, 'first-part.png')

    expect(cards.at(-1)?.displayName).toBe('Soren Drummond')
  }, 120_000)

  it('counts a person split across two printed PDF pages once, by the name above the page break', async () => {
    const pageAbove = await printedOnAPage(fixture('Followers full page.png'), { top: 0, height: belowSorenDrummondsName })
    const pageBelow = await printedOnAPage(fixture('Followers full page.png'), { top: belowSorenDrummondsName, height: 6200 - belowSorenDrummondsName })

    const [above, below] = [await reader.readCards(pageAbove, 'page 1.png'), await reader.readCards(pageBelow, 'page 2.png')]

    expect([above.at(-1)?.displayName, below[0].displayName]).toEqual(['Soren Drummond', 'Tamsin Ellery'])
  }, 120_000)

  it('keeps the name a page break cuts through at its foot, since no other page shows it', async () => {
    const pageAbove = await printedOnAPage(fixture('Followers full page.png'), { top: 0, height: throughTheFootOfSorenDrummondsName })
    const pageBelow = await printedOnAPage(fixture('Followers full page.png'), { top: throughTheFootOfSorenDrummondsName, height: 6200 - throughTheFootOfSorenDrummondsName })

    const [above, below] = [await reader.readCards(pageAbove, 'page 1.png'), await reader.readCards(pageBelow, 'page 2.png')]

    expect([above.at(-1)?.displayName, below[0].displayName]).toEqual(['Soren Drummond', 'Tamsin Ellery'])
  }, 120_000)

  it('reads the people above the first photo it could find, when the photos at the top are too light to find', async () => {
    const fromQuentinGalloway = await sharp(fixture('Followers full page.png')).extract({ left: 0, top: 4150, width: 1800, height: 1400 }).png().toBuffer()

    const cards = await reader.readCards(fromQuentinGalloway, 'part.png')

    expect(cards.slice(0, 3).map((card) => card.displayName)).toEqual(['Quentin Galloway', 'Rosalind Abernathy', 'Soren Blackwood'])
  }, 120_000)
})

describe('reading a LinkedIn connections capture', () => {
  it('finds every person on the list, with the rows close together and a date under each title', async () => {
    const cards = await reader.readCards(fixture('Connections full page.png'), 'connections.png')

    expect(cards).toHaveLength(28)
    expect(cards.every((card) => !/^connected on/i.test(card.headline ?? ''))).toBe(true)
  }, 120_000)

  it('reads whole names below a stitching seam that moved the rows a few pixels left', async () => {
    const cards = await reader.readCards(fixture('Connections full page.png'), 'connections.png')

    expect(cards.slice(-6).map((card) => card.displayName)).toEqual(['Lorenzo Ellery', 'Mireille Fairbanks', 'Niall Galloway', 'Odette Abernathy', 'Pavel Blackwood', 'Quentin Castellano'])
  }, 120_000)

  it('keeps a whole name a page break passes just above, through the top of its photo, since no other page shows it', async () => {
    const pageBelow = await printedOnAPage(fixture('Connections full page.png'), { top: justAboveSorenBlackwoodsName, height: 5600 - justAboveSorenBlackwoodsName })

    const cards = await reader.readCards(pageBelow, 'page 2.png')

    expect(cards[0].displayName).toBe('Soren Blackwood')
  }, 120_000)

  it('leaves a row whose photo the top of a screenshot cuts through to the screenshot before it', async () => {
    const screenshot = await sharp(fixture('Connections full page.png')).extract({ left: 0, top: justAboveSorenBlackwoodsName, width: 1800, height: 1400 }).png().toBuffer()

    const cards = await reader.readCards(screenshot, 'second.png')

    expect(cards[0].displayName).toBe('Tamsin Castellano')
  }, 120_000)
})

function printedOnAPage(capture: Buffer, { top, height }: { top: number; height: number }): Promise<Buffer> {
  const paperMargin = 150
  const white = { r: 255, g: 255, b: 255, alpha: 1 }
  return sharp(capture).extract({ left: 0, top, width: 1800, height }).extend({ top: paperMargin, bottom: paperMargin, background: white }).png().toBuffer()
}

const throughSorenDrummondsName = 2255
const belowSorenDrummondsName = 2270
const throughTheFootOfSorenDrummondsName = 2258
const throughTamsinEllerysName = 2450
const throughTamsinEllerysPhoto = 2485
const justAboveSorenBlackwoodsName = 1173
