import type { ChartSeries } from './LineTrendChart'

type ChartPoint = Record<string, unknown>

export interface NiceScale {
  domain: [number, number]
  ticks: number[]
}

export interface LatestPoint {
  key: string
  x: string
  y: number
}

export function niceScale(values: number[], targetTicks = 5): NiceScale | null {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = niceStep((max - min || Math.abs(max) || 1) / (targetTicks - 1))
  const low = Math.floor(min / step) * step
  const high = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let tick = low; tick <= high + step / 2; tick += step) ticks.push(Number(tick.toFixed(10)))
  return { domain: [low, high], ticks }
}

export function plottedValues(data: object[], series: ChartSeries[]): number[] {
  return (data as ChartPoint[]).flatMap((point) => series.map((line) => point[line.key]).filter(isFiniteNumber))
}

export function isTrendLine(line: ChartSeries): boolean {
  return (line.role ?? 'trend') === 'trend'
}

export function inDrawOrder(series: ChartSeries[]): ChartSeries[] {
  return [...series].sort((a, b) => Number(isTrendLine(a)) - Number(isTrendLine(b)))
}

export function latestTrendPoints(data: object[], xKey: string, series: ChartSeries[]): LatestPoint[] {
  return series.filter(isTrendLine).flatMap((line) => {
    const point = [...(data as ChartPoint[])].reverse().find((candidate) => isFiniteNumber(candidate[line.key]))
    return point ? [{ key: line.key, x: String(point[xKey]), y: point[line.key] as number }] : []
  })
}

export function mirrorBelowZero(data: object[], series: ChartSeries[]): object[] {
  const flipped = series.filter((bar) => bar.isBelowZero).map((bar) => bar.key)
  if (flipped.length === 0) return data
  return (data as ChartPoint[]).map((point) => {
    const mirrored = { ...point }
    for (const key of flipped) if (typeof mirrored[key] === 'number') mirrored[key] = -(mirrored[key] as number)
    return mirrored
  })
}

export function barCountFormat(isMirrored: boolean): (value: number) => string {
  return isMirrored ? (value) => String(Math.abs(value)) : (value) => (value > 0 ? `+${value}` : String(value))
}

export function barAxisFormat(isMirrored: boolean): (value: number) => string {
  return (value) => String(isMirrored ? Math.abs(value) : value)
}

export function barColorAt(point: object, bar: ChartSeries): string {
  const value = (point as ChartPoint)[bar.key]
  return typeof value === 'number' && value < 0 && bar.negativeColor ? bar.negativeColor : `var(--color-${bar.key})`
}

function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / magnitude
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * magnitude
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
