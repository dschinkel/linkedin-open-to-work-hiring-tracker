import { type PhotoPrint, photosDiffer, photosMatch } from './PhotoPrint.ts'
import { titleEvidence } from './SamePerson.ts'

export interface SeenPerson {
  displayName: string
  headline: string | null
  photoPrint?: PhotoPrint | null
}

export function matchNamesakes<Namesake extends SeenPerson>(people: SeenPerson[], namesakes: Namesake[]): Map<number, Namesake> {
  if (people.length === 1 && namesakes.length === 1) return clearlySomeoneElse(people[0], namesakes[0]) ? new Map() : new Map([[0, namesakes[0]]])
  const claimed = new Map<number, Namesake>()
  for (const recognises of [samePhoto, sameTitleWithoutAPhoto]) {
    people.forEach((person, index) => {
      if (claimed.has(index)) return
      const match = namesakes.find((namesake) => ![...claimed.values()].includes(namesake) && recognises(person, namesake))
      if (match) claimed.set(index, match)
    })
  }
  return claimed
}

function clearlySomeoneElse(person: SeenPerson, namesake: SeenPerson): boolean {
  const titles = titleEvidence(person.headline, namesake.headline)
  if (!person.photoPrint || !namesake.photoPrint) return titles === 'different'
  return photosDiffer(person.photoPrint, namesake.photoPrint) && titles !== 'same'
}

function samePhoto(person: SeenPerson, namesake: SeenPerson): boolean {
  return Boolean(person.photoPrint && namesake.photoPrint) && photosMatch(person.photoPrint as PhotoPrint, namesake.photoPrint as PhotoPrint)
}

function sameTitleWithoutAPhoto(person: SeenPerson, namesake: SeenPerson): boolean {
  return (!person.photoPrint || !namesake.photoPrint) && titleEvidence(person.headline, namesake.headline) !== 'different'
}
