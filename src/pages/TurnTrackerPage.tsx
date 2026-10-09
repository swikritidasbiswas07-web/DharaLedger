
import {
  ClipboardList,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Pencil,
} from 'lucide-react'

import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'

import { DemoBadge } from '../components/DemoBadge'
import { EmptyState } from '../components/EmptyState'
import { useDemo } from '../context/DemoContext'

import {
  formatLitres,
  formatShortDate,
  todayIsoDate,
} from '../lib/format'

import type { TurnStatus } from '../types'

const STATUSES: TurnStatus[] = [
  'Planned',
  'Delivered',
  'Shortfall',
]

type StatusFilter = 'All' | TurnStatus

export function TurnTrackerPage() {
  const {
    households,
    turns,
    addTurn,
    updateTurn,
  } = useDemo()

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] =
    useState<StatusFilter>('All')

  const [selectedHousehold, setSelectedHousehold] =
    useState('')

  const [selectedStatus, setSelectedStatus] =
    useState<TurnStatus>('Planned')

  const [plannedInput, setPlannedInput] = useState('')
  const [actualInput, setActualInput] = useState('0')

  // Edit controls for an existing planned record.
  const [editingId, setEditingId] =
    useState<string | null>(null)

  const [editActual, setEditActual] = useState('')
  const [editError, setEditError] = useState('')

  const summary = useMemo(() => {
    const completed = turns.filter(
      (turn) => turn.status !== 'Planned',
    )

    const pending = turns.filter(
      (turn) => turn.status === 'Planned',
    )

    const plannedVolume = turns.reduce(
      (sum, turn) => sum + turn.plannedLitres,
      0,
    )

    const deliveredVolume = completed.reduce(
      (sum, turn) => sum + turn.actualLitres,
      0,
    )

    const shortageVolume = completed.reduce(
      (sum, turn) =>
        sum +
        Math.max(
          0,
          turn.plannedLitres - turn.actualLitres,
        ),
      0,
    )

    const completionRate =
      turns.length > 0
        ? (completed.length / turns.length) * 100
        : 0

    return {
      plannedVolume,
      deliveredVolume,
      shortageVolume,
      completionRate,
      completedCount: completed.length,
      pendingCount: pending.length,
    }
  }, [turns])

  const filteredTurns = useMemo(
    () =>
      filter === 'All'
        ? turns
        : turns.filter(
            (turn) => turn.status === filter,
          ),
    [turns, filter],
  )

  const duplicateKeys = useMemo(() => {
    const counts: Record<string, number> = {}

    turns.forEach((turn) => {
      const key = `${turn.householdId}|${turn.date}`
      counts[key] = (counts[key] ?? 0) + 1
    })

    return new Set(
      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    )
  }, [turns])

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const form = event.currentTarget
    const data = new FormData(form)

    const householdId = selectedHousehold
    const date = String(data.get('date') ?? '')
    const plannedRaw = plannedInput.trim()
    const actualRaw = actualInput.trim()

    const plannedLitres = Number(plannedRaw)
    const actualLitres = Number(actualRaw)

    const status = selectedStatus
    const notes = String(
      data.get('notes') ?? '',
    ).trim()

    function reject(message: string) {
      setError(message)
      setNotice('')
    }

    if (
      !households.some((h) => h.id === householdId)
    ) {
      reject('Please select a valid household.')
      return
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(`${date}T00:00:00`))
    ) {
      reject('Please choose a valid date.')
      return
    }

    if (
      plannedRaw === '' ||
      !Number.isFinite(plannedLitres) ||
      plannedLitres < 0
    ) {
      reject('Enter a valid planned quantity.')
      return
    }

    if (
      actualRaw === '' ||
      !Number.isFinite(actualLitres) ||
      actualLitres < 0
    ) {
      reject('Enter a valid actual quantity.')
      return
    }

    if (!STATUSES.includes(status)) {
      reject('Choose a valid status.')
      return
    }

    if (
      status === 'Planned' &&
      actualLitres !== 0
    ) {
      reject(
        'Planned turns must have 0 L recorded as delivered.',
      )
      return
    }

    if (
      status === 'Delivered' &&
      actualLitres < plannedLitres
    ) {
      reject(
        'Use Shortfall when actual delivery is below the planned amount.',
      )
      return
    }

    if (
      status === 'Shortfall' &&
      actualLitres >= plannedLitres
    ) {
      reject(
        'Shortfall requires actual delivery below the planned amount.',
      )
      return
    }

    if (notes.length > 300) {
      reject(
        'Notes must be at most 300 characters.',
      )
      return
    }

    // Simplified MVP: one distribution turn per
    // household per date. Existing duplicates
    // remain visible for review.
    const duplicate = turns.some(
      (turn) =>
        turn.householdId === householdId &&
        turn.date === date,
    )

    if (duplicate) {
      reject(
        'A record already exists for this household and date. Update the existing Planned record instead.',
      )
      return
    }

    addTurn({
      householdId,
      date,
      plannedLitres,
      actualLitres,
      status,
      notes,
    })

    form.reset()

    setSelectedHousehold('')
    setSelectedStatus('Planned')
    setPlannedInput('')
    setActualInput('0')
    setError('')

    setNotice(
      'Distribution record saved locally in this browser.',
    )
  }

  function startEditing(
    turnId: string,
  ) {
    setEditingId(turnId)
    setEditActual('')
    setEditError('')
    setNotice('')
  }

  function cancelEditing() {
    setEditingId(null)
    setEditActual('')
    setEditError('')
  }

  function saveDelivery(
    turnId: string,
  ) {
    const turn = turns.find(
      (item) => item.id === turnId,
    )

    if (!turn || turn.status !== 'Planned') {
      setEditError(
        'Only existing Planned records can be updated.',
      )
      return
    }

    const raw = editActual.trim()
    const actual = Number(raw)

    if (
      raw === '' ||
      !Number.isFinite(actual) ||
      actual < 0
    ) {
      setEditError(
        'Enter a valid nonnegative actual quantity.',
      )
      return
    }

    const nextStatus: TurnStatus =
      actual < turn.plannedLitres
        ? 'Shortfall'
        : 'Delivered'

    updateTurn(turnId, {
      actualLitres: actual,
      status: nextStatus,
    })

    setEditingId(null)
    setEditActual('')
    setEditError('')
    setNotice(
      `Existing ${turn.householdId} record updated to ${nextStatus}.`,
    )
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal">
            Community distribution monitoring
          </p>

          <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">
            TurnTracker
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pine/70">
            Schedule water deliveries, update completed
            turns and track actual shortages for
            synthetic households.
          </p>
        </div>

        <DemoBadge />
      </header>

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Scheduled water"
          value={formatLitres(
            summary.plannedVolume,
          )}
          subtitle="All recorded turns"
          icon={<Droplets className="size-5" />}
        />

        <SummaryCard
          label="Water delivered"
          value={formatLitres(
            summary.deliveredVolume,
          )}
          subtitle="Completed turns"
          icon={<CheckCircle2 className="size-5" />}
        />

        <SummaryCard
          label="Recorded shortage"
          value={formatLitres(
            summary.shortageVolume,
          )}
          subtitle="Excludes pending turns"
          icon={<AlertTriangle className="size-5" />}
        />

        <SummaryCard
          label="Turn completion"
          value={`${summary.completionRate.toFixed(1)}%`}
          subtitle={`${summary.completedCount} completed · ${summary.pendingCount} pending`}
          icon={<Clock3 className="size-5" />}
        />
      </section>

      {/* NEW RECORD FORM */}
      <section className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
        <h2 className="font-display text-xl">
          Record a distribution turn
        </h2>

        <p className="mt-2 text-sm text-pine/65">
          Add a new hypothetical distribution
          event or plan.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <label className="text-sm font-medium">
            Household ID

            <select
              value={selectedHousehold}
              onChange={(event) =>
                setSelectedHousehold(
                  event.target.value,
                )
              }
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5"
            >
              <option value="" disabled>
                Select a household
              </option>

              {households.map((h) => (
                <option
                  key={h.id}
                  value={h.id}
                >
                  {h.id} · {h.zone}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Distribution date

            <input
              name="date"
              type="date"
              defaultValue={todayIsoDate()}
              required
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5"
            />
          </label>

          <label className="text-sm font-medium">
            Status

            <select
              value={selectedStatus}
              onChange={(event) => {
                const value =
                  event.target.value as TurnStatus

                setSelectedStatus(value)

                if (value === 'Planned') {
                  setActualInput('0')
                }
              }}
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5"
            >
              {STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium">
            Planned quantity (L)

            <input
              type="number"
              min="0"
              step="1"
              value={plannedInput}
              onChange={(event) =>
                setPlannedInput(
                  event.target.value,
                )
              }
              required
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5"
            />
          </label>

          <label className="text-sm font-medium">
            Actual quantity (L)

            <input
              type="number"
              min="0"
              step="1"
              value={actualInput}
              disabled={
                selectedStatus === 'Planned'
              }
              onChange={(event) =>
                setActualInput(
                  event.target.value,
                )
              }
              required
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5 disabled:opacity-50"
            />
          </label>

          <label className="text-sm font-medium">
            Notes

            <input
              name="notes"
              type="text"
              maxLength={300}
              placeholder="Optional"
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5"
            />
          </label>

          <div className="md:col-span-2 xl:col-span-3">
            {error && (
              <p
                role="alert"
                className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {notice && (
              <p
                role="status"
                className="mb-3 rounded-xl bg-sage/30 p-3 text-sm text-teal"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              className="rounded-xl bg-pine px-6 py-3 text-sm font-semibold text-ivory hover:bg-teal"
            >
              Add distribution record
            </button>
          </div>
        </form>
      </section>

      {/* HISTORY */}
      <section className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl">
              Distribution history
            </h2>

            <p className="mt-2 text-sm text-pine/65">
              {filteredTurns.length} of {turns.length} demo records
            </p>
          </div>

          <label className="text-sm font-medium">
            Filter by status

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as StatusFilter,
                )
              }
              className="ml-2 rounded-xl border border-sage bg-ivory px-3 py-2"
            >
              <option value="All">
                All records
              </option>

              {STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {duplicateKeys.size > 0 && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            Some existing records share the same
            household and date. They have been
            preserved for manual review.
          </p>
        )}

        {turns.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={
                <ClipboardList className="size-6" />
              }
              title="No distribution records yet"
              description="Schedule a hypothetical delivery above."
            />
          </div>
        ) : filteredTurns.length === 0 ? (
          <div className="mt-5 rounded-xl bg-ivory p-8 text-center text-sm text-pine/65">
            No records match the filter.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-sage bg-ivory/80 text-pine/70">
                <tr>
                  <th className="px-4 py-3">
                    Household
                  </th>
                  <th className="px-4 py-3">
                    Date
                  </th>
                  <th className="px-4 py-3">
                    Planned
                  </th>
                  <th className="px-4 py-3">
                    Actual
                  </th>
                  <th className="px-4 py-3">
                    Shortage
                  </th>
                  <th className="px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTurns.map((turn) => {
                  const duplicate = duplicateKeys.has(
                    `${turn.householdId}|${turn.date}`,
                  )

                  const shortage =
                    turn.status === 'Planned'
                      ? null
                      : Math.max(
                          0,
                          turn.plannedLitres -
                            turn.actualLitres,
                        )

                  const editing =
                    editingId === turn.id

                  return (
                    <tr
                      key={turn.id}
                      className="border-b border-sage/40 align-top"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {turn.householdId}

                        {duplicate && (
                          <p className="mt-1 text-xs font-normal text-amber-700">
                            Duplicate date — review
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {formatShortDate(
                          turn.date,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {formatLitres(
                          turn.plannedLitres,
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {turn.status === 'Planned'
                          ? 'Pending'
                          : formatLitres(
                              turn.actualLitres,
                            )}
                      </td>

                      <td className="px-4 py-3">
                        {shortage === null
                          ? 'Not evaluated'
                          : formatLitres(
                              shortage,
                            )}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          status={turn.status}
                        />
                      </td>

                      <td className="px-4 py-3">
                        {turn.status === 'Planned' &&
                          !editing && (
                            <button
                              type="button"
                              onClick={() =>
                                startEditing(
                                  turn.id,
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-xs font-semibold text-white hover:bg-pine"
                            >
                              <Pencil className="size-3.5" />
                              Update delivery
                            </button>
                          )}

                        {editing && (
                          <div className="min-w-44 space-y-2">
                            <label className="block text-xs font-medium">
                              Actual litres

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={editActual}
                                onChange={(event) => {
                                  setEditActual(
                                    event.target.value,
                                  )
                                  setEditError('')
                                }}
                                className="mt-1 w-full rounded-lg border border-sage bg-ivory px-2 py-2"
                                placeholder="e.g. 90"
                              />
                            </label>

                            {editError && (
                              <p
                                role="alert"
                                className="text-xs text-red-700"
                              >
                                {editError}
                              </p>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  saveDelivery(
                                    turn.id,
                                  )
                                }
                                className="rounded-lg bg-pine px-3 py-2 text-xs font-semibold text-white"
                              >
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="rounded-lg border border-sage px-3 py-2 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {turn.status !== 'Planned' && (
                          <span className="text-xs text-pine/50">
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-pine/60">
        Records are synthetic demo data saved in
        browser local storage. They do not represent
        actual deliveries or committee-approved
        schedules in Mangalpuri.
      </p>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  subtitle,
  icon,
}: {
  label: string
  value: string
  subtitle: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-pine/60">
          {label}
        </p>

        <span className="text-teal">
          {icon}
        </span>
      </div>

      <p className="mt-3 font-display text-2xl text-pine">
        {value}
      </p>

      <p className="mt-2 text-xs text-pine/60">
        {subtitle}
      </p>
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: TurnStatus
}) {
  const styles: Record<TurnStatus, string> = {
    Planned: 'bg-sage/40 text-pine',
    Delivered: 'bg-teal/15 text-teal',
    Shortfall: 'bg-clay/20 text-pine',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  )
}
