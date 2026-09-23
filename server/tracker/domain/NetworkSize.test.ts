import { indexNetwork } from './NetworkIndex.ts'
import { networkSize } from './NetworkSize.ts'
import type { Network, Observation } from '../../shared/domain/Observation.ts'

const dates = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']

function seen(personId: string, scanDate: string): Observation {
  return {
    scanId: scanDate,
    personId,
    openToWork: { status: 'NOT_OPEN', confidence: 0.97, classificationMethod: 'opencv' },
    hiring: { status: 'NOT_HIRING', confidence: 0.97, classificationMethod: 'opencv' },
  }
}

function networkWhere(sightings: Record<string, string[]>): Network {
  return {
    people: [],
    scans: dates.map((scanDate) => ({ id: scanDate, scanDate, screenshots: [], cardsDetected: 0, duplicateCount: 0 })),
    observations: Object.entries(sightings).flatMap(([personId, scanDates]) => scanDates.map((scanDate) => seen(personId, scanDate))),
  }
}

describe('size of your followers or contacts list', () => {
  it('adds up people spread across several recent scans, counting each once', () => {
    const network = networkWhere({ everyDay: dates, onlyToday: ['2026-09-22'], onlyYesterday: ['2026-09-21'] })

    expect(networkSize(indexNetwork(network)).peopleCount).toBe(3)
  })

  it('leaves out people who are no longer seen', () => {
    const network = networkWhere({ stayed: dates, left: ['2026-09-18'] })

    expect(networkSize(indexNetwork(network)).peopleCount).toBe(1)
  })

  it('is zero before the first scan', () => {
    expect(networkSize(indexNetwork({ people: [], scans: [], observations: [] }))).toEqual({ peopleCount: 0, latestScanDate: null })
  })
})
