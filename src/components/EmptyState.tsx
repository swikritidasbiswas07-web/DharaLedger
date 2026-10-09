import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  icon: ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-sage bg-ivory/60 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-sage/40 text-teal">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg text-pine">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-pine/70">
        {description}
      </p>
    </div>
  )
}
