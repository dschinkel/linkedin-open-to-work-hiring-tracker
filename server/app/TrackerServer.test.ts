import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { screenshotCardReader } from '../screenshots/outbound/vision/ScreenshotCardReader.ts'
import { answerAudienceRequest } from './AudienceRouting.ts'
import { trackerKoaApp } from './KoaApp.ts'
import { liveTrackers } from './LiveTrackers.ts'

const fixtures = path.resolve('server/screenshots/fixtures')
const firstShot = 'Screenshot 2026-09-22 at 9.01.12 AM.png'
const secondShot = 'Screenshot 2026-09-22 at 9.01.19 AM.png'
const cardReader = screenshotCardReader(path.resolve('data/ocr'))

function serverIn(projectRoot: string, log: (message: string) => void = () => undefined) {
  const trackers = liveTrackers({ projectRoot, cardReader, log })
  const app = trackerKoaApp((apiRequest) => answerAudienceRequest(trackers.routesByAudience, apiRequest)).callback()
  return { http: request(app), trackers }
}

const freshProject = () => mkdtempSync(path.join(tmpdir(), 'tracker-server-'))
const upload = (http: ReturnType<typeof request>, audience: string, fileName: string, data = readFileSync(path.join(fixtures, fileName))) =>
  http.post(`/api/${audience}/screenshots`).send({ files: [{ fileName, dataBase64: data.toString('base64') }] })

describe('tracker server over HTTP', () => {
  it('creates the SQLite database in the project on first start', () => {
    const project = freshProject()
    serverIn(project)

    expect(existsSync(path.join(project, 'data/linkedin.sqlite'))).toBe(true)
  })

  it('turns two overlapping screenshots into one scan with each person once', async () => {
    const { http } = serverIn(freshProject())
    await upload(http, 'followers', firstShot)
    await upload(http, 'followers', secondShot)

    const { body } = await http.get('/api/followers/dashboard')

    expect([body.scanCount, body.latestScan.peopleCount, body.latestScan.duplicateCount, body.latestScan.openToWork.open, body.latestScan.hiring.hiring]).toEqual([1, 8, 2, 3, 2])
  }, 120_000)

  it('deletes screenshots once their data is saved', async () => {
    const project = freshProject()
    const { http } = serverIn(project)

    await upload(http, 'followers', firstShot)

    expect(readdirSync(path.join(project, 'LinkedinScreenShots/followers'))).toEqual([])
  }, 60_000)

  it('lists who is hiring with their headline', async () => {
    const { http } = serverIn(freshProject())
    await upload(http, 'followers', firstShot)

    const { body } = await http.get('/api/followers/hiring/people').query({ status: 'current' })

    expect(body.people.map((person: { displayName: string; headline: string }) => `${person.displayName}: ${person.headline}`).sort()).toEqual([
      'Bram Okonkwo: Engineering Manager at Globex',
      'Esme Talbot: Talent Partner at Umbrella Health',
    ])
  }, 60_000)

  it('counts followers once across overlapping screenshots', async () => {
    const { http } = serverIn(freshProject())
    await upload(http, 'followers', firstShot)
    await upload(http, 'followers', secondShot)

    expect((await http.get('/api/followers/network-size')).body.peopleCount).toBe(8)
  }, 120_000)

  it('refuses a screenshot that was already imported', async () => {
    const { http } = serverIn(freshProject())
    await upload(http, 'followers', firstShot)

    const { body } = await upload(http, 'followers', firstShot)

    expect(body.rejected).toEqual([{ fileName: firstShot, reason: 'Already imported' }])
  }, 60_000)

  it('leaves an unreadable screenshot in the inbox instead of deleting it', async () => {
    const project = freshProject()
    const { http } = serverIn(project)

    await upload(http, 'followers', 'broken.png', Buffer.from('not really an image'))

    expect(readdirSync(path.join(project, 'LinkedinScreenShots/followers'))).toEqual(['broken.png'])
  }, 60_000)

  it('keeps followers and contacts apart', async () => {
    const { http } = serverIn(freshProject())
    await upload(http, 'followers', firstShot)

    expect((await http.get('/api/contacts/dashboard')).body.scanCount).toBe(0)
  }, 60_000)

  it('keeps saved data and settings after the server restarts', async () => {
    const project = freshProject()
    const first = serverIn(project)
    await upload(first.http, 'followers', firstShot)
    const settings = (await first.http.get('/api/followers/settings')).body
    await first.http.put('/api/followers/settings').send({ ...settings, afterAnalysis: 'keep' })

    const restarted = serverIn(project)

    expect([(await restarted.http.get('/api/followers/dashboard')).body.latestScan.peopleCount, (await restarted.http.get('/api/followers/settings')).body.afterAnalysis]).toEqual([5, 'keep'])
  }, 60_000)

  it('rejects requests that break the API contract', async () => {
    const { http } = serverIn(freshProject())

    expect((await http.get('/api/followers/scans').query({ window: 'forever' })).status).toBe(400)
  })

  it('imports screenshots copied straight into the inbox folder', async () => {
    const project = freshProject()
    const { http, trackers } = serverIn(project)
    const stopWatching = trackers.watchInboxes()
    mkdirSync(path.join(project, 'LinkedinScreenShots/contacts'), { recursive: true })

    copyFileSync(path.join(fixtures, firstShot), path.join(project, 'LinkedinScreenShots/contacts', firstShot))

    await expect.poll(async () => (await http.get('/api/contacts/dashboard')).body.scanCount, { timeout: 60_000, interval: 500 }).toBe(1)
    await stopWatching()
  }, 90_000)
})

describe('watching the inbox folders', () => {
  it('leaves copied-in screenshots alone when Settings turn watching off', async () => {
    const project = freshProject()
    const { http, trackers } = serverIn(project)
    const settings = (await http.get('/api/contacts/settings')).body
    await http.put('/api/contacts/settings').send({ ...settings, automaticProcessing: false })
    const stopWatching = trackers.watchInboxes()
    mkdirSync(path.join(project, 'LinkedinScreenShots/contacts'), { recursive: true })

    copyFileSync(path.join(fixtures, firstShot), path.join(project, 'LinkedinScreenShots/contacts', firstShot))
    await new Promise((resolve) => setTimeout(resolve, 3000))

    expect((await http.get('/api/contacts/dashboard')).body.scanCount).toBe(0)
    await stopWatching()
  }, 30_000)

  it('skips a PDF copied into the inbox folder and says PDFs are read when dropped in the app', async () => {
    const project = freshProject()
    const logged: string[] = []
    const { trackers } = serverIn(project, (message) => logged.push(message))
    const stopWatching = trackers.watchInboxes()
    mkdirSync(path.join(project, 'LinkedinScreenShots/contacts'), { recursive: true })

    writeFileSync(path.join(project, 'LinkedinScreenShots/contacts', 'export.pdf'), '%PDF-1.7')

    await expect.poll(() => logged, { timeout: 10_000, interval: 200 }).toContain('Tracker (contacts): skipped export.pdf: PDFs are read when dropped in the app')
    await stopWatching()
  }, 30_000)
})

describe('clearing all data', () => {
  it('empties both dashboards and the inbox folders', async () => {
    const project = freshProject()
    const { http } = serverIn(project)
    await upload(http, 'followers', firstShot)
    mkdirSync(path.join(project, 'LinkedinScreenShots/contacts'), { recursive: true })
    copyFileSync(path.join(fixtures, secondShot), path.join(project, 'LinkedinScreenShots/contacts', secondShot))

    await http.delete('/api/followers/all-data')

    expect([
      (await http.get('/api/followers/dashboard')).body.scanCount,
      (await http.get('/api/followers/network-size')).body.peopleCount,
      readdirSync(path.join(project, 'LinkedinScreenShots/contacts')),
    ]).toEqual([0, 0, []])
  }, 60_000)

  it('keeps working after clearing, so new screenshots import again', async () => {
    const { http } = serverIn(freshProject())
    await upload(http, 'followers', firstShot)
    await http.delete('/api/followers/all-data')

    await upload(http, 'followers', firstShot)

    expect((await http.get('/api/followers/dashboard')).body.scanCount).toBe(1)
  }, 60_000)
})
