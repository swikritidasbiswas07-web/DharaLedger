export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-clay/40 bg-clay/15 px-3 py-1 text-xs font-semibold tracking-wide text-pine uppercase ${className}`}
    >
      <span className="size-1.5 rounded-full bg-clay" />
      Simulated Demo Data
    </span>
  )
}
