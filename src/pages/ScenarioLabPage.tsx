
import { useEffect, useMemo, useRef, useState } from 'react'
import { DemoBadge } from '../components/DemoBadge'
import { useDemo } from '../context/DemoContext'
import { formatLitres } from '../lib/format'
import {
  runJalNyay,
  type AllocationRequest,
  type AllocationResult,
} from '../lib/jalnyayApi'

type ScenarioKey = 'normal' | 'drought' | 'pipeline'

type ScenarioDefinition = {
  id: ScenarioKey
  name: string
  description: string
  springLitres: number
  storageLitres: number
  zoneLimits?: Record<string, number>
  note: string
}

type ScenarioOutcome = {
  definition: ScenarioDefinition
  result: AllocationResult
}

const scenarioOrder: ScenarioKey[] = [
  'normal',
  'drought',
  'pipeline',
]

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return 100

  return Math.max(
    0,
    Math.min(100, (numerator / denominator) * 100),
  )
}

export function ScenarioLabPage() {
  const { households, supply } = useDemo()

  const [selectedId, setSelectedId] =
    useState<ScenarioKey>('normal')

  const [outcomes, setOutcomes] = useState<
    ScenarioOutcome[] | null
  >(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const requestVersion = useRef(0)

  const totalDemand = useMemo(
    () =>
      households.reduce(
        (sum, household) =>
          sum + household.dailyNeedLitres,
        0,
      ),
    [households],
  )

  const failureZone = useMemo(() => {
    const zones = [...new Set(households.map((h) => h.zone))]
    return zones.includes('Lower Ward')
      ? 'Lower Ward'
      : zones[zones.length - 1] ?? 'Unassigned'
  }, [households])

  const failureZoneDemand = useMemo(
    () =>
      households
        .filter((h) => h.zone === failureZone)
        .reduce(
          (sum, h) => sum + h.dailyNeedLitres,
          0,
        ),
    [households, failureZone],
  )

  const scenarios = useMemo<ScenarioDefinition[]>(() => {
    const spring = supply.availableSpringWaterLitres
    const storage = supply.usableStorageLitres

    return [
      {
        id: 'normal',
        name: 'Normal Supply',
        description:
          'Current saved spring and storage volumes.',
        springLitres: spring,
        storageLitres: storage,
        note:
          'Baseline calculation with no additional zone delivery limits.',
      },
      {
        id: 'drought',
        name: 'Drought',
        description:
          'Spring yield falls by 50%; existing storage remains unchanged.',
        springLitres: spring * 0.5,
        storageLitres: storage,
        note:
          'Illustrative drought scenario. A 50% spring reduction is an assumed stress test, not a forecast.',
      },
      {
        id: 'pipeline',
        name: 'Pipeline Failure',
        description:
          `${failureZone} delivery capacity falls to 20% of its demand.`,
        springLitres: spring,
        storageLitres: storage,
        zoneLimits: {
          [failureZone]: failureZoneDemand * 0.2,
        },
        note:
          `A hypothetical infrastructure failure limits ${failureZone} delivery to 20% of its stated demand. Other zones are not given additional capacity limits.`,
      },
    ]
  }, [supply, failureZone, failureZoneDemand])

  // Invalidate old results if shared inputs change.
  useEffect(() => {
    requestVersion.current += 1
    setOutcomes(null)
    setHasRun(false)
    setError('')
  }, [households, supply])

  const selected = scenarios.find(
    (scenario) => scenario.id === selectedId,
  ) ?? scenarios[0]

  const selectedOutcome = outcomes?.find(
    (outcome) => outcome.definition.id === selectedId,
  )

  async function handleCompare() {
    if (loading) return

    const version = ++requestVersion.current

    setLoading(true)
    setError('')
    setOutcomes(null)
    setHasRun(false)

    try {
      const calculated = await Promise.all(
        scenarios.map(async (scenario) => {
          const request: AllocationRequest = {
            availableSpringWaterLitres:
              scenario.springLitres,
            usableStorageLitres:
              scenario.storageLitres,
            households: households.map((h) => ({
              id: h.id,
              zone: h.zone,
              dailyNeedLitres: h.dailyNeedLitres,
            })),
            ...(scenario.zoneLimits
              ? {
                  zoneCapacityLitres:
                    scenario.zoneLimits,
                }
              : {}),
          }

          const result = await runJalNyay(request)

          return {
            definition: scenario,
            result,
          }
        }),
      )

      if (requestVersion.current === version) {
        setOutcomes(calculated)
        setHasRun(true)
      }
    } catch (caught) {
      if (requestVersion.current === version) {
        setError(
          caught instanceof Error
            ? caught.message
            : 'Could not calculate scenarios.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal">
            Resilience and scenario planning
          </p>

          <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">
            Scenario Lab
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pine/70">
            Compare normal water availability, drought,
            and distribution infrastructure failures
            using real JalNyay calculations.
          </p>
        </div>

        <DemoBadge />
      </header>

      {/* SELECT SCENARIO */}
      <section className="grid gap-4 md:grid-cols-3">
        {scenarios.map((scenario) => {
          const active = scenario.id === selectedId

          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setSelectedId(scenario.id)}
              className={`rounded-2xl border p-5 text-left transition ${
                active
                  ? 'border-teal bg-white shadow-md ring-2 ring-teal/20'
                  : 'border-sage/60 bg-white/70 hover:border-teal/60'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal">
                  {scenario.id === 'normal'
                    ? 'Baseline'
                    : scenario.id === 'drought'
                      ? 'Climate stress'
                      : 'Infrastructure stress'}
                </span>

                {active && (
                  <span className="h-3 w-3 rounded-full bg-teal" />
                )}
              </div>

              <h2 className="font-display text-xl">
                {scenario.name}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-pine/65">
                {scenario.description}
              </p>
            </button>
          )
        })}
      </section>

      {/* INPUT ASSUMPTIONS */}
      <section className="rounded-2xl border border-sage/60 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">
            {selected.name} — Assumptions
          </h2>

          <span className="rounded-full bg-sage/30 px-3 py-1 text-xs font-semibold text-pine">
            Hypothetical scenario
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <Metric
            label="Spring water"
            value={formatLitres(
              selected.springLitres,
            )}
          />

          <Metric
            label="Additional storage"
            value={formatLitres(
              selected.storageLitres,
            )}
          />

          <Metric
            label="Total demand"
            value={formatLitres(totalDemand)}
          />

          <Metric
            label="Households"
            value={String(households.length)}
          />
        </div>

        <div className="mt-5 rounded-xl bg-ivory p-4 text-sm leading-relaxed text-pine/70">
          {selected.note}
        </div>

        <button
          type="button"
          onClick={handleCompare}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-pine px-5 py-3 font-semibold text-ivory transition hover:bg-teal disabled:cursor-wait disabled:opacity-60"
        >
          {loading
            ? 'Running three optimisations...'
            : 'Run & Compare All Scenarios'}
        </button>

        <p className="mt-3 text-xs text-pine/60">
          All three scenarios are calculated independently
          using the saved household data and FastAPI backend.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
            <p className="mt-2 text-xs">
              Verify that the JalNyay backend is running
              at http://127.0.0.1:8000.
            </p>
          </div>
        )}

        {loading && (
          <div
            role="status"
            className="mt-4 rounded-xl bg-sage/20 p-5 text-center text-sm"
          >
            Calculating feasible allocations across
            three different conditions...
          </div>
        )}

        {!hasRun && !loading && !error && (
          <div className="mt-4 rounded-xl border border-dashed border-teal/40 p-5 text-center text-sm text-pine/65">
            Run the comparison to generate real
            optimisation results.
          </div>
        )}
      </section>

      {/* COMPARISON RESULTS */}
      {outcomes && (
        <>
          <section className="rounded-2xl border border-sage/60 bg-white/80 p-6 shadow-sm">
            <h2 className="font-display text-2xl">
              Three-Scenario Comparison
            </h2>

            <p className="mt-2 text-sm text-pine/65">
              Results calculated by JalNyay using the
              same synthetic household requirements.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {scenarioOrder.map((id) => {
                const outcome = outcomes.find(
                  (item) => item.definition.id === id,
                )

                if (!outcome) return null

                const result = outcome.result

                const overall = percentage(
                  result.totalAllocatedLitres,
                  result.totalDemandLitres,
                )

                return (
                  <div
                    key={id}
                    className="rounded-xl border border-sage/60 bg-ivory p-5"
                  >
                    <h3 className="font-display text-lg">
                      {outcome.definition.name}
                    </h3>

                    <p className="mt-4 text-xs text-pine/60">
                      Water allocated
                    </p>

                    <p className="mt-1 text-2xl font-bold text-teal">
                      {formatLitres(
                        result.totalAllocatedLitres,
                      )}
                    </p>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs">
                        <span>Demand satisfied</span>
                        <strong>
                          {overall.toFixed(1)}%
                        </strong>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-sage/40">
                        <div
                          className="h-full bg-teal"
                          style={{
                            width: `${overall}%`,
                          }}
                        />
                      </div>
                    </div>

                    <dl className="mt-5 space-y-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-pine/60">
                          Unmet demand
                        </dt>
                        <dd className="font-semibold">
                          {formatLitres(
                            result.unmetDemandLitres,
                          )}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-2">
                        <dt className="text-pine/60">
                          Unused water
                        </dt>
                        <dd className="font-semibold">
                          {formatLitres(
                            result.unusedWaterLitres,
                          )}
                        </dd>
                      </div>

                      <div className="flex justify-between gap-2">
                        <dt className="text-pine/60">
                          Minimum guaranteed
                        </dt>
                        <dd className="font-semibold">
                          {(
                            result.satisfactionRatio * 100
                          ).toFixed(1)}%
                        </dd>
                      </div>
                    </dl>
                  </div>
                )
              })}
            </div>
          </section>

          {/* SELECTED SCENARIO DETAILS */}
          {selectedOutcome && (
            <section className="rounded-2xl border border-sage/60 bg-white/80 p-6 shadow-sm">
              <h2 className="font-display text-2xl">
                {selectedOutcome.definition.name}
                {' — '}Zone Impact
              </h2>

              <p className="mt-2 text-sm text-pine/65">
                Select a scenario above to inspect
                the computed zone-level outcomes.
              </p>

              <div className="mt-6 space-y-5">
                {selectedOutcome.result.zoneResults.map(
                  (zone) => {
                    const filled = percentage(
                      zone.allocatedLitres,
                      zone.demandLitres,
                    )

                    return (
                      <div key={zone.zone}>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-semibold">
                            {zone.zone}
                          </span>

                          <span className="text-pine/65">
                            {formatLitres(
                              zone.allocatedLitres,
                            )}
                            {' / '}
                            {formatLitres(
                              zone.demandLitres,
                            )}
                          </span>
                        </div>

                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-sage/40">
                          <div
                            className="h-full rounded-full bg-teal"
                            style={{
                              width: `${filled}%`,
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
                              ? 'Unrestricted in simulation'
                              : formatLitres(
                                  zone.capacityLitres,
                                )}
                          </span>
                        </div>
                      </div>
                    )
                  },
                )}
              </div>

              <div className="mt-6 rounded-xl bg-sage/20 p-4 text-xs leading-relaxed text-pine/70">
                <strong>Method:</strong>{' '}
                {selectedOutcome.result.method}.
                {' '}All quantities are simulated.
                Scenario calculations are planning
                comparisons, not actual water delivery
                instructions.
              </div>
            </section>
          )}
        </>
      )}

      <p className="text-xs leading-relaxed text-pine/60">
        Planning assumptions: one-day horizon;
        usable storage represents additional water
        not already counted in spring supply.
        Simulations omit network topology, pressure,
        quality testing and actual household approvals.
      </p>
    </div>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-ivory p-4">
      <p className="text-xs text-pine/60">{label}</p>
      <p className="mt-2 font-display text-xl">
        {value}
      </p>
    </div>
  )
}
