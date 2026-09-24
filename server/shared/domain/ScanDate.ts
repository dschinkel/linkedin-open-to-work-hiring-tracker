const isoDateInFileName = /(\d{4}-\d{2}-\d{2})/

/**
 * Reads the capture date from the screenshot's file name, which covers both
 * macOS ("Screenshot 2026-09-22 at 9.01.12 AM.png") and GoFullPage
 * ("screencapture-linkedin-com-mynetwork-2026-09-22-09_01_12.png").
 * Falls back to the file's own timestamp when the name holds no date.
 */
export function parseScanDate(fileName: string, fileTimestamp: Date): string {
  const match = isoDateInFileName.exec(fileName)
  if (match) return match[1]
  return localIsoDate(fileTimestamp)
}

/** The calendar day where the user is, so a late-evening capture isn't filed under tomorrow's UTC date. */
function localIsoDate(date: Date): string {
  const twoDigits = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${twoDigits(date.getMonth() + 1)}-${twoDigits(date.getDate())}`
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate(date)
}

export function daysBetween(fromIsoDate: string, toIsoDateValue: string): number {
  const millisecondsPerDay = 86_400_000
  return Math.round((Date.parse(`${toIsoDateValue}T00:00:00Z`) - Date.parse(`${fromIsoDate}T00:00:00Z`)) / millisecondsPerDay)
}
