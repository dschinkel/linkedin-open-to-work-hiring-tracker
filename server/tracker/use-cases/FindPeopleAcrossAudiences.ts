import type { AllDashboard, CompanyHiring, HiringPeopleQuery, HiringPerson, NetworkSize, OpenToWorkPerson } from '../../../contracts/api.ts'
import { countPeopleAcrossAudiences, mergeHiringPeople, mergeOpenToWorkPeople, type PeopleAcrossAudiences, pairAcrossAudiences } from '../domain/AcrossAudiences.ts'
import { aggregateHiringCompanies, filterHiringPeople, whoIsHiringAmong } from '../domain/HiringPeople.ts'
import { summarizeLatestScansAcrossAudiences } from '../domain/LatestScansAcrossAudiences.ts'
import type { NetworkIndex } from '../domain/NetworkIndex.ts'
import { recentPeopleIds } from '../domain/NetworkSize.ts'
import { listOpenToWorkPeople } from '../domain/OpenToWorkPeople.ts'
import type { Analytics } from '../domain/TrackerAnalytics.ts'

export interface AcrossAudiencesPorts {
  followers: () => Analytics
  contacts: () => Analytics
}

export const findPeopleAcrossAudiences = ({ followers, contacts }: AcrossAudiencesPorts) => {
  const pairsOf = rememberLatestPairs()
  const bothAudiences = () => {
    const [followersNow, contactsNow] = [followers(), contacts()]
    return { followers: followersNow, contacts: contactsNow, pairs: pairsOf(followersNow.index, contactsNow.index) }
  }
  const allHiringPeople = (): HiringPerson[] => {
    const both = bothAudiences()
    return mergeHiringPeople(both.pairs, both.followers.hiringPeople, both.contacts.hiringPeople)
  }

  return {
    findOpenToWorkPeople: (): { people: OpenToWorkPerson[] } => {
      const both = bothAudiences()
      return { people: mergeOpenToWorkPeople(both.pairs, listOpenToWorkPeople(both.followers.index), listOpenToWorkPeople(both.contacts.index)) }
    },
    allHiringPeople,
    findHiringPeople: (query: HiringPeopleQuery): { people: HiringPerson[] } => ({ people: filterHiringPeople(allHiringPeople(), query) }),
    listHiringCompanies: (): CompanyHiring => aggregateHiringCompanies(allHiringPeople()),
    viewDashboard: (): AllDashboard => {
      const both = bothAudiences()
      return {
        ...summarizeLatestScansAcrossAudiences(both.pairs, both.followers.index, both.contacts.index),
        whoIsHiring: whoIsHiringAmong(mergeHiringPeople(both.pairs, both.followers.hiringPeople, both.contacts.hiringPeople)),
      }
    },
    measureNetworkSize: (): NetworkSize => {
      const both = bothAudiences()
      return {
        peopleCount: countPeopleAcrossAudiences(both.pairs, recentPeopleIds(both.followers.index), recentPeopleIds(both.contacts.index)),
        latestScanDate: latestScanDateOf(both.followers.index, both.contacts.index),
      }
    },
  }
}

function rememberLatestPairs(): (followers: NetworkIndex, contacts: NetworkIndex) => PeopleAcrossAudiences {
  let remembered: { followers: NetworkIndex; contacts: NetworkIndex; pairs: PeopleAcrossAudiences } | null = null
  return (followers, contacts) => {
    if (remembered?.followers !== followers || remembered.contacts !== contacts) remembered = { followers, contacts, pairs: pairAcrossAudiences(followers.people, contacts.people) }
    return remembered.pairs
  }
}

function latestScanDateOf(...indexes: NetworkIndex[]): string | null {
  const dates = indexes.map((index) => index.scansInOrder.at(-1)?.scanDate).filter((date): date is string => date !== undefined)
  return dates.sort().at(-1) ?? null
}
