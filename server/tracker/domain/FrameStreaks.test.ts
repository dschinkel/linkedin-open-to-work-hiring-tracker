import type { SignalStatus } from '../../shared/domain/Observation.ts'
import { latestFrameStreak } from './FrameStreaks.ts'

function sighting(scanDate: string, status: SignalStatus) {
  return { scanDate, status }
}

describe('how long a frame has been showing', () => {
  it('counts a frame seen in one scan as one day and one scan', () => {
    expect(latestFrameStreak([sighting('2026-09-22', 'POSITIVE')])).toEqual({ since: '2026-09-22', lastSeen: '2026-09-22', days: 1, scansSeen: 1, isOngoing: true })
  })

  it('grows with every scan that still shows the frame', () => {
    const sightings = [sighting('2026-09-20', 'POSITIVE'), sighting('2026-09-21', 'POSITIVE'), sighting('2026-09-22', 'POSITIVE')]
    expect(latestFrameStreak(sightings)).toMatchObject({ since: '2026-09-20', lastSeen: '2026-09-22', days: 3, scansSeen: 3 })
  })

  it('keeps running across a scan the person was missing from', () => {
    const sightings = [sighting('2026-09-10', 'POSITIVE'), sighting('2026-09-22', 'POSITIVE')]
    expect(latestFrameStreak(sightings)).toMatchObject({ since: '2026-09-10', days: 13, scansSeen: 2 })
  })

  it('keeps running across an unclear photo without counting it as a scan that saw the frame', () => {
    const sightings = [sighting('2026-09-20', 'POSITIVE'), sighting('2026-09-21', 'UNCERTAIN'), sighting('2026-09-22', 'POSITIVE')]
    expect(latestFrameStreak(sightings)).toMatchObject({ since: '2026-09-20', days: 3, scansSeen: 2 })
  })

  it('starts over when the frame comes back after being removed', () => {
    const sightings = [sighting('2026-09-01', 'POSITIVE'), sighting('2026-09-10', 'NEGATIVE'), sighting('2026-09-20', 'POSITIVE'), sighting('2026-09-22', 'POSITIVE')]
    expect(latestFrameStreak(sightings)).toMatchObject({ since: '2026-09-20', days: 3, scansSeen: 2, isOngoing: true })
  })

  it('ends when the frame is clearly gone', () => {
    const sightings = [sighting('2026-09-20', 'POSITIVE'), sighting('2026-09-21', 'POSITIVE'), sighting('2026-09-22', 'NEGATIVE')]
    expect(latestFrameStreak(sightings)).toMatchObject({ since: '2026-09-20', lastSeen: '2026-09-21', days: 2, isOngoing: false })
  })

  it('has no streak for someone never seen with the frame', () => {
    expect(latestFrameStreak([sighting('2026-09-22', 'NEGATIVE'), sighting('2026-09-23', 'UNCERTAIN')])).toBeNull()
  })
})
