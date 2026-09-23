// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { Audience, DepartedPeople } from '@contracts/api'
import { departedPerson, insideTracker } from '@/test-support/trackerFixtures'
import type { DepartureRepository } from './DepartureRepository'
import { useFindDepartedPeople } from './useFindDepartedPeople'

const anaSilva = departedPerson()
const tomOkafor = departedPerson({
  personId: 'person-tom-okafor',
  displayName: 'Tom Okafor',
  companyName: null,
  firstSeen: '2026-05-10',
  lastSeen: '2026-09-12',
  wasOpenToWorkWhenLastSeen: true,
  wasHiringWhenLastSeen: true,
})

function departureRepositoryReturning(departed: DepartedPeople): DepartureRepository {
  return { departed: async () => departed }
}

async function readyDepartures(departed: DepartedPeople, audience: Audience = 'followers') {
  const rendered = renderHook(() => useFindDepartedPeople(departureRepositoryReturning(departed)), { wrapper: insideTracker({ audience }) })
  await waitFor(() => expect(rendered.result.current.status).toBe('ready'))
  return rendered
}

const twoDeparted: DepartedPeople = { people: [anaSilva, tomOkafor], scansMissedThreshold: 4 }

describe('people who left the list', () => {
  it('calls followers who left unfollowers', async () => {
    const { result } = await readyDepartures(twoDeparted, 'followers')

    expect(result.current.title).toBe('Unfollowers')
  })

  it('calls contacts who left past contacts', async () => {
    const { result } = await readyDepartures(twoDeparted, 'contacts')

    expect(result.current.title).toBe('Past contacts')
  })

  it('explains how many missed scans count as leaving', async () => {
    const { result } = await readyDepartures(twoDeparted)

    expect(result.current.explanation).toContain('last 4 scans')
  })

  it('counts everyone who left', async () => {
    const { result } = await readyDepartures(twoDeparted)

    expect(result.current.resultSummary).toContain('2')
  })

  it('finds people by part of their name, ignoring case and spaces', async () => {
    const { result } = await readyDepartures(twoDeparted)

    act(() => result.current.searchByName('  OKAF '))

    expect(result.current.rows.map((row) => row.cells.name.text)).toEqual(['Tom Okafor'])
  })

  it('keeps the search on show', async () => {
    const { result } = await readyDepartures(twoDeparted)

    act(() => result.current.searchByName('ana'))

    expect(result.current.search).toBe('ana')
  })

  it('says nobody left when the search matches no one', async () => {
    const { result } = await readyDepartures(twoDeparted)

    act(() => result.current.searchByName('Zoe'))

    expect(result.current).toMatchObject({ hasPeople: false, showNobodyLeft: true })
  })

  it('shows when each person was first and last seen', async () => {
    const { result } = await readyDepartures(twoDeparted)

    expect(result.current.rows[0].cells).toMatchObject({ firstSeen: { text: 'Apr 2' }, lastSeen: { text: 'Sep 15' }, missed: { text: '4' } })
  })

  it('shows which frames a person wore when last seen', async () => {
    const { result } = await readyDepartures(twoDeparted)

    expect(result.current.rows[1].cells.frames.text).toBe('#OPEN_TO_WORK, #HIRING')
  })

  it('shows a missing company as not visible', async () => {
    const { result } = await readyDepartures(twoDeparted)

    expect(result.current.rows[1].cells.company.text).toBe('Company not visible')
  })
})
