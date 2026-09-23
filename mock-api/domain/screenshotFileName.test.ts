import { acceptedScreenshotName } from './screenshotFileName.ts'

describe('dropped screenshot names', () => {
  it('accepts a GoFullPage capture', () => {
    expect(acceptedScreenshotName('screencapture-linkedin-com-mynetwork-2026-09-22-09_01_12.png')).toBe('screencapture-linkedin-com-mynetwork-2026-09-22-09_01_12.png')
  })

  it('accepts a macOS screenshot with spaces', () => {
    expect(acceptedScreenshotName('Screenshot 2026-09-22 at 9.01.12 AM.PNG')).toBe('Screenshot 2026-09-22 at 9.01.12 AM.PNG')
  })

  it('refuses files that are not images', () => {
    expect(acceptedScreenshotName('notes.txt')).toBeNull()
  })

  it('refuses names that try to leave the inbox folder', () => {
    expect(acceptedScreenshotName('../../etc/evil.png')).toBeNull()
  })

  it('refuses hidden files', () => {
    expect(acceptedScreenshotName('.sneaky.png')).toBeNull()
  })
})
