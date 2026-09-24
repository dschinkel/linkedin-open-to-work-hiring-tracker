const isoDateInFileName = /(\d{4}-\d{2}-\d{2})/

export function parseScanDate(fileName: string, fileTimestamp: Date): string {
  const match = isoDateInFileName.exec(fileName)
  if (match) return match[1]
  return localIsoDate(fileTimestamp)
}

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
