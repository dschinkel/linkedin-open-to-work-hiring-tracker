import { parseScanDate } from './ScanDate.ts'

const fileTimestamp = new Date('2026-01-05T12:00:00Z')

describe('scan date', () => {
  it('comes from a macOS screenshot name', () => {
    expect(parseScanDate('Screenshot 2026-09-22 at 9.01.12 AM.png', fileTimestamp)).toBe('2026-09-22')
  })

  it('comes from a GoFullPage capture name', () => {
    expect(parseScanDate('screencapture-linkedin-com-mynetwork-2026-09-21-09_01_12.png', fileTimestamp)).toBe('2026-09-21')
  })

  it('falls back to the file timestamp when the name has no date', () => {
    expect(parseScanDate('connections.png', fileTimestamp)).toBe('2026-01-05')
  })

  it('files an undated screenshot under the local day, not the UTC day', () => {
    const lateEveningLocally = new Date(2026, 8, 23, 23, 30)

    expect(parseScanDate('followers - page 1.png', lateEveningLocally)).toBe('2026-09-23')
  })
})
