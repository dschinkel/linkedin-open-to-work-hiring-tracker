import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FrameRing } from './FrameRing'
import type { Signal } from './frameRingArc'
import { type DeltaTone, snapshotLayout } from './signalSnapshotLayout'
import type { StatTileView } from './StatTile'

interface SignalSnapshotProps {
  signal: Signal
  title: string
  description: string
  frameText: string
  tiles: StatTileView[]
}

const titleColor: Record<Signal, string> = { 'open-to-work': 'bg-open-to-work text-background', hiring: 'bg-hiring text-background' }
const toneColor: Record<DeltaTone, string> = { up: 'text-open-to-work', down: 'text-removed', flat: 'text-primary' }

/** The same tiles as a stat grid, laid out as a ring with key facts beside it and movement since the last scan below. */
export function SignalSnapshot({ signal, title, description, frameText, tiles }: SignalSnapshotProps) {
  const { headline, keyFacts, movement } = snapshotLayout(tiles)
  if (!headline) return null

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-title font-bold">
          <span className={cn('panel-tag', titleColor[signal])}>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-x-8 gap-y-6 sm:grid-cols-[auto_1fr] sm:items-center">
        <FrameRing signal={signal} value={headline.value} frameText={frameText} className="justify-self-center" />
        <div>
          <p className="sr-only">
            {headline.label}: {headline.value}
          </p>
          <div className="grid gap-y-5">
            {keyFacts.map((fact) => (
              <KeyFact key={fact.label} {...fact} />
            ))}
          </div>
          {headline.hint && <p className="mt-3 text-xs text-muted-foreground">{headline.hint}</p>}
        </div>
      </CardContent>
      {movement.length > 0 && (
        <CardFooter className="mt-auto flex-col items-stretch">
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            {movement.map((stat) => (
              <div key={stat.label}>
                <div className={cn('figure text-2xl', toneColor[stat.tone])}>{stat.value}</div>
                <div className="text-sm">{stat.label}</div>
                {stat.hint && <p className="text-xs text-muted-foreground">{stat.hint}</p>}
              </div>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}

/** A big figure with its name beneath; links to the list behind the number when it has one. */
function KeyFact({ label, value, hint, href }: StatTileView) {
  const body = (
    <>
      <div className="flex items-center gap-1">
        <span className="figure text-figure text-primary">{value}</span>
        {href && <ChevronRight className="size-5 text-prompt" />}
      </div>
      <div className={cn('mt-1 text-label whitespace-nowrap', href && 'underline decoration-dotted underline-offset-4 group-hover:text-prompt')}>{label}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </>
  )
  if (!href) return <div>{body}</div>
  return (
    <Link to={href} className="group -m-1 block p-1 hover:bg-accent">
      {body}
    </Link>
  )
}
