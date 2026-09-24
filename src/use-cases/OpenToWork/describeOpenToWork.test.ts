import type { StatTileView } from '@/components/StatTile'
import { openToWorkSummary } from '@/test-support/trackerFixtures'
import { describeOpenToWorkTiles } from './describeOpenToWork'

function tileLabelled(tiles: StatTileView[], label: string): StatTileView | undefined {
  return tiles.find((tile) => tile.label === label)
}

describe('open-to-work tiles', () => {
  it('shows the open rate as a percentage', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ rate: 12.46 }))

    expect(tileLabelled(tiles, 'Open rate')?.value).toBe('12.5%')
  })

  it('mentions how many uncertain people the open rate leaves out', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ uncertain: 4 }))

    expect(tileLabelled(tiles, 'Open rate')?.hint).toContain('4')
  })

  it('says nothing about uncertain people when every card was classified', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ uncertain: 0 }))

    expect(tileLabelled(tiles, 'Open rate')?.hint).toBeUndefined()
  })

  it('counts open people out of everyone classified', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ open: 118, notOpen: 1_082 }))

    expect(tileLabelled(tiles, 'Open to Work')?.hint).toContain('1,200')
  })

  it('shows people who removed the frame as a negative count', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ removed: 7 }))

    expect(tileLabelled(tiles, 'Removed open')?.value).toBe('-7')
  })

  it('shows the net flow with its sign', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ net: 5 }))

    expect(tileLabelled(tiles, 'Net flow')?.value).toBe('+5')
  })

  it('shows the 7-day change in percentage points', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ sevenDayChangePp: 1.2 }))

    expect(tileLabelled(tiles, '7-day change')?.value).toBe('+1.2pp')
  })

  it('explains a 7-day change that needs more scans', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ sevenDayChangePp: null }))

    expect(tileLabelled(tiles, '7-day change')?.hint).toBeDefined()
  })

  it('warns that flows have nothing to compare against on the first comparable scan', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ hasComparablePrior: false }))

    expect(tileLabelled(tiles, 'Newly open')?.hint).toBeDefined()
  })

  it('shows flows as not available and says so once, before there is a scan to compare against', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ hasComparablePrior: false, added: 3, removed: 2 }))

    expect([tileLabelled(tiles, 'Newly open')?.value, tileLabelled(tiles, 'Removed open')?.value, tileLabelled(tiles, 'Removed open')?.hint]).toEqual(['—', '—', undefined])
  })

  it('shows flows without a warning once a prior scan exists', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ hasComparablePrior: true }))

    expect(tileLabelled(tiles, 'Newly open')?.hint).toBeUndefined()
  })

  it('shows the entry / exit ratio with two decimals', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ entryExitRatio: 1.714 }))

    expect(tileLabelled(tiles, 'Entry / exit')?.value).toBe('1.71')
  })

  it('explains an entry / exit ratio when nobody removed the frame', () => {
    const tiles = describeOpenToWorkTiles(openToWorkSummary({ removed: 0, entryExitRatio: null }))

    expect(tileLabelled(tiles, 'Entry / exit')).toMatchObject({ value: '—', hint: expect.any(String) })
  })
})
