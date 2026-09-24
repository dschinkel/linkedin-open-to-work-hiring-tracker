import type { HiringStatus, Network, Observation, OpenToWorkStatus, Person, Scan } from '../../shared/domain/Observation.ts'
import { pairAcrossAudiences } from './AcrossAudiences.ts'
import { summarizeLatestScansAcrossAudiences } from './LatestScansAcrossAudiences.ts'
import { indexNetwork } from './NetworkIndex.ts'

function personNamed(id: string, displayName: string, headline: string, companyName: string | null = null): Person {
  return { id, personHash: `hash-${id}`, displayName, headline, companyName, companyConfidence: 0.9, companyExtractionMethod: 'ocr-headline' }
}

function scanOn(audience: string, scanDate: string, screenshotCount = 1): Scan {
  const screenshots = Array.from({ length: screenshotCount }, (_, position) => ({ fileName: `${audience}-${position}.png`, peopleDetected: 1, uncertainCount: 0, outcome: 'processed' as const, warning: null }))
  return { id: `${audience}-${scanDate}`, scanDate, screenshots, cardsDetected: 3, duplicateCount: 1 }
}

function sighting(scan: Scan, who: Person, openStatus: OpenToWorkStatus, hiringStatus: HiringStatus = 'NOT_HIRING', confidence = 0.97): Observation {
  return {
    scanId: scan.id,
    personId: who.id,
    openToWork: { status: openStatus, confidence, classificationMethod: 'opencv' },
    hiring: { status: hiringStatus, confidence, classificationMethod: 'opencv' },
  }
}

const zoeFollower = personNamed('f-zoe', 'Zoe Adams', 'Engineering Manager at Globex', 'Globex')
const annFollower = personNamed('f-ann', 'Ann Brooks', 'Recruiter at Acme', 'Acme')
const zoeConnection = personNamed('c-zoe', 'Zoe Adams', 'Engineering Manager at Globex', 'Globex')
const miaConnection = personNamed('c-mia', 'Mia Chen', 'Data Scientist at Umbrella')

function summaryOf(followers: Network, connections: Network) {
  const [followersIndex, connectionsIndex] = [indexNetwork(followers), indexNetwork(connections)]
  return summarizeLatestScansAcrossAudiences(pairAcrossAudiences(followersIndex.people, connectionsIndex.people), followersIndex, connectionsIndex)
}

function latestScansWhere(followerSightings: (scan: Scan) => Observation[], connectionSightings: (scan: Scan) => Observation[]) {
  const [followersScan, connectionsScan] = [scanOn('followers', '2026-09-22', 2), scanOn('contacts', '2026-09-21', 3)]
  return summaryOf(
    { people: [zoeFollower, annFollower], scans: [followersScan], observations: followerSightings(followersScan) },
    { people: [zoeConnection, miaConnection], scans: [connectionsScan], observations: connectionSightings(connectionsScan) },
  )
}

function onlyConnectionsScanned(): Network {
  const scan = scanOn('contacts', '2026-09-21')
  return { people: [miaConnection], scans: [scan], observations: [sighting(scan, miaConnection, 'OPEN')] }
}

const noOne: Network = { people: [], scans: [], observations: [] }

describe('latest scans of followers and connections together', () => {
  it('counts someone in both latest scans once', () => {
    const summary = latestScansWhere(
      (scan) => [sighting(scan, zoeFollower, 'OPEN'), sighting(scan, annFollower, 'NOT_OPEN')],
      (scan) => [sighting(scan, zoeConnection, 'OPEN'), sighting(scan, miaConnection, 'NOT_OPEN')],
    )

    expect([summary.peopleCount, summary.peopleByAudience]).toEqual([3, { followers: 2, contacts: 2, both: 1 }])
  })

  it('rates open to work over the unique people of both scans', () => {
    const summary = latestScansWhere(
      (scan) => [sighting(scan, zoeFollower, 'OPEN'), sighting(scan, annFollower, 'NOT_OPEN')],
      (scan) => [sighting(scan, zoeConnection, 'OPEN'), sighting(scan, miaConnection, 'UNCERTAIN')],
    )

    expect(summary.openToWork).toEqual({ open: 1, notOpen: 1, uncertain: 1, rate: 50 })
  })

  it('counts someone as open when either audience saw the frame', () => {
    const summary = latestScansWhere(
      (scan) => [sighting(scan, zoeFollower, 'NOT_OPEN')],
      (scan) => [sighting(scan, zoeConnection, 'OPEN')],
    )

    expect(summary.openToWork).toMatchObject({ open: 1, notOpen: 0 })
  })

  it('uses the clear photo when the other audience could not tell', () => {
    const summary = latestScansWhere(
      (scan) => [sighting(scan, zoeFollower, 'UNCERTAIN', 'UNCERTAIN')],
      (scan) => [sighting(scan, zoeConnection, 'NOT_OPEN', 'HIRING')],
    )

    expect([summary.openToWork.uncertain, summary.hiring.hiring]).toEqual([0, 1])
  })

  it('rates hiring and counts each hiring company once', () => {
    const summary = latestScansWhere(
      (scan) => [sighting(scan, zoeFollower, 'NOT_OPEN', 'HIRING'), sighting(scan, annFollower, 'NOT_OPEN', 'HIRING')],
      (scan) => [sighting(scan, zoeConnection, 'NOT_OPEN', 'HIRING'), sighting(scan, miaConnection, 'NOT_OPEN', 'NOT_HIRING')],
    )

    expect(summary.hiring).toEqual({ hiring: 2, notHiring: 1, uncertain: 0, rate: (2 / 3) * 100, companyCount: 2 })
  })

  it('dates the latest scan of each audience', () => {
    const summary = latestScansWhere(
      (scan) => [sighting(scan, zoeFollower, 'OPEN')],
      (scan) => [sighting(scan, miaConnection, 'OPEN')],
    )

    expect(summary.latestScanDates).toEqual({ followers: '2026-09-22', contacts: '2026-09-21' })
  })

  it('leaves out earlier scans', () => {
    const [earlier, latest] = [scanOn('followers', '2026-09-15'), scanOn('followers', '2026-09-22')]
    const summary = summaryOf({ people: [zoeFollower, annFollower], scans: [latest, earlier], observations: [sighting(earlier, annFollower, 'OPEN'), sighting(latest, zoeFollower, 'OPEN')] }, noOne)
    expect([summary.peopleCount, summary.openToWork.open, summary.latestScanDates.followers]).toEqual([1, 1, '2026-09-22'])
  })

  it('judges the quality of both latest scans together', () => {
    const summary = latestScansWhere(
      (scan) => [sighting(scan, zoeFollower, 'OPEN', 'HIRING'), sighting(scan, annFollower, 'NOT_OPEN', 'HIRING', 0.6)],
      (scan) => [sighting(scan, zoeConnection, 'OPEN', 'HIRING'), sighting(scan, miaConnection, 'UNCERTAIN')],
    )

    expect(summary.latestQuality).toEqual({
      screenshotCount: 5,
      cardsDetected: 6,
      uniquePeople: 3,
      duplicateCount: 2,
      openToWork: { highConfidence: 1, lowConfidence: 1, uncertain: 1 },
      hiring: { highConfidence: 2, lowConfidence: 1, uncertain: 0 },
      classificationCoverage: (2 / 3) * 100,
      companyExtraction: { identified: 2, lowConfidence: 0, notVisible: 0 },
    })
  })

  it('works with only one audience scanned', () => {
    const summary = summaryOf(noOne, onlyConnectionsScanned())
    expect([summary.latestScanDates, summary.peopleByAudience, summary.openToWork.rate]).toEqual([{ followers: null, contacts: '2026-09-21' }, { followers: 0, contacts: 1, both: 0 }, 100])
  })

  it('has nothing to judge before either audience is scanned', () => {
    const summary = summaryOf(noOne, noOne)
    expect([summary.peopleCount, summary.openToWork.rate, summary.latestQuality]).toEqual([0, null, null])
  })
})
