import type { HiringPeopleQuery, HiringPerson } from '../../../contracts/api.ts'
import { filterHiringPeople } from '../domain/HiringPeople.ts'
import type { TrackerPorts } from '../domain/TrackerAnalytics.ts'

/** Everyone seen with the #HIRING frame, filtered and sorted. */
export const findHiringPeople = ({ analytics }: TrackerPorts) => ({
  findHiringPeople: (query: HiringPeopleQuery): { people: HiringPerson[] } => ({ people: filterHiringPeople(analytics().hiringPeople, query) }),
})
