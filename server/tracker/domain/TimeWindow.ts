import type { TimeWindow } from '../../../contracts/api.ts'
import { addDays } from '../../shared/domain/ScanDate.ts'

const windowDays: Record<TimeWindow, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '6m': 182,
  '1y': 365,
  all: null,
}

/** Keeps items dated within the window that ends at the newest date. */
export function withinWindow<Item extends { scanDate: string }>(items: Item[], window: TimeWindow): Item[] {
  const days = windowDays[window]
  const newest = items.at(-1)?.scanDate
  if (days === null || newest === undefined) return items
  const startExclusive = addDays(newest, -days)
  return items.filter((item) => item.scanDate > startExclusive)
}
