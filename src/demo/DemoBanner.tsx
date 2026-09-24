export function DemoBanner({ sampleDescription }: { sampleDescription: string }) {
  return (
    <div className="border-b border-dashed">
      <p className="mx-auto max-w-7xl px-4 py-2 text-xs leading-relaxed text-muted-foreground sm:px-6">
        <strong className="rainbow-text font-bold">Demo with sample data.</strong> {sampleDescription} Nothing here comes from LinkedIn. Switch
        between Followers and Connections, and play with the filters, time windows, and chart zoom.
      </p>
    </div>
  )
}
