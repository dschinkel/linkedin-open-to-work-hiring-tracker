const notAvailable = '—'

export function formatPercent(rate: number | null): string {
  if (rate === null) return notAvailable
  return `${rate.toFixed(1)}%`
}

/** Rate differences are percentage points, never "%". */
export function formatPercentagePoints(change: number | null): string {
  if (change === null) return notAvailable
  return `${signOf(change)}${Math.abs(change).toFixed(1)}pp`
}

export function formatSignedCount(count: number): string {
  return `${signOf(count)}${Math.abs(count)}`
}

export function formatRatio(ratio: number | null): string {
  if (ratio === null) return notAvailable
  return ratio.toFixed(2)
}

export function formatCount(count: number): string {
  return count.toLocaleString('en-US')
}

function signOf(value: number): string {
  if (value > 0) return '+'
  if (value < 0) return '-'
  return ''
}

const longDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function formatLongDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`))
}

export function formatShortDate(isoDate: string): string {
  return shortDate.format(new Date(`${isoDate}T00:00:00Z`))
}

export function daysSince(isoDate: string, today: Date = new Date()): number {
  const millisecondsPerDay = 86_400_000
  const todayIso = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map((part) => String(part).padStart(2, '0')).join('-')
  return Math.round((Date.parse(`${todayIso}T00:00:00Z`) - Date.parse(`${isoDate}T00:00:00Z`)) / millisecondsPerDay)
}

/** "1 person", "42 people". */
export function formatPeople(count: number): string {
  return count === 1 ? '1 person' : `${formatCount(count)} people`
}

/** How long a frame has been showing: "3 days · 2 scans", "1 day · 1 scan". Days count both ends, so a frame seen on one day is 1 day. */
export function formatTimeShowingFrame(days: number, scansSeen: number): string {
  return `${plural(days, 'day')} · ${plural(scansSeen, 'scan')}`
}

function plural(count: number, unit: string): string {
  return `${formatCount(count)} ${unit}${count === 1 ? '' : 's'}`
}
