import { titleFamily } from './JobTitles.ts'

describe('job families from headlines', () => {
  it('groups a software engineer headline with its extras stripped', () => {
    expect(titleFamily('Senior Software Engineer | AI | Cloud')).toBe('Software Engineer')
  })

  it('reads only the title before "at Company"', () => {
    expect(titleFamily('Technical Recruiter at Acme Software')).toBe('Recruiter / Talent')
  })

  it('tells engineering managers apart from engineers', () => {
    expect(titleFamily('Engineering Manager')).toBe('Engineering Manager')
  })

  it('has no family for a headline that names no job', () => {
    expect(titleFamily('Building the future of payments')).toBeNull()
  })

  it('has no family when there is no headline', () => {
    expect(titleFamily(null)).toBeNull()
  })
})
