import { answerAudienceRequest } from './app/AudienceRouting.ts'
import { trackerKoaApp } from './app/KoaApp.ts'
import { liveTrackers } from './app/LiveTrackers.ts'
import { screenshotCardReader } from './screenshots/outbound/vision/ScreenshotCardReader.ts'

/** `pnpm server`: the API on its own (no web page), e.g. for headless use or scripting. */
const port = Number(process.env.PORT ?? 3001)
const trackers = liveTrackers({ projectRoot: process.cwd(), cardReader: screenshotCardReader(), log: console.log })
trackers.watchInboxes()
trackerKoaApp((request) => answerAudienceRequest(trackers.routesByAudience, request)).listen(port, () => console.log(`Tracker API on http://localhost:${port}/api/followers/dashboard`))
