import { frameRingArc } from './frameRingArc'

const shareOfRing = (shownRate: string) => {
  const arc = frameRingArc(shownRate)
  return arc.length / arc.circumference
}

describe('frame ring', () => {
  it('fills the ring by the share of the network wearing the frame', () => {
    expect(shareOfRing('9.6%')).toBeCloseTo(0.096)
  })

  it('shows a short arc for any rate above zero', () => {
    expect(frameRingArc('0.1%').length).toBeGreaterThan(0)
  })

  it('stays empty when the tile shows no rate', () => {
    expect(frameRingArc('—').length).toBe(0)
  })
})
