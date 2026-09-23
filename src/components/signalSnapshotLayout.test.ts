import { snapshotLayout } from './signalSnapshotLayout'

const tile = (label: string, value: string) => ({ label, value })

describe('signal snapshot layout', () => {
  it('puts the rate in the ring, the next two facts beside it and the rest below', () => {
    const layout = snapshotLayout([tile('Rate', '9.6%'), tile('Open', '61'), tile('Change', '-0.8pp'), tile('Newly open', '+1')])

    expect([layout.headline?.label, layout.keyFacts.map((fact) => fact.label), layout.movement.map((stat) => stat.label)]).toEqual(['Rate', ['Open', 'Change'], ['Newly open']])
  })

  it('reads movement like a diff: plus is up, minus is down, zero is flat', () => {
    const layout = snapshotLayout([tile('Rate', '1%'), tile('a', '1'), tile('b', '2'), tile('Newly', '+1'), tile('Removed', '-2'), tile('Net', '0')])

    expect(layout.movement.map((stat) => stat.tone)).toEqual(['up', 'down', 'flat'])
  })
})
