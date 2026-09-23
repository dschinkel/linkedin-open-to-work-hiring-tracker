import { observationOf } from './tests/ObservationFixtures.ts'
import { openToWorkSignal } from '../../shared/domain/Observation.ts'
import { countSignal, entryExitRatio, percentagePointChange, publicRate } from './Rates.ts'

describe('public open-to-work rate', () => {
  it('excludes uncertain observations from the denominator', () => {
    const observations = [observationOf('a', 'OPEN'), observationOf('b', 'NOT_OPEN'), observationOf('c', 'NOT_OPEN'), observationOf('d', 'NOT_OPEN'), observationOf('e', 'UNCERTAIN')]

    expect(publicRate(countSignal(observations, openToWorkSignal))).toBe(25)
  })

  it('is unknown when nobody was classified', () => {
    expect(publicRate(countSignal([observationOf('a', 'UNCERTAIN')], openToWorkSignal))).toBeNull()
  })
})

describe('rate comparisons', () => {
  it('reports a change between rates in percentage points', () => {
    expect(percentagePointChange(12.7, 11.3)).toBeCloseTo(1.4)
  })

  it('reports the entry/exit ratio as entries per exit', () => {
    expect(entryExitRatio(137, 72)).toBeCloseTo(1.9, 2)
  })

  it('has no entry/exit ratio when nobody was removed', () => {
    expect(entryExitRatio(5, 0)).toBeNull()
  })
})
