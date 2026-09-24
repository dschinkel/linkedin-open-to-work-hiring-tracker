import type { AllDashboard, Audience } from '../../../contracts/api.ts'
import { hiringSignal, type Observation, openToWorkSignal, type Person, type Scan, type Signal } from '../../shared/domain/Observation.ts'
import type { PeopleAcrossAudiences } from './AcrossAudiences.ts'
import type { NetworkIndex } from './NetworkIndex.ts'
import { countSignal, publicRate } from './Rates.ts'
import { qualityOfScans } from './ScanQuality.ts'
import { countHiringCompanies } from './Timeline.ts'

export type LatestScansAcrossAudiences = Omit<AllDashboard, 'whoIsHiring'>

interface Sighting {
  observation: Observation
  person: Person
}

const statusRank = { POSITIVE: 2, NEGATIVE: 1, UNCERTAIN: 0 }

export function summarizeLatestScansAcrossAudiences(pairs: PeopleAcrossAudiences, followers: NetworkIndex, contacts: NetworkIndex): LatestScansAcrossAudiences {
  const [followersScan, contactsScan] = [followers.scansInOrder.at(-1), contacts.scansInOrder.at(-1)]
  const [followerSightings, contactSightings] = [sightingsIn(followersScan, followers, 'followers'), sightingsIn(contactsScan, contacts, 'contacts')]
  const merged = mergeSightings(pairs, followerSightings, contactSightings)
  const observations = merged.map((sighting) => sighting.observation)
  const personOf = personLookup(merged)
  const scans = [followersScan, contactsScan].filter((scan): scan is Scan => scan !== undefined)
  return {
    latestScanDates: { followers: followersScan?.scanDate ?? null, contacts: contactsScan?.scanDate ?? null },
    peopleCount: merged.length,
    peopleByAudience: { followers: followerSightings.size, contacts: contactSightings.size, both: followerSightings.size + contactSightings.size - merged.length },
    openToWork: openToWorkAmong(observations),
    hiring: hiringAmong(observations, personOf),
    latestQuality: scans.length === 0 ? null : qualityOfScans(scans, observations, personOf),
  }
}

function openToWorkAmong(observations: Observation[]): LatestScansAcrossAudiences['openToWork'] {
  const counts = countSignal(observations, openToWorkSignal)
  return { open: counts.positive, notOpen: counts.negative, uncertain: counts.uncertain, rate: publicRate(counts) }
}

function hiringAmong(observations: Observation[], personOf: (personId: string) => Person): LatestScansAcrossAudiences['hiring'] {
  const counts = countSignal(observations, hiringSignal)
  return { hiring: counts.positive, notHiring: counts.negative, uncertain: counts.uncertain, rate: publicRate(counts), companyCount: countHiringCompanies(observations, personOf) }
}

function sightingsIn(scan: Scan | undefined, index: NetworkIndex, audience: Audience): Map<string, Sighting> {
  const observations = scan ? index.observationsOf(scan.id) : []
  return new Map(observations.map((observation) => [observation.personId, labelled({ observation, person: index.personOf(observation.personId) }, audience)]))
}

function labelled({ observation, person }: Sighting, audience: Audience): Sighting {
  const personId = `${audience}:${observation.personId}`
  return { observation: { ...observation, personId }, person: { ...person, id: personId } }
}

function mergeSightings(pairs: PeopleAcrossAudiences, followers: Map<string, Sighting>, contacts: Map<string, Sighting>): Sighting[] {
  const merged = new Map(followers)
  for (const [contactId, contactSighting] of contacts) {
    const followerId = pairs.followerOf.get(contactId) ?? ''
    const followerSighting = merged.get(followerId)
    if (followerSighting) merged.set(followerId, combine(followerSighting, contactSighting))
    else merged.set(`contacts:${contactId}`, contactSighting)
  }
  return [...merged.values()]
}

function combine(follower: Sighting, contact: Sighting): Sighting {
  const clearerOpen = clearerFor(openToWorkSignal, follower, contact)
  const clearerHiring = clearerFor(hiringSignal, follower, contact)
  return {
    observation: { ...follower.observation, openToWork: clearerOpen.observation.openToWork, hiring: clearerHiring.observation.hiring },
    person: { ...clearerHiring.person, id: follower.person.id },
  }
}

function clearerFor(signal: Signal, first: Sighting, second: Sighting): Sighting {
  const rankDifference = statusRank[signal.read(second.observation)] - statusRank[signal.read(first.observation)]
  if (rankDifference !== 0) return rankDifference > 0 ? second : first
  return signal.confidenceOf(second.observation) > signal.confidenceOf(first.observation) ? second : first
}

function personLookup(sightings: Sighting[]): (personId: string) => Person {
  const people = new Map(sightings.map((sighting) => [sighting.observation.personId, sighting.person]))
  return (personId) => people.get(personId) as Person
}
