import { readFileSync } from 'node:fs'
import path from 'node:path'
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
})
