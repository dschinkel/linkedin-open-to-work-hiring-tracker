import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { captionArc, frameRingArc, type RingArc, ringCenter, ringRadius, ringSize, ringStartAngle, ringStroke, type Signal } from './frameRingArc'

interface FrameRingProps {
  signal: Signal
  value: string
  frameText: string
  className?: string
}

const signalColor: Record<Signal, string> = { 'open-to-work': 'var(--open-to-work)', hiring: 'var(--hiring)' }

export function FrameRing({ signal, value, frameText, className }: FrameRingProps) {
  const color = signalColor[signal]
  const captionId = `frame-text-${signal}`
  const arc = frameRingArc(value)

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: ringSize, height: ringSize }}>
      <svg viewBox={`0 0 ${ringSize} ${ringSize}`} width={ringSize} height={ringSize} aria-hidden>
        <defs>
          <path id={captionId} d={captionArc} />
        </defs>
        <circle cx={ringCenter} cy={ringCenter} r={ringRadius} fill="none" stroke="var(--muted)" strokeWidth={ringStroke} />
        {arc.length > 0 && <FrameArc arc={arc} color={color} />}
        <text fill={color} fontSize={13} fontWeight={700} letterSpacing="0.12em">
          <textPath href={`#${captionId}`} startOffset="50%" textAnchor="middle">
            {frameText}
          </textPath>
        </text>
      </svg>
      <RateOfNetwork value={value} />
    </div>
  )
}

function FrameArc({ arc, color }: { arc: RingArc; color: string }) {
  return (
    <circle
      cx={ringCenter}
      cy={ringCenter}
      r={ringRadius}
      fill="none"
      stroke={color}
      strokeWidth={ringStroke}
      strokeLinecap="round"
      strokeDasharray={`${arc.length} ${arc.circumference}`}
      transform={`rotate(${ringStartAngle} ${ringCenter} ${ringCenter})`}
      className="animate-ring-draw motion-reduce:animate-none"
      style={{ '--arc': `${arc.length}px` } as CSSProperties}
    />
  )
}

function RateOfNetwork({ value }: { value: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
      <span className="figure text-figure-lg text-primary">{value}</span>
      <span className="mt-2 text-2xs text-muted-foreground">of network</span>
    </div>
  )
}
