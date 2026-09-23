export function DemoBanner({ sampleDescription }: { sampleDescription: string }) {
  return (
    <div className="border-b border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <p className="mx-auto max-w-7xl px-4 py-2 text-sm">
        <strong>Demo with sample data.</strong> {sampleDescription} Nothing here comes from LinkedIn. Switch between Followers and Contacts, and
        play with the filters, time windows, and chart zoom.
      </p>
    </div>
  )
}
