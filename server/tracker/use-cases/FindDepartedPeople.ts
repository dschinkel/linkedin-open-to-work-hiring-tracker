import type { DepartedPeople } from '../../../contracts/api.ts'
import { listDepartedPeople } from '../domain/DepartedPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const findDepartedPeople = ({ analytics }: TrackerPorts) => ({
  findDepartedPeople: (): DepartedPeople => listDepartedPeople(analytics().index),
})
