import {
  ClipboardList,
  Droplets,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Wrench,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { PageId } from '../../types'
import { DemoBadge } from '../DemoBadge'

const NAV_ITEMS: {
  id: PageId
  label: string
  description: string
  icon: typeof LayoutDashboard
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Community snapshot',
    icon: LayoutDashboard,
  },
  {
    id: 'jalnyay',
    label: 'JalNyay Engine',
    description: 'Planning inputs',
    icon: Droplets,
  },
  {
    id: 'scenario',
    label: 'Scenario Lab',
    description: 'Assumptions preview',
    icon: FlaskConical,
  },
  {
    id: 'turns',
    label: 'TurnTracker',
    description: 'Distribution log',
    icon: ClipboardList,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Issue board',
    icon: Wrench,
  },
]

type AppShellProps = {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

export function AppShell({ currentPage, onNavigate, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  function goTo(page: PageId) {
    onNavigate(page)
    setMobileOpen(false)
  }

  const nav = (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = currentPage === item.id
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => goTo(item.id)}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
              active
                ? 'bg-white/10 text-ivory shadow-inner'
                : 'text-sage hover:bg-white/5 hover:text-ivory'
            }`}
          >
            <Icon className="size-5 shrink-0" />
            <span>
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="block text-xs text-sage/80">{item.description}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-ivory text-pine">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-white/5 bg-pine px-5 py-6 text-ivory lg:flex">
        <Brand />
        {nav}
        <FooterNote />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-pine/50"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-pine px-5 py-6 text-ivory shadow-2xl">
            <div className="flex items-start justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-sage hover:bg-white/10 hover:text-ivory"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <FooterNote />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-sage/40 bg-ivory/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-sage/70 p-2 text-pine lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-teal uppercase">
                DharaLedger
              </p>
              <p className="text-sm text-pine/70">Mangalpuri water commons</p>
            </div>
          </div>
          <DemoBadge />
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-teal text-ivory">
          <Droplets className="size-5" />
        </span>
        <div>
          <p className="font-display text-lg leading-tight">DharaLedger</p>
          <p className="text-xs text-sage">Community water planning</p>
        </div>
      </div>
    </div>
  )
}

function FooterNote() {
  return (
    <p className="mt-6 text-xs leading-relaxed text-sage/80">
      Local demo workspace. Records saved in this browser are not a community
      database.
    </p>
  )
}
