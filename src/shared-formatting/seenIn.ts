import type { AudienceChoice, SeenIn } from '@contracts/api'
import type { DataCell, DataColumn } from '@/components/DataTable'

const seenInLabels: Record<SeenIn, string> = { followers: 'Follower', contacts: 'Connection', both: 'Both' }

export function withSeenInColumn(columns: DataColumn[], audience: AudienceChoice): DataColumn[] {
  if (audience !== 'all') return columns
  const afterCompany = columns.findIndex((column) => column.key === 'company') + 1
  return [...columns.slice(0, afterCompany), { key: 'in', label: 'In' }, ...columns.slice(afterCompany)]
}

export function seenInCell(seenIn: SeenIn | undefined): DataCell {
  return { text: seenIn ? seenInLabels[seenIn] : '' }
}
