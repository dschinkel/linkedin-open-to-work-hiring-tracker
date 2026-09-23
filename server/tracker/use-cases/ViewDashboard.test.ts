import { scanReminder } from './ViewDashboard.ts'

describe('scan reminders', () => {
  it('reminds you once a weekly scan is due', () => {
    expect(scanReminder('2026-09-13', 'weekly', '2026-09-22')).toBe('Your weekly scan is due: the last one was 9 days ago.')
  })

  it('stays quiet while the last scan is recent enough', () => {
    expect(scanReminder('2026-09-20', 'weekly', '2026-09-22')).toBeNull()
  })

  it('stays quiet before the first scan', () => {
    expect(scanReminder(null, 'daily', '2026-09-22')).toBeNull()
  })

  it('reminds a daily scanner the next day', () => {
    expect(scanReminder('2026-09-21', 'daily', '2026-09-22')).toBe('Your daily scan is due: the last one was yesterday.')
  })
})
