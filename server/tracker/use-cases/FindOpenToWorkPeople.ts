import type { OpenToWorkPerson } from '../../../contracts/api.ts'
import { listOpenToWorkPeople } from '../domain/OpenToWorkPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

export const findOpenToWorkPeople = ({ analytics }: TrackerPorts) => ({
  findOpenToWorkPeople: (): { people: OpenToWorkPerson[] } => ({ people: listOpenToWorkPeople(analytics().index) }),
})
