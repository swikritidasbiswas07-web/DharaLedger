
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { DemoBadge } from '../components/DemoBadge'
import { useDemo } from '../context/DemoContext'
import { formatLitres } from '../lib/format'
import {
  runJalNyay,
  type AllocationResult,
} from '../lib/jalnyayApi'

const DEMO_CAPACITIES: Record<string, number> = {
  'Upper Spring': 2500,
  'Middle Terrace': 2000,
  'Lower Ward': 1800,
}

export function JalNyayPage() {
  const {
    households,
    supply,
    totalDemandLitres,
    updateSupply,
    updateHouseholdNeed,
  } = useDemo()

  const [supplyError, setSupplyError] = useState('')
  const [needError, setNeedError] = useState('')
  const [zoneError, setZoneError] = useState('')
  const [zoneFilter, setZoneFilter] = useState('All')

  const [useZoneLimits, setUseZoneLimits] = useState(true)

  const [zoneCapacities, setZoneCapacities] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {}

    for (const household of households) {
      initial[household.zone] = String(
        DEMO_CAPACITIES[household.zone] ?? 2000,
      )
    }

    return initial
  })

  const [allocationResult, setAllocationResult] =
    useState<AllocationResult | null>(null)

  const [isCalculating, setIsCalculating] = useState(false)
  const [allocationError, setAllocationError] = useState('')
  const [resultsStale, setResultsStale] = useState(false)

  // Prevent old API responses from overwriting newer inputs.
  const requestVersion = useRef(0)

  const zones = useMemo(
    () => [...new Set(households.map((h) => h.zone))],
    [households],
  )

  const visibleHouseholds = households.filter(
    (h) => zoneFilter === 'All' || h.zone === zoneFilter,
  )

  const totalAvailable =
    supply.availableSpringWaterLitres +
    supply.usableStorageLitres

  function clearResults() {
    requestVersion.current += 1
    setAllocationResult(null)
    setAllocationError('')
    setResultsStale(true)
  }

  function handleSupplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const rawAvailable = String(form.get('available') ?? '')
    const rawStorage = String(form.get('storage') ?? '')

    const available = Number(rawAvailable)
    const storage = Number(rawStorage)

    if (
      rawAvailable.trim() === '' ||
      rawStorage.trim() === '' ||
      !Number.isFinite(available) ||
      !Number.isFinite(storage) ||
      available < 0 ||
      storage < 0
    ) {
      setSupplyError('Enter valid nonnegative water volumes.')
      return
    }

    setSupplyError('')
    clearResults()

    updateSupply({
      availableSpringWaterLitres: available,
      usableStorageLitres: storage,
    })
  }

  function handleNeedChange(id: string, raw: string) {
    const next = Number(raw)

    if (
      raw.trim() === '' ||
      !Number.isFinite(next) ||
      next < 0
    ) {
      setNeedError(
        `${id}: enter a valid nonnegative daily requirement.`,
      )
      return
    }

    setNeedError('')
    clearResults()
    updateHouseholdNeed(id, next)
  }

  function handleZoneChange(zone: string, raw: string) {
    setZoneCapacities((current) => ({
      ...current,
      [zone]: raw,
    }))
    setZoneError('')
    clearResults()
  }

  async function handleRunAllocation() {
    if (isCalculating) return

    const version = ++requestVersion.current
    let capacities: Record<string, number> | undefined

    if (useZoneLimits) {
      capacities = {}

      for (const zone of zones) {
        const raw = zoneCapacities[zone] ?? ''
        const number = Number(raw)

        if (
          raw.trim() === '' ||
          !Number.isFinite(number) ||
          number < 0
        ) {
          setZoneError(
            `Enter a valid nonnegative capacity for ${zone}.`,
          )
          return
        }

        capacities[zone] = number
      }
    }

    setZoneError('')
    setIsCalculating(true)
    setAllocationError('')
    setAllocationResult(null)
    setResultsStale(false)

    try {
      const result = await runJalNyay({
        availableSpringWaterLitres:
          supply.availableSpringWaterLitres,
        usableStorageLitres:
          supply.usableStorageLitres,
        households: households.map((h) => ({
          id: h.id,
          zone: h.zone,
          dailyNeedLitres: h.dailyNeedLitres,
        })),
        ...(capacities
          ? { zoneCapacityLitres: capacities }
          : {}),
      })

      if (requestVersion.current === version) {
        setAllocationResult(result)
      }
    } catch (error) {
      if (requestVersion.current === version) {
        setAllocationError(
          error instanceof Error
            ? error.message
            : 'Unable to connect to JalNyay.',
        )
      }
    } finally {
      setIsCalculating(false)
    }
  }

  const overallSatisfaction = allocationResult
    ? allocationResult.totalDemandLitres > 0
      ? (allocationResult.totalAllocatedLitres /
          allocationResult.totalDemandLitres) * 100
      : 100
    : 0

  const minimumSatisfaction = allocationResult
    ? allocationResult.satisfactionRatio * 100
    : 0

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal">
            Community allocation intelligence
          </p>

          <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">
            JalNyay Engine
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pine/70">
            Calculate feasible household allocations using
            available water, demand and neighbourhood
            delivery constraints.
          </p>
        </div>

        <DemoBadge />
      </header>

      {/* SUPPLY INPUTS */}
      <section className="grid gap-6 xl:grid-cols-2">
        <form
          onSubmit={handleSupplySubmit}
          className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm"
        >
          <h2 className="font-display text-xl">
            Supply inputs
          </h2>

          <p className="mt-2 text-sm text-pine/65">
            All volumes represent the same one-day
            planning period.
          </p>

          <label className="mt-5 block text-sm font-medium">
            Available spring water (L)

            <input
              name="available"
              type="number"
              min="0"
              step="1"
              defaultValue={supply.availableSpringWaterLitres}
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal"
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Additional usable stored water (L)

            <input
              name="storage"
              type="number"
              min="0"
              step="1"
              defaultValue={supply.usableStorageLitres}
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal"
            />
          </label>

          <p className="mt-3 text-xs text-pine/60">
            Stored water must not already be included in
            the reported spring-water quantity.
          </p>

          {supplyError && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {supplyError}
            </p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-ivory transition hover:bg-teal"
          >
            Save supply inputs
          </button>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric
              label="Total available"
              value={formatLitres(totalAvailable)}
            />
            <Metric
              label="Household demand"
              value={formatLitres(totalDemandLitres)}
            />
          </div>
        </form>

        {/* ZONE CAPACITIES */}
        <div className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">
                Zone delivery constraints
              </h2>
              <p className="mt-2 text-sm text-pine/65">
                Maximum litres deliverable to each zone
                during the planning period.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={useZoneLimits}
                onChange={(event) => {
                  setUseZoneLimits(event.target.checked)
                  setZoneError('')
                  clearResults()
                }}
                className="accent-teal"
              />
              Enable
            </label>
          </div>

          <div className="mt-5 space-y-4">
            {zones.map((zone) => (
              <label
                key={zone}
                className="block text-sm font-medium"
              >
                {zone}

                <div className="relative mt-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={zoneCapacities[zone] ?? ''}
                    disabled={!useZoneLimits}
                    onChange={(event) =>
                      handleZoneChange(
                        zone,
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-sage bg-ivory px-3 py-2.5 pr-12 outline-none focus:ring-2 focus:ring-teal disabled:opacity-50"
                  />

                  <span className="absolute right-4 top-3 text-xs text-pine/50">
                    L/day
                  </span>
                </div>
              </label>
            ))}
          </div>

          {zoneError && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {zoneError}
            </p>
          )}

          <div className="mt-5 rounded-xl bg-sage/20 p-4 text-xs leading-relaxed text-pine/70">
            The default zone capacities are hypothetical.
            They do not represent measured Mangalpuri
            pipeline capacities.
          </div>
        </div>
      </section>

      {/* RESULTS */}
      <section className="rounded-2xl border border-teal/40 bg-sage/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">
              JalNyay Allocation Results
            </h2>

            <p className="mt-2 text-sm text-pine/70">
              Two-stage mathematical optimisation
              with explainable allocation outcomes.
            </p>
          </div>

          <DemoBadge />
        </div>

        <button
          type="button"
          onClick={handleRunAllocation}
          disabled={isCalculating || Boolean(needError)}
          className="mt-5 w-full rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-ivory transition hover:bg-teal disabled:opacity-60"
        >
          {isCalculating
            ? 'Running optimisation...'
            : 'Run JalNyay Optimisation'}
        </button>

        <p className="mt-2 text-xs text-pine/60">
          Uses saved supply values and all household
          requirements, including currently hidden zones.
        </p>

        {allocationError && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"
          >
            {allocationError}. Check that the Python
            backend is running on port 8000.
          </p>
        )}

        {isCalculating && (
          <div className="mt-5 rounded-xl bg-ivory p-6 text-center text-sm">
            Calculating a feasible distribution plan...
          </div>
        )}

        {!allocationResult &&
          !allocationError &&
          !isCalculating && (
            <div className="mt-5 rounded-xl bg-ivory p-8 text-center text-sm text-pine/65">
              {resultsStale
                ? 'Inputs changed. Run the optimiser again.'
                : 'Run JalNyay to generate a distribution plan.'}
            </div>
          )}

        {allocationResult && (
          <div className="mt-6 space-y-6">

            {/* MAIN METRICS */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric
                label="Available water"
                value={formatLitres(
                  allocationResult.totalAvailableLitres,
                )}
              />

              <Metric
                label="Water allocated"
                value={formatLitres(
                  allocationResult.totalAllocatedLitres,
                )}
              />

              <Metric
                label="Unmet demand"
                value={formatLitres(
                  allocationResult.unmetDemandLitres,
                )}
              />

              <Metric
                label="Unused water"
                value={formatLitres(
                  allocationResult.unusedWaterLitres,
                )}
              />
            </div>

            {/* FAIRNESS METRICS */}
            <div className="grid gap-4 md:grid-cols-2">
              <ProgressCard
                label="Overall demand satisfied"
                value={overallSatisfaction}
                description="Percentage of total requested water delivered."
              />

              <ProgressCard
                label="Minimum guaranteed satisfaction"
                value={minimumSatisfaction}
                description="Minimum share of stated demand guaranteed to each household."
              />
            </div>

            {/* ZONE REPORT */}
            <div className="rounded-xl bg-white p-5">
              <h3 className="font-display text-xl">
                Zone-wise distribution
              </h3>

              <p className="mt-2 text-sm text-pine/65">
                Compare demand, feasible allocation,
                and unmet water requirements.
              </p>

              <div className="mt-5 space-y-5">
                {allocationResult.zoneResults.map((zone) => {
                  const percentage =
                    zone.demandLitres > 0
                      ? Math.min(
                          100,
                          (zone.allocatedLitres /
                            zone.demandLitres) *
                            100,
                        )
                      : 100

                  return (
                    <div key={zone.zone}>
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-semibold">
                          {zone.zone}
                        </span>

                        <span className="text-pine/65">
                          {formatLitres(
                            zone.allocatedLitres,
                          )}
                          {' / '}
                          {formatLitres(zone.demandLitres)}
                        </span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-sage/40">
                        <div
                          className="h-full rounded-full bg-teal transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-pine/60">
                        <span>
                          Unmet:{' '}
                          {formatLitres(
                            zone.unmetLitres,
                          )}
                        </span>

                        <span>
                          Capacity:{' '}
                          {zone.capacityLitres === null
                            ? 'Not limited'
                            : formatLitres(
                                zone.capacityLitres,
                              )}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* HOUSEHOLD REPORT */}
            <div className="rounded-xl bg-white p-5">
              <h3 className="font-display text-xl">
                Household Allocation Plan
              </h3>

              <div className="mt-4 max-h-80 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white text-pine/70">
                    <tr>
                      <th className="py-3 pr-3">Household</th>
                      <th className="py-3 pr-3">Zone</th>
                      <th className="py-3 pr-3">Requested</th>
                      <th className="py-3">Allocated</th>
                    </tr>
                  </thead>

                  <tbody>
                    {allocationResult.allocations.map(
                      (item) => (
                        <tr
                          key={item.householdId}
                          className="border-t border-sage/40"
                        >
                          <td className="py-3 pr-3 font-semibold">
                            {item.householdId}
                          </td>

                          <td className="py-3 pr-3">
                            {item.zone}
                          </td>

                          <td className="py-3 pr-3">
                            {formatLitres(
                              item.requestedLitres,
                            )}
                          </td>

                          <td className="py-3 font-semibold text-teal">
                            {formatLitres(
                              item.allocatedLitres,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-sage bg-ivory p-4 text-xs leading-relaxed text-pine/70">
              <strong>Calculation method:</strong>{' '}
              {allocationResult.method}.
              {' '}All results use synthetic household
              records and hypothetical supply capacities.
              This is a planning demonstration, not an
              approved community distribution schedule.
              The solver assumes zone capacities are
              independent and deliverable water is
              available within the selected period.
            </div>
          </div>
        )}
      </section>

      {/* HOUSEHOLD INPUTS */}
      <section className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">
              Household requirement inputs
            </h2>

            <p className="mt-2 text-sm text-pine/65">
              Synthetic household IDs and hypothetical
              daily water requirements.
            </p>
          </div>

          <label className="text-sm font-medium">
            Zone

            <select
              value={zoneFilter}
              onChange={(event) =>
                setZoneFilter(event.target.value)
              }
              className="ml-2 rounded-xl border border-sage bg-ivory px-3 py-2"
            >
              <option value="All">All zones</option>

              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
        </div>

        {needError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {needError}
          </p>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-sage text-pine/70">
              <tr>
                <th className="py-3 pr-4">Household</th>
                <th className="py-3 pr-4">Zone</th>
                <th className="py-3 pr-4">Occupancy</th>
                <th className="py-3">Daily need (L)</th>
              </tr>
            </thead>

            <tbody>
              {visibleHouseholds.map((household) => (
                <tr
                  key={household.id}
                  className="border-b border-sage/40"
                >
                  <td className="py-3 pr-4 font-semibold">
                    {household.id}
                  </td>

                  <td className="py-3 pr-4">
                    {household.zone}
                  </td>

                  <td className="py-3 pr-4">
                    {household.occupancy}
                  </td>

                  <td className="py-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={household.dailyNeedLitres}
                      onChange={(event) =>
                        handleNeedChange(
                          household.id,
                          event.target.value,
                        )
                      }
                      className="w-28 rounded-lg border border-sage bg-ivory px-2 py-1.5 outline-none focus:ring-2 focus:ring-teal"
                      aria-label={`Daily need for ${household.id}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// REUSABLE METRIC CARD
function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-pine/60">{label}</p>
      <p className="mt-2 text-xl font-bold text-pine">
        {value}
      </p>
    </div>
  )
}

// REUSABLE PERCENTAGE CARD
function ProgressCard({
  label,
  value,
  description,
}: {
  label: string
  value: number
  description: string
}) {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div className="rounded-xl bg-white p-5">
      <p className="text-sm font-semibold text-pine">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-teal">
        {safeValue.toFixed(1)}%
      </p>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-sage/40">
        <div
          className="h-full rounded-full bg-teal"
          style={{ width: `${safeValue}%` }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-pine/65">
        {description}
      </p>
    </div>
  )
}
