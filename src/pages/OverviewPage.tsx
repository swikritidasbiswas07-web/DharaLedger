import { ArrowRight, Cylinder, Droplets, Home, Waves } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MetricCard } from '../components/MetricCard'
import { useDemo } from '../context/DemoContext'
import { HYPOTHETICAL_WEEKLY_YIELD, supplyConditionLabel } from '../data/demo'
import { formatLitres, formatShortDate } from '../lib/format'
import type { PageId } from '../types'

type OverviewPageProps = {
  onNavigate: (page: PageId) => void
}

export function OverviewPage({ onNavigate }: OverviewPageProps) {
  const { supply, households, totalDemandLitres, turns, issues } = useDemo()
  const condition = supplyConditionLabel(
    supply.availableSpringWaterLitres,
    totalDemandLitres,
  )

  const comparison = [
    {
      name: 'Planning day',
      Supply: supply.availableSpringWaterLitres,
      Demand: totalDemandLitres,
    },
  ]

  const recentTurns = turns.slice(0, 4)
  const openIssues = issues.filter((issue) => issue.status !== 'Resolved').length
  const delivered = turns.filter((turn) => turn.status === 'Delivered').length
  const shortfalls = turns.filter((turn) => turn.status === 'Shortfall').length

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal">Mangalpuri, Darjeeling</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-pine md:text-4xl">
            Community Water Overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pine/70">
            Hypothetical planning snapshot for a community-controlled spring-water
            distribution exercise. Figures on this page are demo inputs, not live
            field readings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('jalnyay')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-pine px-5 py-3 text-sm font-semibold text-ivory transition hover:bg-teal"
        >
          Open JalNyay Engine
          <ArrowRight className="size-4" />
        </button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Available spring water"
          value={formatLitres(supply.availableSpringWaterLitres)}
          hint="Hypothetical daily spring yield"
          icon={<Waves className="size-5" />}
        />
        <MetricCard
          label="Usable storage"
          value={formatLitres(supply.usableStorageLitres)}
          hint="Demo tank capacity still available"
          icon={<Cylinder className="size-5" />}
        />
        <MetricCard
          label="Households in the roster"
          value={String(households.length)}
          hint="Synthetic IDs H001–H040"
          icon={<Home className="size-5" />}
        />
        <MetricCard
          label="Supply condition"
          value={condition}
          hint="Simple comparison of entered supply vs household need totals"
          icon={<Droplets className="size-5" />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <article className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm xl:col-span-3">
          <h2 className="font-display text-xl text-pine">
            Hypothetical available water
          </h2>
          <p className="mt-1 text-sm text-pine/65">
            Seven-day demo series for spring yield. Not a forecast.
          </p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HYPOTHETICAL_WEEKLY_YIELD}>
                <CartesianGrid stroke="#A9C5B1" strokeDasharray="4 4" />
                <XAxis dataKey="dateLabel" tick={{ fill: '#173F46', fontSize: 12 }} />
                <YAxis tick={{ fill: '#173F46', fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value ?? 0} L`, 'Hypothetical yield']}
                />
                <Bar dataKey="litres" fill="#3C817D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm xl:col-span-2">
          <h2 className="font-display text-xl text-pine">Supply versus demand</h2>
          <p className="mt-1 text-sm text-pine/65">
            Visual comparison of current demo spring supply and the sum of
            household requirement inputs. Storage is shown separately and is not
            mixed into this bar.
          </p>
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparison}>
                <CartesianGrid stroke="#A9C5B1" strokeDasharray="4 4" />
                <XAxis dataKey="name" tick={{ fill: '#173F46', fontSize: 12 }} />
                <YAxis tick={{ fill: '#173F46', fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value ?? 0} L`} />
                <Legend />
                <Bar dataKey="Supply" fill="#173F46" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Demand" fill="#C88F62" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-ivory p-3">
              <dt className="text-pine/60">Entered demand total</dt>
              <dd className="mt-1 font-semibold">{formatLitres(totalDemandLitres)}</dd>
            </div>
            <div className="rounded-xl bg-ivory p-3">
              <dt className="text-pine/60">Usable storage (demo)</dt>
              <dd className="mt-1 font-semibold">
                {formatLitres(supply.usableStorageLitres)}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
          <h2 className="font-display text-xl text-pine">Distribution status</h2>
          <p className="mt-1 text-sm text-pine/65">
            Counts from local demo TurnTracker records in this browser.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <StatusStat label="Logged turns" value={turns.length} />
            <StatusStat label="Delivered" value={delivered} />
            <StatusStat label="Shortfall" value={shortfalls} />
          </div>
          <p className="mt-4 text-sm text-pine/70">
            Open maintenance items: <strong>{openIssues}</strong>
          </p>
        </article>

        <article className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
          <h2 className="font-display text-xl text-pine">Recent activity</h2>
          <p className="mt-1 text-sm text-pine/65">
            Latest local demo distribution entries.
          </p>
          {recentTurns.length === 0 ? (
            <p className="mt-6 rounded-xl bg-ivory px-4 py-5 text-sm text-pine/70">
              No TurnTracker records yet. Add a hypothetical distribution entry
              to see it here.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentTurns.map((turn) => (
                <li
                  key={turn.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-ivory px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{turn.householdId}</p>
                    <p className="text-pine/65">{formatShortDate(turn.date)}</p>
                  </div>
                  <div className="text-right">
                    <p>
                      {formatLitres(turn.actualLitres)} /{' '}
                      {formatLitres(turn.plannedLitres)}
                    </p>
                    <p className="text-xs text-teal">{turn.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  )
}

function StatusStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-ivory px-3 py-4">
      <p className="font-display text-2xl text-pine">{value}</p>
      <p className="mt-1 text-xs text-pine/65">{label}</p>
    </div>
  )
}
