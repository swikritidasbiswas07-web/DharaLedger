import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: string
  hint: string
  icon: ReactNode
}

export function MetricCard({ label, value, hint, icon }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-pine/70">{label}</p>
        <span className="flex size-10 items-center justify-center rounded-xl bg-sage/40 text-teal">
          {icon}
        </span>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-pine">
        {value}
      </p>
      <p className="mt-2 text-xs text-pine/60">{hint}</p>
    </article>
  )
}
