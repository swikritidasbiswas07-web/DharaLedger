
import {
  Wrench,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Search,
  MapPin,
  CalendarDays,
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
import type { IssueStatus } from '../types'

const STATUSES: IssueStatus[] = [
  'Open',
  'In Progress',
  'Resolved',
]

type StatusFilter = 'All' | IssueStatus

export function MaintenancePage() {
  const {
    issues,
    addIssue,
    updateIssueStatus,
  } = useDemo()

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [filter, setFilter] =
    useState<StatusFilter>('All')

  const [search, setSearch] = useState('')

  // Calculate real counts from existing demo records.
  const summary = useMemo(() => {
    const open = issues.filter(
      (issue) => issue.status === 'Open',
    ).length

    const inProgress = issues.filter(
      (issue) => issue.status === 'In Progress',
    ).length

    const resolved = issues.filter(
      (issue) => issue.status === 'Resolved',
    ).length

    const resolutionRate =
      issues.length > 0
        ? (resolved / issues.length) * 100
        : 0

    return {
      open,
      inProgress,
      resolved,
      resolutionRate,
      total: issues.length,
    }
  }, [issues])

  // Filter by status and search title/location/notes.
  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase()

    return issues.filter((issue) => {
      const matchesStatus =
        filter === 'All' ||
        issue.status === filter

      const matchesSearch =
        query === '' ||
        issue.title.toLowerCase().includes(query) ||
        issue.location.toLowerCase().includes(query) ||
        issue.notes.toLowerCase().includes(query)

      return matchesStatus && matchesSearch
    })
  }, [issues, filter, search])

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const form = event.currentTarget
    const data = new FormData(form)

    const title = String(
      data.get('title') ?? '',
    ).trim()

    const location = String(
      data.get('location') ?? '',
    ).trim()

    const notes = String(
      data.get('notes') ?? '',
    ).trim()

    function reject(message: string) {
      setError(message)
      setNotice('')
    }

    if (title.length < 3) {
      reject(
        'Give the issue a descriptive title of at least 3 characters.',
      )
      return
    }

    if (title.length > 100) {
      reject(
        'Issue title cannot exceed 100 characters.',
      )
      return
    }

    if (location.length < 2) {
      reject(
        'Enter a location, such as a tank, pipe, or spring intake.',
      )
      return
    }

    if (location.length > 120) {
      reject(
        'Location cannot exceed 120 characters.',
      )
      return
    }

    if (notes.length > 500) {
      reject(
        'Notes cannot exceed 500 characters.',
      )
      return
    }

    // Preserve identical-looking reports when distinct
    // incidents occur. Duplicate warnings would require
    // a separate incident-review workflow.
    addIssue({
      title,
      location,
      notes,
    })

    form.reset()

    setError('')
    setNotice(
      'Maintenance issue recorded locally with Open status.',
    )
  }

  function handleStatusChange(
    issueId: string,
    nextStatus: IssueStatus,
  ) {
    const issue = issues.find(
      (item) => item.id === issueId,
    )

    if (!issue) {
      setError('Issue could not be found.')
      return
    }

    if (issue.status === nextStatus) {
      return
    }

    updateIssueStatus(issueId, nextStatus)

    setError('')
    setNotice(
      `"${issue.title}" changed from ${issue.status} to ${nextStatus}.`,
    )
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-teal">
            Infrastructure monitoring
          </p>

          <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">
            Maintenance Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pine/70">
            Track hypothetical spring, pipeline, and
            storage infrastructure issues from reporting
            through resolution.
          </p>
        </div>

        <DemoBadge />
      </header>

      {/* SUMMARY CARDS */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Open Issues"
          value={String(summary.open)}
          subtitle="Awaiting action"
          icon={
            <AlertCircle className="size-5" />
          }
        />

        <SummaryCard
          label="In Progress"
          value={String(summary.inProgress)}
          subtitle="Repair underway"
          icon={
            <Wrench className="size-5" />
          }
        />

        <SummaryCard
          label="Resolved"
          value={String(summary.resolved)}
          subtitle="Marked complete"
          icon={
            <CheckCircle2 className="size-5" />
          }
        />

        <SummaryCard
          label="Resolution Rate"
          value={`${summary.resolutionRate.toFixed(1)}%`}
          subtitle={`${summary.resolved} of ${summary.total} issues`}
          icon={
            <Clock3 className="size-5" />
          }
        />
      </section>

      {/* NEW ISSUE FORM */}
      <section className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">
        <div>
          <h2 className="font-display text-xl">
            Report an infrastructure issue
          </h2>

          <p className="mt-2 text-sm text-pine/65">
            Add a simulated infrastructure issue.
            New issues begin with Open status.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <label className="text-sm font-medium">
            Issue Title

            <input
              name="title"
              type="text"
              required
              maxLength={100}
              placeholder="Leaking feeder pipe"
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal"
            />
          </label>

          <label className="text-sm font-medium">
            Location

            <input
              name="location"
              type="text"
              required
              maxLength={120}
              placeholder="Upper Spring intake"
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal"
            />
          </label>

          <label className="text-sm font-medium md:col-span-2">
            Description / Notes

            <textarea
              name="notes"
              rows={3}
              maxLength={500}
              placeholder="Describe the observed issue, possible impact, or repair requirement."
              className="mt-2 w-full rounded-xl border border-sage bg-ivory px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal"
            />
          </label>

          <div className="md:col-span-2">
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
              className="rounded-xl bg-pine px-6 py-3 text-sm font-semibold text-ivory transition hover:bg-teal"
            >
              <span className="inline-flex items-center gap-2">
                <Wrench className="size-4" />
                Report Issue
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* ISSUE HISTORY */}
      <section className="rounded-2xl border border-sage/60 bg-white/80 p-5 shadow-sm">

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">
              Maintenance Issue Board
            </h2>

            <p className="mt-2 text-sm text-pine/65">
              Showing {filteredIssues.length} of{' '}
              {summary.total} local demo issues.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="relative">
              <span className="sr-only">
                Search issues
              </span>

              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-pine/50" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search issues..."
                className="w-52 rounded-xl border border-sage bg-ivory py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-teal"
              />
            </label>

            <label>
              <span className="sr-only">
                Filter issue status
              </span>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as StatusFilter,
                  )
                }
                className="rounded-xl border border-sage bg-ivory px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal"
              >
                <option value="All">
                  All statuses
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
        </div>

        {issues.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={<Wrench className="size-6" />}
              title="No maintenance issues yet"
              description="Report a hypothetical issue above to begin tracking."
            />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="mt-5 rounded-xl bg-ivory p-8 text-center text-sm text-pine/65">
            No issues match the selected filters.
          </div>
        ) : (
          <ul className="mt-5 grid gap-4">
            {filteredIssues.map((issue) => (
              <li
                key={issue.id}
                className="rounded-2xl border border-sage/60 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-xl">
                        {issue.title}
                      </h3>

                      <StatusBadge
                        status={issue.status}
                      />
                    </div>

                    <p className="mt-3 flex items-center gap-2 text-sm text-pine/70">
                      <MapPin className="size-4 shrink-0 text-teal" />
                      {issue.location}
                    </p>

                    {issue.notes && (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-pine/80">
                        {issue.notes}
                      </p>
                    )}

                    <p className="mt-4 flex items-center gap-2 text-xs text-pine/55">
                      <CalendarDays className="size-3.5" />
                      Updated:{' '}
                      {new Date(
                        issue.updatedAt,
                      ).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-72">
                    {STATUSES.map((status) => {
                      const active =
                        issue.status === status

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              issue.id,
                              status,
                            )
                          }
                          aria-pressed={active}
                          className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                            active
                              ? 'bg-pine text-ivory'
                              : 'bg-ivory text-pine hover:bg-sage/50'
                          }`}
                        >
                          {status}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs leading-relaxed text-pine/60">
        Maintenance records are hypothetical and
        stored locally in this browser. Status changes
        are not verified repairs and do not represent
        field reports from Mangalpuri.
      </p>
    </div>
  )
}

// SUMMARY CARD
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
      <div className="flex items-center justify-between gap-3">
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

// STATUS BADGE
function StatusBadge({
  status,
}: {
  status: IssueStatus
}) {
  const styles: Record<IssueStatus, string> = {
    Open: 'bg-clay/20 text-pine',
    'In Progress': 'bg-sage/40 text-pine',
    Resolved: 'bg-teal/15 text-teal',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  )
}
