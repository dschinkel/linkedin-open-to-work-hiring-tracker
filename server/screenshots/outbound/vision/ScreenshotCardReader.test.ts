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

  it('reads the people above the first photo it could find, when the photos at the top are too light to find', async () => {
    const fromQuentinGalloway = await sharp(fixture('Followers full page.png')).extract({ left: 0, top: 4150, width: 1800, height: 1400 }).png().toBuffer()

    const cards = await reader.readCards(fromQuentinGalloway, 'part.png')

    expect(cards.slice(0, 3).map((card) => card.displayName)).toEqual(['Quentin Galloway', 'Rosalind Abernathy', 'Soren Blackwood'])
  }, 120_000)
})

/** The full-page capture split as a long page is split into several images: the cut runs through Soren Drummond's name, leaving his title below it. */
const throughSorenDrummondsName = 2255
/** A cut through the lower half of Tamsin Ellery's name, the next person down. */
const throughTamsinEllerysName = 2450
/** A cut below Tamsin Ellery's name but through her photo. */
const throughTamsinEllerysPhoto = 2485
