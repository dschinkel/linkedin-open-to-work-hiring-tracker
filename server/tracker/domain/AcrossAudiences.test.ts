import type { HiringPerson, OpenToWorkPerson } from '../../../contracts/api.ts'
import type { Person } from '../../shared/domain/Observation.ts'
import { countPeopleAcrossAudiences, mergeHiringPeople, mergeOpenToWorkPeople, pairAcrossAudiences } from './AcrossAudiences.ts'

const photoOf = (red: number, green: number, blue: number) => [red, green, blue].map((value) => value.toString(16).padStart(2, '0').repeat(64)).join('')
const warmPhoto = photoOf(200, 150, 90)
const coolPhoto = photoOf(40, 90, 170)

function person(id: string, displayName: string, headline: string | null, photoPrint: string | null = null): Person {
  return { id, personHash: `hash-${id}`, displayName, headline, companyName: null, companyConfidence: null, companyExtractionMethod: 'unknown', ...(photoPrint ? { photoPrint } : {}) }
}

function openRow(who: Person, overrides: Partial<OpenToWorkPerson> = {}): OpenToWorkPerson {
  return {
    personId: who.id,
    displayName: who.displayName,
    headline: who.headline,
    companyName: null,
    firstSeenOpen: '2026-09-01',
    lastSeenOpen: '2026-09-22',
    openSince: '2026-09-01',
    daysOpen: 22,
    scansSeenOpen: 4,
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

function hiringRow(who: Person, overrides: Partial<HiringPerson> = {}): HiringPerson {
  return {
    personId: who.id,
    displayName: who.displayName,
    headline: who.headline,
    companyName: 'Globex',
    companyNeedsReview: false,
    firstSeenHiring: '2026-09-01',
    lastSeenHiring: '2026-09-22',
    lastSeen: '2026-09-22',
    hiringSince: '2026-09-01',
    daysHiring: 22,
    scansSeenHiring: 4,
    isCurrentlyHiring: true,
    wasObservedInLatestScan: true,
    ...overrides,
  }
}

const danaFollower = person('f-dana', 'Dana Lee', 'Senior Software Engineer at Initech', warmPhoto)
const danaConnection = person('c-dana', 'Dana Lee', 'Senior Software Engineer at Initech', warmPhoto)
const samFollower = person('f-sam', 'Sam Ortiz', 'Product Designer at Contoso')
const miaConnection = person('c-mia', 'Mia Chen', 'Data Scientist at Umbrella')

function openAcross(followers: { people: Person[]; rows: OpenToWorkPerson[] }, connections: { people: Person[]; rows: OpenToWorkPerson[] }) {
  return mergeOpenToWorkPeople(pairAcrossAudiences(followers.people, connections.people), followers.rows, connections.rows)
}

describe('open to work across followers and connections', () => {
  it('lists someone who is both a follower and a connection once, as in both', () => {
    const merged = openAcross({ people: [danaFollower], rows: [openRow(danaFollower)] }, { people: [danaConnection], rows: [openRow(danaConnection)] })
    expect(merged.map((row) => [row.displayName, row.seenIn])).toEqual([['Dana Lee', 'both']])
  })

  it('says which list someone found in only one audience came from', () => {
    const merged = openAcross({ people: [samFollower], rows: [openRow(samFollower)] }, { people: [miaConnection], rows: [openRow(miaConnection)] })

    expect(merged.map((row) => [row.displayName, row.seenIn]).sort()).toEqual([
      ['Mia Chen', 'contacts'],
      ['Sam Ortiz', 'followers'],
    ])
  })

  it('keeps apart two people who share a name but clearly have different photos and titles', () => {
    const otherDana = person('c-dana-2', 'Dana Lee', 'Registered Nurse at Mercy Hospital', coolPhoto)
    const merged = openAcross({ people: [danaFollower], rows: [openRow(danaFollower)] }, { people: [otherDana], rows: [openRow(otherDana)] })
    expect(merged.map((row) => row.seenIn)).toEqual(['followers', 'contacts'])
  })

  it('recognises the same photo even after the title changed', () => {
    const renamedDana = person('c-dana', 'Dana Lee', 'Open to new roles', warmPhoto)
    const merged = openAcross({ people: [danaFollower], rows: [openRow(danaFollower)] }, { people: [renamedDana], rows: [openRow(renamedDana)] })
    expect(merged.map((row) => row.seenIn)).toEqual(['both'])
  })

  it('marks a follower who is also a connection as in both, even when only one list shows the frame', () => {
    const merged = openAcross({ people: [danaFollower], rows: [openRow(danaFollower)] }, { people: [danaConnection], rows: [] })
    expect(merged.map((row) => row.seenIn)).toEqual(['both'])
  })

  it('keeps the earliest start, the longest run, and the latest sighting', () => {
    const merged = openAcross(
      { people: [danaFollower], rows: [openRow(danaFollower, { firstSeenOpen: '2026-08-01', openSince: '2026-09-10', daysOpen: 13, scansSeenOpen: 9, lastSeenOpen: '2026-09-20' })] },
      { people: [danaConnection], rows: [openRow(danaConnection, { firstSeenOpen: '2026-08-15', openSince: '2026-09-02', daysOpen: 21, scansSeenOpen: 3, lastSeenOpen: '2026-09-22' })] },
    )

    expect(merged[0]).toMatchObject({ firstSeenOpen: '2026-08-01', openSince: '2026-09-02', daysOpen: 21, scansSeenOpen: 9, lastSeenOpen: '2026-09-22' })
  })

  it('greys out a merged person only when neither latest scan showed them', () => {
    const staleIn = (followerSeen: boolean, connectionSeen: boolean) =>
      openAcross(
        { people: [danaFollower], rows: [openRow(danaFollower, { wasObservedInLatestScan: followerSeen })] },
        { people: [danaConnection], rows: [openRow(danaConnection, { wasObservedInLatestScan: connectionSeen })] },
      )[0].wasObservedInLatestScan

    expect([staleIn(false, true), staleIn(true, false), staleIn(false, false)]).toEqual([true, true, false])
  })

  it('shows the headline from the most recent sighting', () => {
    const merged = openAcross(
      { people: [danaFollower], rows: [openRow(danaFollower, { headline: 'Old title', lastSeenOpen: '2026-09-01' })] },
      { people: [danaConnection], rows: [openRow(danaConnection, { headline: 'New title', lastSeenOpen: '2026-09-22' })] },
    )

    expect(merged[0].headline).toBe('New title')
  })

  it('gives every row an id of its own even when both audiences reuse the same ids', () => {
    const connectionWithFollowerId = person('f-sam', 'Mia Chen', 'Data Scientist at Umbrella')
    const merged = openAcross({ people: [samFollower], rows: [openRow(samFollower)] }, { people: [connectionWithFollowerId], rows: [openRow(connectionWithFollowerId)] })
    expect(new Set(merged.map((row) => row.personId)).size).toBe(2)
  })
})

describe('hiring across followers and connections', () => {
  function hiringAcross(followerRow: HiringPerson, connectionRow: HiringPerson) {
    return mergeHiringPeople(pairAcrossAudiences([danaFollower], [danaConnection]), [followerRow], [connectionRow])
  }

  it('lists someone hiring in both audiences once', () => {
    expect(hiringAcross(hiringRow(danaFollower), hiringRow(danaConnection)).map((row) => row.seenIn)).toEqual(['both'])
  })

  it('takes whether they are still hiring from the most recent sighting', () => {
    const merged = hiringAcross(hiringRow(danaFollower, { isCurrentlyHiring: false, lastSeen: '2026-09-22' }), hiringRow(danaConnection, { isCurrentlyHiring: true, lastSeen: '2026-07-01' }))
    expect(merged[0].isCurrentlyHiring).toBe(false)
  })

  it('keeps the earliest hiring start and the longest run', () => {
    const merged = hiringAcross(hiringRow(danaFollower, { hiringSince: '2026-09-05', daysHiring: 18, firstSeenHiring: '2026-06-01' }), hiringRow(danaConnection, { hiringSince: '2026-08-20', daysHiring: 9, firstSeenHiring: '2026-07-01' }))
    expect(merged[0]).toMatchObject({ hiringSince: '2026-08-20', daysHiring: 18, firstSeenHiring: '2026-06-01' })
  })
})

describe('network size across followers and connections', () => {
  it('counts someone who is both a follower and a connection once', () => {
    const pairs = pairAcrossAudiences([danaFollower, samFollower], [danaConnection, miaConnection])
    expect(countPeopleAcrossAudiences(pairs, new Set(['f-dana', 'f-sam']), new Set(['c-dana', 'c-mia']))).toBe(3)
  })

  it('counts a pair once when only one of them was seen recently', () => {
    const pairs = pairAcrossAudiences([danaFollower], [danaConnection])
    expect(countPeopleAcrossAudiences(pairs, new Set(['f-dana']), new Set())).toBe(1)
  })
})
