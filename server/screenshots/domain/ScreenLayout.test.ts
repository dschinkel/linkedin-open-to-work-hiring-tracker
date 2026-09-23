import { cleanName, readNameStrip, type TextBox } from './ScreenLayout.ts'

function word(text: string, x0: number, y0: number, confidence = 95): TextBox {
  return { text, x0, y0, x1: x0 + text.length * 9, y1: y0 + 18, confidence }
}

const pitch = 100
const nameStrip: TextBox[] = [
  word('Ada', 100, 60), word('Lovelace', 140, 60), word('Mathematician', 100, 82), word('Follow', 600, 70),
  word('Alan', 100, 160), word('Turing', 145, 160), word('Codebreaker', 100, 182),
  word('Grace', 100, 260), word('Hopper', 150, 260),
]

describe('reading names beside the photo column', () => {
  it('makes every name a person, with the title under it', () => {
    expect(readNameStrip(nameStrip, pitch).map((person) => [person.displayName, person.headline])).toEqual([
      ['Ada Lovelace', 'Mathematician'],
      ['Alan Turing', 'Codebreaker'],
      ['Grace Hopper', null],
    ])
  })

  it('ignores text beside the list, like the page sidebar, even where it sits between two people', () => {
    const sidebar = [word('About', 900, 40), word('Privacy', 900, 120), word('Help', 900, 200), word('Center', 950, 200)]

    expect(readNameStrip([...nameStrip, ...sidebar], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('ignores header text that starts a little right of the names', () => {
    const searchBox = [word("I'm", 115, 20), word('looking', 150, 20)]

    expect(readNameStrip([...searchBox, ...nameStrip], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('keeps a name that starts a little right because of an emoji before it', () => {
    const emojiName = [word('Adrian', 120, 360), word('Kodja', 180, 360), word('Mentor', 100, 382)]

    expect(readNameStrip([...nameStrip, ...emojiName], pitch).map((person) => [person.displayName, person.headline])).toContainEqual(['Adrian Kodja', 'Mentor'])
  })

  it('skips the heading of the list', () => {
    const heading = [word("Dave's", 100, -80), word('Network', 160, -80), word('1,452', 100, -40), word('people', 150, -40), word('are', 210, -40), word('following', 240, -40), word('you', 330, -40)]

    expect(readNameStrip([...heading, ...nameStrip], pitch).map((person) => person.displayName)).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'])
  })

  it('keeps initials in names', () => {
    expect(readNameStrip([word('Azad', 100, 60), word('A.', 145, 60)], pitch).map((person) => person.displayName)).toEqual(['Azad A.'])
  })

  it('never mistakes the Follow button for a name', () => {
    expect(readNameStrip([word('Follow', 600, 70)], pitch)).toEqual([])
  })

  it('skips text it could barely read', () => {
    expect(readNameStrip([word('Xq', 100, 60, 20)], pitch)).toEqual([])
  })
})

describe('cleaning names', () => {
  it('drops the connection degree', () => {
    expect(cleanName('Jane Smith · 2nd')).toBe('Jane Smith')
  })

  it('drops pronouns', () => {
    expect(cleanName('Jane Smith (She/Her)')).toBe('Jane Smith')
  })
})
