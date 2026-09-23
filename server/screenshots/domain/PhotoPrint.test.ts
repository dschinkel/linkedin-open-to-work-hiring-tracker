import type { AvatarCircle, Pixels } from './FrameDetection.ts'
import { photoDistance, photoPrint, photosDiffer, photosMatch } from './PhotoPrint.ts'

/** A photo drawn at a given size: a coloured background with a darker "head" in the upper middle. */
function photo(size: number, background: number[], head: number[], frame: number[] | null = null): { pixels: Pixels; circle: AvatarCircle } {
  const data = new Uint8Array(size * size * 4)
  const radius = size / 2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fromCentre = Math.hypot(x - radius, y - radius)
      const inHead = Math.hypot(x - radius, y - radius * 0.8) < radius * 0.35
      const colour = frame && fromCentre > radius * 0.86 ? frame : inHead ? head : background
      data.set([...colour, 255], (y * size + x) * 4)
    }
  }
  return { pixels: { data, width: size, height: size }, circle: { centreX: radius, centreY: radius, radius } }
}

const print = ({ pixels, circle }: ReturnType<typeof photo>) => photoPrint(pixels, circle) as string

describe('a photo print', () => {
  it('is the same photo at twice the zoom', () => {
    expect(photosMatch(print(photo(40, [200, 150, 90], [60, 40, 30])), print(photo(80, [200, 150, 90], [60, 40, 30])))).toBe(true)
  })

  it('tells two different photos apart', () => {
    expect(photosMatch(print(photo(80, [200, 150, 90], [60, 40, 30])), print(photo(80, [40, 90, 170], [230, 220, 200])))).toBe(false)
  })

  it('is neither clearly the same nor clearly different when the prints are only somewhat alike', () => {
    const one = print(photo(80, [200, 150, 90], [60, 40, 30]))
    const somewhatAlike = print(photo(80, [200, 150, 90], [120, 120, 120]))

    expect([photosMatch(one, somewhatAlike), photosDiffer(one, somewhatAlike)]).toEqual([false, false])
  })

  it('is the same photo once an #OPENTOWORK frame is put around it', () => {
    const plain = print(photo(80, [200, 150, 90], [60, 40, 30]))
    const framed = print(photo(80, [200, 150, 90], [60, 40, 30], [68, 138, 60]))

    expect(photoDistance(plain, framed)).toBe(0)
  })

  it('is not taken from a photo cut off by the bottom of the screenshot, whose middle is partly missing', () => {
    const whole = photo(80, [200, 150, 90], [60, 40, 30])
    const cutOff = { ...whole.pixels, data: whole.pixels.data.slice(0, 80 * 50 * 4), height: 50 }

    expect(photoPrint(cutOff, whole.circle)).toBeNull()
  })

  it('is not taken from a photo too small to show a face', () => {
    const tiny = photo(6, [200, 150, 90], [60, 40, 30])

    expect(photoPrint(tiny.pixels, tiny.circle)).toBeNull()
  })
})
