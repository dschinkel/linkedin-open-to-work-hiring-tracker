import { barCountFormat, inDrawOrder, latestTrendPoints, mirrorBelowZero, niceScale } from './chartData'

const daily = { key: 'daily', label: 'Daily', color: 'green', role: 'context' as const }
const average = { key: 'average', label: 'Average', color: 'green' }

describe('chart scale', () => {
  it('fits the values with round steps instead of starting at zero', () => {
    expect(niceScale([7.2, 10.6])).toEqual({ domain: [7, 11], ticks: [7, 8, 9, 10, 11] })
  })

  it('has no scale when nothing is plotted', () => {
    expect(niceScale([])).toBeNull()
  })
})

describe('line chart layers', () => {
  it('draws context lines underneath trend lines', () => {
    expect(inDrawOrder([average, daily]).map((line) => line.key)).toEqual(['daily', 'average'])
  })

  it('labels each trend line at its last plotted point', () => {
    const data = [
      { day: 'Mon', daily: 1, average: 2 },
      { day: 'Tue', daily: 3, average: null },
    ]

    expect(latestTrendPoints(data, 'day', [daily, average])).toEqual([{ key: 'average', x: 'Mon', y: 2 }])
  })
})

describe('bar chart values', () => {
  it('hangs exits under the zero line', () => {
    const exits = { key: 'removed', label: 'Removed', color: 'red', isBelowZero: true }
    expect(mirrorBelowZero([{ added: 2, removed: 3 }], [{ key: 'added', label: 'Added', color: 'green' }, exits])).toEqual([{ added: 2, removed: -3 }])
  })

  it('shows mirrored counts unsigned and signed counts with a plus for gains', () => {
    expect(barCountFormat(true)(-3)).toBe('3')
    expect(barCountFormat(false)(2)).toBe('+2')
  })
})
