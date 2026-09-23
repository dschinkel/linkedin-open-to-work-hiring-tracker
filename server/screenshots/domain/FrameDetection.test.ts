import { readFrames, smallestReadablePhotoRadius } from './FrameDetection.ts'

function plainImage(size: number) {
  return { data: new Uint8Array(size * size * 4).fill(255), width: size, height: size }
}

describe('reading frames on small photos', () => {
  it('marks a photo too small to read as uncertain rather than "no frame"', () => {
    const readings = readFrames(plainImage(40), { centreX: 20, centreY: 20, radius: smallestReadablePhotoRadius - 5 })

    expect([readings.openToWork.status, readings.hiring.status]).toEqual(['UNCERTAIN', 'UNCERTAIN'])
  })

  it('reads a large enough photo with no frame as not open and not hiring', () => {
    const readings = readFrames(plainImage(120), { centreX: 60, centreY: 60, radius: 40 })

    expect([readings.openToWork.status, readings.hiring.status]).toEqual(['NOT_OPEN', 'NOT_HIRING'])
  })
})
