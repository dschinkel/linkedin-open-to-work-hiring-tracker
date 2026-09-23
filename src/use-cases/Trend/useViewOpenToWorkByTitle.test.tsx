// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import type { TitleTrends } from '@contracts/api'
import { insideTracker } from '@/test-support/trackerFixtures'
import type { TrendRepository } from './TrendRepository'
import { useViewOpenToWorkByTitle } from './useViewOpenToWorkByTitle'

const engineersAndRecruiters: TitleTrends = {
  periods: ['Aug 2026', 'Sep 2026'],
  rows: [
    { title: 'Software Engineer', cells: [{ rate: 10, open: 5, classified: 50 }, { rate: 14, open: 7, classified: 50 }], changePp: 4 },
    { title: 'Recruiter / Talent', cells: [{ rate: null, open: 0, classified: 0 }, { rate: 20, open: 2, classified: 10 }], changePp: null },
  ],
  peopleWithTitle: 60,
  peopleTotal: 80,
}

function repositoryReturning(titleTrends: TitleTrends): TrendRepository {
  return { trends: async () => Promise.reject(new Error('not used here')), titleTrends: async () => titleTrends }
}

async function readyView(titleTrends: TitleTrends) {
  const { result } = renderHook(() => useViewOpenToWorkByTitle('90d', repositoryReturning(titleTrends)), { wrapper: insideTracker() })
  await waitFor(() => expect(result.current.status).toBe('ready'))
  return result.current
}

describe('Open to Work by job title', () => {
  it('says how many people the grid covers, since some have no readable title', async () => {
    expect((await readyView(engineersAndRecruiters)).coverageNote).toContain('60 of 80 people')
  })

  it('has one column per period plus the change', async () => {
    expect((await readyView(engineersAndRecruiters)).columns.map((column) => column.label)).toEqual(['Job title', 'Aug 2026', 'Sep 2026', 'Change'])
  })

  it('shows the rate with how many of how many were open', async () => {
    expect((await readyView(engineersAndRecruiters)).rows[0].cells['period-1'].text).toBe('14.0% · 7/50')
  })

  it('leaves a period blank when nobody with that title was seen', async () => {
    expect((await readyView(engineersAndRecruiters)).rows[1].cells['period-0'].text).toBe('—')
  })

  it('shows the change in percentage points', async () => {
    expect((await readyView(engineersAndRecruiters)).rows[0].cells.change.text).toBe('+4.0pp')
  })
})
