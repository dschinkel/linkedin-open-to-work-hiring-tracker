import { FlaskConical } from 'lucide-react'

/** A loud strip across the very top of every demo page, so nobody mistakes the sample data for their own. */
export function DemoBanner({ sampleDescription }: { sampleDescription: string }) {
  return (
    <div role="note" aria-label="Demo mode" className="animate-demo-pulse bg-warning text-background motion-reduce:animate-none">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
        <strong className="inline-flex items-center gap-2 text-xl font-bold tracking-figure uppercase sm:text-2xl">
          <FlaskConical className="size-6" />
          Demo mode
        </strong>
        <p className="text-sm font-semibold">
          Sample data, not yours. {sampleDescription} Nothing here comes from LinkedIn. Switch between Followers and Contacts, and play
          with the filters, time windows, and chart zoom.
        </p>
      </div>
    </div>
  )
}
