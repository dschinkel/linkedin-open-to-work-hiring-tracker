import { personHash, resolvePersonHashes } from './Identity.ts'

describe('person identity', () => {
  it('is the same across days despite case and spacing differences', () => {
    const monday = personHash({ displayName: 'John Smith', headline: 'Staff Engineer', companyName: 'Acme' })
    const tuesday = personHash({ displayName: 'JOHN  SMITH ', headline: 'staff engineer', companyName: 'acme' })

    expect(tuesday).toBe(monday)
  })

  it('differs for different visible people', () => {
    const john = personHash({ displayName: 'John Smith', headline: 'Staff Engineer', companyName: 'Acme' })
    const sarah = personHash({ displayName: 'Sarah Jones', headline: 'UX Designer', companyName: 'Acme' })

    expect(sarah).not.toBe(john)
  })

  it('stays the same when the person changes their headline', () => {
    const before = personHash({ displayName: 'John Smith', headline: 'Staff Engineer', companyName: 'Acme' })
    const after = personHash({ displayName: 'John Smith', headline: 'Open to new roles', companyName: null })

    expect(after).toBe(before)
  })
})

const photoOf = (red: number, green: number, blue: number) => [red, green, blue].map((value) => value.toString(16).padStart(2, '0').repeat(64)).join('')
const first = photoOf(200, 150, 90)
const second = photoOf(40, 90, 170)
const seen = (displayName: string, photoPrint: string | null, headline: string | null = 'Software Engineer at Initech') => ({ displayName, headline, photoPrint })
const hashOf = (displayName: string) => personHash({ displayName, headline: null, companyName: null })

describe('telling apart people who share a name, from day to day', () => {
  it('keeps the usual identity for someone whose name nobody else has', () => {
    expect(resolvePersonHashes([seen('John Smith', first)], [])).toEqual([hashOf('John Smith')])
  })

  it('gives two people with one name two identities', () => {
    const [one, other] = resolvePersonHashes([seen('Muhammad Hassan', first), seen('Muhammad Hassan', second)], [])

    expect(one).toBe(hashOf('Muhammad Hassan'))
    expect(other).not.toBe(one)
  })

  it('finds each of them again on a later day by their photo, in whatever order they come', () => {
    const monday = [seen('Muhammad Hassan', first), seen('Muhammad Hassan', second)]
    const known = resolvePersonHashes(monday, []).map((personHash, index) => ({ personHash, ...monday[index] }))

    const tuesday = resolvePersonHashes([seen('Muhammad Hassan', second), seen('Muhammad Hassan', first)], known)

    expect(tuesday).toEqual([known[1].personHash, known[0].personHash])
  })

  it('finds the second one again when only they show up on a later day', () => {
    const monday = [seen('Muhammad Hassan', first), seen('Muhammad Hassan', second)]
    const known = resolvePersonHashes(monday, []).map((personHash, index) => ({ personHash, ...monday[index] }))

    expect(resolvePersonHashes([seen('Muhammad Hassan', second)], known)).toEqual([known[1].personHash])
  })

  it('gives a newcomer with a known name and a different photo and title an identity of their own', () => {
    const known = [{ personHash: hashOf('Sam Lee'), ...seen('Sam Lee', first, 'Nurse at Mercy General Hospital') }]

    const [newcomer] = resolvePersonHashes([seen('Sam Lee', second, 'Rust developer building compilers')], known)

    expect(newcomer).not.toBe(hashOf('Sam Lee'))
  })

  it('keeps one person who changed their photo', () => {
    const known = [{ personHash: hashOf('Sam Lee'), ...seen('Sam Lee', first) }]

    expect(resolvePersonHashes([seen('Sam Lee', second)], known)).toEqual([hashOf('Sam Lee')])
  })

  it('keeps people saved before photos were remembered', () => {
    const known = [{ personHash: hashOf('Sam Lee'), ...seen('Sam Lee', null) }]

    expect(resolvePersonHashes([seen('Sam Lee', first)], known)).toEqual([hashOf('Sam Lee')])
  })
})
