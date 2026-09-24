import type { DetectedCard } from './Deduplication.ts'
import { isSamePerson } from './SamePerson.ts'

const photoOf = (red: number, green: number, blue: number) => [red, green, blue].map((value) => value.toString(16).padStart(2, '0').repeat(64)).join('')
const avery = photoOf(200, 150, 90)
const averyAtAnotherZoom = photoOf(205, 145, 95)
const someoneElse = photoOf(40, 90, 170)

function card(displayName: string, overrides: Partial<DetectedCard> = {}): DetectedCard {
  return {
    screenshotFileName: 'shot-1.png',
    displayName,
    headline: 'Staff Engineer at Northwind Traders',
    companyName: null,
    openToWork: { status: 'NOT_OPEN', confidence: 0.97, classificationMethod: 'pixels' },
    hiring: { status: 'NOT_HIRING', confidence: 0.97, classificationMethod: 'pixels' },
    photoPrint: avery,
    ...overrides,
  }
}

const later = (displayName: string, overrides: Partial<DetectedCard> = {}) => card(displayName, { screenshotFileName: 'shot-2.png', ...overrides })
const noPlaceholders = new Set<string>()

describe('telling whether two cards show the same person', () => {
  it('is the same person: same name, same photo', () => {
    expect(isSamePerson(card('Avery Quinlan'), later('Avery Quinlan', { photoPrint: averyAtAnotherZoom }), noPlaceholders)).toBe(true)
  })

  it('is two people who share a name but not a photo', () => {
    expect(isSamePerson(card('Muhammad Hassan'), later('Muhammad Hassan', { photoPrint: someoneElse }), noPlaceholders)).toBe(false)
  })

  it('is two people when both show in one screenshot, whatever their names', () => {
    expect(isSamePerson(card('Avery Quinlan'), card('Avery Quinlan'), noPlaceholders)).toBe(false)
  })

  it('is the same person when OCR misread a letter of the name but the photo matches', () => {
    expect(isSamePerson(card('Matheus Simoes'), later('Matheus Simbes'), noPlaceholders)).toBe(true)
  })

  it('is the same person when OCR read only part of the name but the photo matches', () => {
    expect(isSamePerson(card('Kim'), later('Kim Hojgaard-Hansen'), noPlaceholders)).toBe(true)
  })

  it('is the same person when OCR read an emoji before the name as letters but the photo matches', () => {
    expect(isSamePerson(card('HM Bruno Furtado'), later('Bruno Furtado'), noPlaceholders)).toBe(true)
  })

  it('is two people when one name is part of the other and the photos differ', () => {
    expect(isSamePerson(card('Kim'), later('Kim Lee', { photoPrint: someoneElse }), noPlaceholders)).toBe(false)
  })

  it('is the same person when OCR dropped a space and a full stop from the name', () => {
    expect(isSamePerson(card('Laura T.', { photoPrint: null }), later('LauraT', { photoPrint: null, headline: null }), noPlaceholders)).toBe(true)
  })

  it('is the same person when a short name has a letter more and the photo matches', () => {
    expect(isSamePerson(card('Laura'), later('LauraT'), noPlaceholders)).toBe(true)
  })

  it('is the same person when a short name has a letter more and both show the placeholder photo, but the same long title', () => {
    const title = 'Delivery Leadership focusses on flow, diagnosing challenges to delivering value'

    expect(isSamePerson(card('Laura', { photoPrint: null, headline: title }), later('LauraT', { photoPrint: null, headline: title }), noPlaceholders)).toBe(true)
  })

  it('is two people when short names a letter apart have only the same title to go by', () => {
    expect(isSamePerson(card('Anna', { photoPrint: null, headline: 'Software Engineer' }), later('Anne', { photoPrint: null, headline: 'Software Engineer' }), noPlaceholders)).toBe(false)
  })

  it('is the same person when two letters of a longer name were misread and the title matches', () => {
    expect(isSamePerson(card('Seckin Gelik', { photoPrint: null }), later('Segkin Celik', { photoPrint: null }), noPlaceholders)).toBe(true)
  })

  it('is two people with similar names and different photos', () => {
    expect(isSamePerson(card('Ali Khan'), later('Ali Khen', { photoPrint: someoneElse }), noPlaceholders)).toBe(false)
  })

  it('goes by the title when both show the placeholder photo: same name, different title is two people', () => {
    const placeholders = new Set([avery])

    expect(isSamePerson(card('Sam Lee', { headline: 'Nurse at Mercy General Hospital' }), later('Sam Lee', { headline: 'Rust developer building compilers' }), placeholders)).toBe(false)
  })

  it('goes by the title when both show the placeholder photo: a misread name with the same title is one person', () => {
    const placeholders = new Set([avery])

    expect(isSamePerson(card('Joao Victor Tinoco'), later('Jodo Victor Tinoco'), placeholders)).toBe(true)
  })

  it('keeps one person when a title was cut off in one screenshot', () => {
    expect(isSamePerson(card('Avery Quinlan', { photoPrint: null }), later('Avery Quinlan', { photoPrint: null, headline: 'Staff Engineer at' }), noPlaceholders)).toBe(true)
  })

  it('keeps one person when a title could not be read in one screenshot', () => {
    expect(isSamePerson(card('Avery Quinlan', { photoPrint: null }), later('Avery Quinlan', { photoPrint: null, headline: null }), noPlaceholders)).toBe(true)
  })
})
