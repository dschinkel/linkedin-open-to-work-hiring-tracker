import { personHash } from './Identity.ts'

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
