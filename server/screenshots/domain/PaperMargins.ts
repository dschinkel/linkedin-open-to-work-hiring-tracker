import type { Pixels } from './FrameDetection.ts'

const paperTolerance = 4

export function screenshotOnThePage(pixels: Pixels): { top: number; height: number } {
  let top = 0
  while (top < pixels.height && isBlank(pixels, top)) top += 1
  if (top === pixels.height) return { top: 0, height: pixels.height }
  let bottom = pixels.height
  while (bottom > top && isBlank(pixels, bottom - 1)) bottom -= 1
  return { top, height: bottom - top }
}

function isBlank({ data, width }: Pixels, row: number): boolean {
  const start = row * width * 4
  for (let offset = start + 4; offset < start + width * 4; offset += 4) {
    for (let channel = 0; channel < 4; channel += 1) if (Math.abs(data[offset + channel] - data[start + channel]) > paperTolerance) return false
  }
  return true
}
