import type { ScanSummary, TitleTrends } from '../../../contracts/api.ts'
import type { NetworkIndex } from './NetworkIndex.ts'
import { openToWorkSignal } from '../../shared/domain/Observation.ts'
import { percentage, percentagePointChange } from './Rates.ts'

const titleFamilies: Array<{ family: string; words: RegExp }> = [
  { family: 'Recruiter / Talent', words: /\b(recruit\w*|talent|sourc\w+|hr\b|human resources|people partner)/i },
  { family: 'Founder / Executive', words: /\b(founder|co-founder|ceo|cto|cio|coo|chief|president|owner)\b/i },
  { family: 'VP / Director', words: /\b(vp|vice president|director|head of)\b/i },
  { family: 'Engineering Manager', words: /\b(engineering manager|manager,? (software|engineering)|tech(nical)? lead|team lead|lead engineer)\b/i },
  { family: 'Product', words: /\b(product (manager|owner|lead)|pm\b|product management)/i },
  { family: 'Design / UX', words: /\b(design\w*|ux|ui\b|user experience)/i },
  { family: 'Data / AI / ML', words: /\b(data|machine learning|ml\b|ai\b|artificial intelligence|analyst|scientist)/i },
  { family: 'DevOps / Cloud / SRE', words: /\b(devops|sre|site reliability|cloud|platform|infrastructure)/i },
  { family: 'QA / Test', words: /\b(qa|quality|test\w*|sdet)\b/i },
  { family: 'Agile / Coach / Delivery', words: /\b(agile|scrum|coach|delivery|project manager|program manager)\b/i },
  { family: 'Consultant', words: /\b(consult\w*|advisor|freelanc\w*)/i },
  { family: 'Software Engineer', words: /\b(software|engineer\w*|developer|programmer|architect|full[- ]?stack|front[- ]?end|back[- ]?end|swe)\b/i },
]

export function titleFamily(headline: string | null): string | null {
  if (!headline) return null
  const title = headline.split(/\s(?:at|@)\s|\||·|•/)[0]
  return titleFamilies.find(({ words }) => words.test(title))?.family ?? null
}

const maximumPeriods = 6

export function openToWorkByTitle(index: NetworkIndex, scansInWindow: ScanSummary[]): TitleTrends {
  const periods = periodsFor(scansInWindow)
  const familyOf = new Map(index.scansInOrder.flatMap((scan) => index.observationsOf(scan.id)).map((observation) => [observation.personId, titleFamily(index.personOf(observation.personId).headline)]))
  const counts = countByFamilyAndPeriod(index, scansInWindow, periods, familyOf)
  const people = new Set(scansInWindow.flatMap((scan) => index.observationsOf(scan.id).map((observation) => observation.personId)))
  const rows = [...counts.entries()].map(([title, byPeriod]) => toRow(title, byPeriod, periods.labels.length))
  return {
    periods: periods.labels,
    rows: rows.sort((a, b) => (b.cells.at(-1)?.rate ?? -1) - (a.cells.at(-1)?.rate ?? -1) || a.title.localeCompare(b.title)),
    peopleWithTitle: [...people].filter((personId) => familyOf.get(personId)).length,
    peopleTotal: people.size,
  }
}

interface Periods {
  labels: string[]
  periodOf: (scanDate: string) => number
}

function periodsFor(scans: ScanSummary[]): Periods {
  const dates = scans.map((scan) => scan.scanDate)
  const months = [...new Set(dates.map((date) => date.slice(0, 7)))].slice(-maximumPeriods)
  if (months.length >= 3) return { labels: months.map(monthLabel), periodOf: (date) => months.indexOf(date.slice(0, 7)) }
  const days = dates.slice(-maximumPeriods)
  return { labels: days.map(dayLabel), periodOf: (date) => days.indexOf(date) }
}

type Tally = { open: number; classified: number }

function countByFamilyAndPeriod(index: NetworkIndex, scans: ScanSummary[], periods: Periods, familyOf: Map<string, string | null>): Map<string, Tally[]> {
  const latestStatus = new Map<string, 'POSITIVE' | 'NEGATIVE'>()
  for (const scan of scans) {
    const period = periods.periodOf(scan.scanDate)
    if (period < 0) continue
    for (const observation of index.observationsOf(scan.id)) {
      const status = openToWorkSignal.read(observation)
      if (status !== 'UNCERTAIN') latestStatus.set(`${period}|${observation.personId}`, status)
    }
  }
  const counts = new Map<string, Tally[]>()
  for (const [key, status] of latestStatus) {
    const [period, personId] = key.split('|')
    const family = familyOf.get(personId)
    if (!family) continue
    const byPeriod = counts.get(family) ?? periods.labels.map(() => ({ open: 0, classified: 0 }))
    byPeriod[Number(period)].classified += 1
    if (status === 'POSITIVE') byPeriod[Number(period)].open += 1
    counts.set(family, byPeriod)
  }
  return counts
}

function toRow(title: string, byPeriod: Tally[], periodCount: number): TitleTrends['rows'][number] {
  const cells = byPeriod.slice(0, periodCount).map((tally) => ({ ...tally, rate: percentage(tally.open, tally.classified) }))
  const withData = cells.filter((cell) => cell.rate !== null)
  return { title, cells, changePp: withData.length >= 2 ? percentagePointChange(withData.at(-1)?.rate ?? null, withData[0].rate) : null }
}

function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
