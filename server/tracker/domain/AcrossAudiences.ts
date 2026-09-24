import type { Audience, HiringPerson, OpenToWorkPerson, SeenIn } from '../../../contracts/api.ts'
import { normalizeIdentity } from '../../shared/domain/IdentityText.ts'
import type { Person } from '../../shared/domain/Observation.ts'
import { matchNamesakes } from '../../screenshots/domain/Namesakes.ts'

export interface PeopleAcrossAudiences {
  followerOf: Map<string, string>
  connectionOf: Map<string, string>
}

interface ListedPerson {
  personId: string
  seenIn?: SeenIn
}

export function pairAcrossAudiences(followers: Person[], connections: Person[]): PeopleAcrossAudiences {
  const followersByName = groupByName(followers)
  const followerOf = new Map<string, string>()
  for (const [name, namesakes] of groupByName(connections)) {
    const matches = matchNamesakes(namesakes, followersByName.get(name) ?? [])
    for (const [position, follower] of matches) followerOf.set(namesakes[position].id, follower.id)
  }
  return { followerOf, connectionOf: new Map([...followerOf].map(([connectionId, followerId]) => [followerId, connectionId])) }
}

export function mergeOpenToWorkPeople(pairs: PeopleAcrossAudiences, followers: OpenToWorkPerson[], connections: OpenToWorkPerson[]): OpenToWorkPerson[] {
  return mergeAcross(pairs, followers, connections, combineOpenToWork).sort((a, b) => b.lastSeenOpen.localeCompare(a.lastSeenOpen) || a.displayName.localeCompare(b.displayName))
}

export function mergeHiringPeople(pairs: PeopleAcrossAudiences, followers: HiringPerson[], connections: HiringPerson[]): HiringPerson[] {
  return mergeAcross(pairs, followers, connections, combineHiring)
}

export function countPeopleAcrossAudiences(pairs: PeopleAcrossAudiences, recentFollowers: Set<string>, recentConnections: Set<string>): number {
  const alsoRecentFollowers = [...recentConnections].filter((connectionId) => recentFollowers.has(pairs.followerOf.get(connectionId) ?? ''))
  return recentFollowers.size + recentConnections.size - alsoRecentFollowers.length
}

function mergeAcross<Row extends ListedPerson>(pairs: PeopleAcrossAudiences, followers: Row[], connections: Row[], combine: (first: Row, second: Row) => Row): Row[] {
  const connectionRowOfFollower = new Map(connections.filter((row) => pairs.followerOf.has(row.personId)).map((row) => [pairs.followerOf.get(row.personId) as string, row]))
  const listedFollowers = new Set(followers.map((row) => row.personId))
  const fromFollowers = followers.map((row) => {
    const connectionRow = connectionRowOfFollower.get(row.personId)
    return labelled(connectionRow ? combine(row, connectionRow) : row, 'followers', row.personId, pairs.connectionOf.has(row.personId))
  })
  const onlyFromConnections = connections
    .filter((row) => !listedFollowers.has(pairs.followerOf.get(row.personId) ?? ''))
    .map((row) => labelled(row, 'contacts', row.personId, pairs.followerOf.has(row.personId)))
  return [...fromFollowers, ...onlyFromConnections]
}

function labelled<Row extends ListedPerson>(row: Row, audience: Audience, personId: string, isInBoth: boolean): Row {
  return { ...row, personId: `${audience}:${personId}`, seenIn: isInBoth ? 'both' : audience }
}

function combineOpenToWork(first: OpenToWorkPerson, second: OpenToWorkPerson): OpenToWorkPerson {
  const freshest = second.lastSeenOpen > first.lastSeenOpen ? second : first
  return {
    ...freshest,
    firstSeenOpen: earliest(first.firstSeenOpen, second.firstSeenOpen),
    lastSeenOpen: latest(first.lastSeenOpen, second.lastSeenOpen),
    openSince: earliest(first.openSince, second.openSince),
    daysOpen: Math.max(first.daysOpen, second.daysOpen),
    scansSeenOpen: Math.max(first.scansSeenOpen, second.scansSeenOpen),
    wasObservedInLatestScan: first.wasObservedInLatestScan || second.wasObservedInLatestScan,
  }
}

function combineHiring(first: HiringPerson, second: HiringPerson): HiringPerson {
  const freshest = second.lastSeen > first.lastSeen ? second : first
  return {
    ...freshest,
    firstSeenHiring: earliest(first.firstSeenHiring, second.firstSeenHiring),
    lastSeenHiring: latest(first.lastSeenHiring, second.lastSeenHiring),
    lastSeen: latest(first.lastSeen, second.lastSeen),
    hiringSince: earliest(first.hiringSince, second.hiringSince),
    daysHiring: Math.max(first.daysHiring, second.daysHiring),
    scansSeenHiring: Math.max(first.scansSeenHiring, second.scansSeenHiring),
    isCurrentlyHiring: first.lastSeen === second.lastSeen ? first.isCurrentlyHiring || second.isCurrentlyHiring : freshest.isCurrentlyHiring,
    wasObservedInLatestScan: first.wasObservedInLatestScan || second.wasObservedInLatestScan,
  }
}

function earliest(first: string, second: string): string {
  return first < second ? first : second
}

function latest(first: string, second: string): string {
  return first > second ? first : second
}

function groupByName(people: Person[]): Map<string, Person[]> {
  const byName = new Map<string, Person[]>()
  for (const person of people) {
    const name = normalizeIdentity({ displayName: person.displayName, headline: person.headline, companyName: null })
    byName.set(name, [...(byName.get(name) ?? []), person])
  }
  return byName
}
