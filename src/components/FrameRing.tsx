import { cn } from '@/lib/utils'
import { captionArc, frameRingCells, ringSize, type Signal } from './frameRingCells'

interface FrameRingProps {
  signal: Signal
  /** The rate exactly as the tile displays it, e.g. "9.6%"; the ring fills to match. */
  value: string
  frameText: string
  className?: string
}

const signalColor: Record<Signal, string> = { 'open-to-work': 'var(--open-to-work)', hiring: 'var(--hiring)' }

/** A ring gauge drawn like the LinkedIn photo frame it counts, with the frame's caption along the bottom. */
export function FrameRing({ signal, value, frameText, className }: FrameRingProps) {
  const color = signalColor[signal]
  const captionId = `frame-text-${signal}`

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: ringSize, height: ringSize }}>
      <svg viewBox={`0 0 ${ringSize} ${ringSize}`} width={ringSize} height={ringSize} aria-hidden>
        <defs>
          <path id={captionId} d={captionArc} />
        </defs>
        {frameRingCells(value).map((cell, index) => (
          <text
            key={index}
            x={cell.x}
            y={cell.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={cell.isLit ? 12 : 18}
            fill={cell.isLit ? color : 'var(--muted-foreground)'}
            fillOpacity={cell.isLit ? 1 : 0.8}
            transform={`rotate(${cell.rotation} ${cell.x} ${cell.y})`}
            className={cell.isLit ? 'animate-cell-on motion-reduce:animate-none' : undefined}
            style={cell.isLit ? { animationDelay: `${cell.delayMs}ms` } : undefined}
          >
            {cell.glyph}
          </text>
        ))}
        <text fill={color} fontSize={13} fontWeight={700} letterSpacing="0.12em">
          <textPath href={`#${captionId}`} startOffset="50%" textAnchor="middle">
            {frameText}
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="figure text-figure-lg text-primary">{value}</span>
        <span className="mt-2 text-2xs text-muted-foreground">of network</span>
      </div>
    </div>
  )
}
