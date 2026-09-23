import { completedEpisodeDurations, median } from './Durations.ts'

describe('observed open-to-work duration', () => {
  it('runs from the first observed open to the first observed removal', () => {
    const sightings = [
      { scanDate: '2026-07-14', status: 'NEGATIVE' as const },
      { scanDate: '2026-07-15', status: 'POSITIVE' as const },
      { scanDate: '2026-08-26', status: 'POSITIVE' as const },
      { scanDate: '2026-08-27', status: 'NEGATIVE' as const },
    ]

    expect(completedEpisodeDurations(sightings)).toEqual([43])
  })

  it('leaves out an episode whose start was never observed', () => {
    const sightings = [
      { scanDate: '2026-07-15', status: 'POSITIVE' as const },
      { scanDate: '2026-08-27', status: 'NEGATIVE' as const },
    ]

    expect(completedEpisodeDurations(sightings)).toEqual([])
  })

  it('uses the middle value as the median', () => {
    expect(median([10, 40, 70])).toBe(40)
  })
})
