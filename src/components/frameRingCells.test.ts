import { frameRingCells } from './frameRingCells'

const litCount = (shownRate: string) => frameRingCells(shownRate).filter((cell) => cell.isLit).length

describe('frame ring', () => {
  it('lights one cell for every 2% of the network', () => {
    expect(litCount('9.6%')).toBe(5)
  })

  it('lights at least one cell for any rate above zero', () => {
    expect(litCount('0.2%')).toBe(1)
  })

  it('stays empty when the tile shows no rate', () => {
    expect(litCount('—')).toBe(0)
  })
})
