import type { DepartedPeople } from '../../../contracts/api.ts'
import { listDepartedPeople } from '../domain/DepartedPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Unfollowers or past contacts, recomputed from the stored scans on every request. */
export const findDepartedPeople = ({ analytics }: TrackerPorts) => ({
  findDepartedPeople: (): DepartedPeople => listDepartedPeople(analytics().index),
})
