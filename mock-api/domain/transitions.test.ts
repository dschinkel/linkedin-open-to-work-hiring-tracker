import { observationOf } from './tests/observationFixtures.ts'
import { hiringSignal, openToWorkSignal } from './observation.ts'
import { entryRate, type LastKnownStatuses, netMovement, removalRate, tallyTransitions } from './transitions.ts'

const lastKnown = (entries: Array<[string, 'POSITIVE' | 'NEGATIVE']>): LastKnownStatuses => new Map(entries)

describe('open-to-work transitions', () => {
  it('counts a matched person going from not open to open as newly open', () => {
    const tally = tallyTransitions([observationOf('a', 'OPEN')], openToWorkSignal, lastKnown([['a', 'NEGATIVE']]))

    expect(tally.added).toBe(1)
  })

  it('counts a matched person going from open to not open as removed', () => {
    const tally = tallyTransitions([observationOf('a', 'NOT_OPEN')], openToWorkSignal, lastKnown([['a', 'POSITIVE']]))

    expect(tally.removed).toBe(1)
  })

  it('does not count a person missing from the new sample as removed', () => {
    const tally = tallyTransitions([], openToWorkSignal, lastKnown([['a', 'POSITIVE']]))

    expect(tally.removed).toBe(0)
  })

  it('does not count a first-time person who is open as newly open', () => {
    const tally = tallyTransitions([observationOf('new', 'OPEN')], openToWorkSignal, lastKnown([]))

    expect(tally.added).toBe(0)
  })

  it('computes the removal rate over previously open people seen again', () => {
    const previous = lastKnown([['a', 'POSITIVE'], ['b', 'POSITIVE'], ['c', 'POSITIVE'], ['d', 'POSITIVE']])
    const current = [observationOf('a', 'NOT_OPEN'), observationOf('b', 'OPEN'), observationOf('c', 'OPEN'), observationOf('d', 'OPEN')]

    expect(removalRate(tallyTransitions(current, openToWorkSignal, previous))).toBe(25)
  })

  it('computes the entry rate over previously not-open people seen again', () => {
    const previous = lastKnown([['a', 'NEGATIVE'], ['b', 'NEGATIVE']])
    const current = [observationOf('a', 'OPEN'), observationOf('b', 'NOT_OPEN')]

    expect(entryRate(tallyTransitions(current, openToWorkSignal, previous))).toBe(50)
  })

  it('reports net movement as added minus removed', () => {
    expect(netMovement({ added: 9, removed: 3, stayedPositive: 0, stayedNegative: 0 })).toBe(6)
  })
})

describe('hiring transitions', () => {
  it('tracks the hiring frame independently of the open-to-work frame', () => {
    const tally = tallyTransitions([observationOf('a', 'OPEN', 'HIRING')], hiringSignal, lastKnown([['a', 'NEGATIVE']]))

    expect(tally.added).toBe(1)
  })
})
