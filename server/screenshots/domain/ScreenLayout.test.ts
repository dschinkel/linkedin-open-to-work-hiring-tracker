import { cleanName, findPersonRows, type TextBox } from './ScreenLayout.ts'

function word(text: string, x0: number, y0: number, confidence = 95): TextBox {
  return { text, x0, y0, x1: x0 + text.length * 9, y1: y0 + 18, confidence }
}

const followersList: TextBox[] = [
  word('Followers', 20, 10),
  word('Ada', 100, 60), word('Lovelace', 140, 60), word('Mathematician', 100, 82),
  word('%', 30, 90, 40),
  word('Alan', 100, 160), word('Turing', 145, 160), word('Codebreaker', 100, 182), word('Follow', 600, 170),
]

describe('finding people on a list screenshot', () => {
  it('reads each name with the headline under it', () => {
    expect(findPersonRows(followersList).map((row) => [row.displayName, row.headline])).toEqual([
      ['Ada Lovelace', 'Mathematician'],
      ['Alan Turing', 'Codebreaker'],
    ])
  })

  it('ignores the page title and stray marks outside the name column', () => {
    expect(findPersonRows(followersList).map((row) => row.displayName)).not.toContain('Followers')
  })

  it('finds nobody when there is no column of names', () => {
    expect(findPersonRows([word('Followers', 20, 10)])).toEqual([])
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
