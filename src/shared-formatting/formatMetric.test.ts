import { daysSince, formatCount, formatLongDate, formatPercent, formatPercentagePoints, formatRatio, formatShortDate, formatSignedCount } from './formatMetric'

describe('rates', () => {
  it('shows a rate as a percentage with one decimal', () => {
    expect(formatPercent(9.8333)).toBe('9.8%')
  })

  it('shows a missing rate as not available', () => {
    expect(formatPercent(null)).toBe('—')
  })
})

describe('rate changes', () => {
  it('shows a rising rate as positive percentage points', () => {
    expect(formatPercentagePoints(1.2)).toBe('+1.2pp')
  })

  it('shows a falling rate as negative percentage points', () => {
    expect(formatPercentagePoints(-0.35)).toBe('-0.3pp')
  })

  it('shows an unchanged rate without a sign', () => {
    expect(formatPercentagePoints(0)).toBe('0.0pp')
  })

  it('shows a change that cannot be measured yet as not available', () => {
    expect(formatPercentagePoints(null)).toBe('—')
  })
})

describe('people counts', () => {
  it('marks people who arrived with a plus sign', () => {
    expect(formatSignedCount(12)).toBe('+12')
  })

  it('marks people who left with a minus sign', () => {
    expect(formatSignedCount(-7)).toBe('-7')
  })

  it('shows no movement without a sign', () => {
    expect(formatSignedCount(0)).toBe('0')
  })

  it('groups large counts by thousands', () => {
    expect(formatCount(12_345)).toBe('12,345')
  })
})

describe('entry / exit ratio', () => {
  it('shows the ratio with two decimals', () => {
    expect(formatRatio(1.714)).toBe('1.71')
  })

  it('shows a ratio without any exits as not available', () => {
    expect(formatRatio(null)).toBe('—')
  })
})

describe('scan dates', () => {
  it('shows a scan day with its year', () => {
    expect(formatLongDate('2026-09-22')).toBe('Sep 22, 2026')
  })

  it('shows a scan day without its year in tight spaces', () => {
    expect(formatShortDate('2026-09-01')).toBe('Sep 1')
  })

  it('counts whole days since a scan day', () => {
    expect(daysSince('2026-09-15', new Date(2026, 8, 22))).toBe(7)
  })

  it('counts a scan from today as zero days ago', () => {
    expect(daysSince('2026-09-22', new Date(2026, 8, 22, 23, 30))).toBe(0)
  })
})
