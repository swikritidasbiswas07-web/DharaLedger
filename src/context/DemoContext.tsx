
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  DEFAULT_SUPPLY,
  DEMO_HOUSEHOLDS,
  totalHouseholdDemand,
} from '../data/demo'

import { createRecordId } from '../lib/format'

import {
  loadMaintenanceIssues,
  loadTurnRecords,
  saveMaintenanceIssues,
  saveTurnRecords,
} from '../lib/storage'

import type {
  Household,
  IssueStatus,
  MaintenanceIssue,
  SupplyInputs,
  TurnRecord,
} from '../types'

type TurnUpdate = Pick<
  TurnRecord,
  'status' | 'actualLitres'
>

type DemoContextValue = {
  households: Household[]
  supply: SupplyInputs
  totalDemandLitres: number
  turns: TurnRecord[]
  issues: MaintenanceIssue[]

  updateSupply: (next: SupplyInputs) => void

  updateHouseholdNeed: (
    householdId: string,
    dailyNeedLitres: number,
  ) => void

  addTurn: (
    record: Omit<TurnRecord, 'id' | 'createdAt'>,
  ) => void

  // New: update an existing distribution turn.
  updateTurn: (
    turnId: string,
    changes: TurnUpdate,
  ) => void

  addIssue: (
    issue: Pick<
      MaintenanceIssue,
      'title' | 'location' | 'notes'
    >,
  ) => void

  updateIssueStatus: (
    issueId: string,
    status: IssueStatus,
  ) => void
}

const DemoContext =
  createContext<DemoContextValue | null>(null)

export function DemoProvider({
  children,
}: {
  children: ReactNode
}) {
  const [households, setHouseholds] =
    useState<Household[]>(DEMO_HOUSEHOLDS)

  const [supply, setSupply] =
    useState<SupplyInputs>(DEFAULT_SUPPLY)

  const [turns, setTurns] = useState<TurnRecord[]>(
    () => loadTurnRecords(),
  )

  const [issues, setIssues] =
    useState<MaintenanceIssue[]>(
      () => loadMaintenanceIssues(),
    )

  // Persist distribution records locally.
  useEffect(() => {
    saveTurnRecords(turns)
  }, [turns])

  // Persist maintenance records locally.
  useEffect(() => {
    saveMaintenanceIssues(issues)
  }, [issues])

  const totalDemandLitres = useMemo(
    () => totalHouseholdDemand(households),
    [households],
  )

  const updateSupply = useCallback(
    (next: SupplyInputs) => {
      setSupply(next)
    },
    [],
  )

  const updateHouseholdNeed = useCallback(
    (
      householdId: string,
      dailyNeedLitres: number,
    ) => {
      setHouseholds((current) =>
        current.map((household) =>
          household.id === householdId
            ? { ...household, dailyNeedLitres }
            : household,
        ),
      )
    },
    [],
  )

  const addTurn = useCallback(
    (
      record: Omit<
        TurnRecord,
        'id' | 'createdAt'
      >,
    ) => {
      setTurns((current) => [
        {
          ...record,
          id: createRecordId('TURN'),
          createdAt: new Date().toISOString(),
        },
        ...current,
      ])
    },
    [],
  )

  // NEW: Change a planned turn into a completed turn.
  // The existing record keeps its original ID and date.
  const updateTurn = useCallback(
    (
      turnId: string,
      changes: TurnUpdate,
    ) => {
      setTurns((current) =>
        current.map((turn) => {
          if (
            turn.id !== turnId ||
            turn.status !== 'Planned'
          ) {
            return turn
          }

          // Defensive check: never store invalid
          // or negative delivered quantities.
          if (
            !Number.isFinite(changes.actualLitres) ||
            changes.actualLitres < 0
          ) {
            return turn
          }

          if (
            changes.status !== 'Delivered' &&
            changes.status !== 'Shortfall'
          ) {
            return turn
          }

          const calculatedStatus =
            changes.actualLitres < turn.plannedLitres
              ? 'Shortfall'
              : 'Delivered'

          // Save the calculated status rather than
          // trusting an inconsistent supplied status.
          return {
            ...turn,
            actualLitres: changes.actualLitres,
            status: calculatedStatus,
          }
        }),
      )
    },
    [],
  )

  const addIssue = useCallback(
    (
      issue: Pick<
        MaintenanceIssue,
        'title' | 'location' | 'notes'
      >,
    ) => {
      const now = new Date().toISOString()

      setIssues((current) => [
        {
          ...issue,
          id: createRecordId('ISSUE'),
          status: 'Open',
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ])
    },
    [],
  )

  const updateIssueStatus = useCallback(
    (
      issueId: string,
      status: IssueStatus,
    ) => {
      const now = new Date().toISOString()

      setIssues((current) =>
        current.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                status,
                updatedAt: now,
              }
            : issue,
        ),
      )
    },
    [],
  )

  const value = useMemo(
    () => ({
      households,
      supply,
      totalDemandLitres,
      turns,
      issues,
      updateSupply,
      updateHouseholdNeed,
      addTurn,
      updateTurn,
      addIssue,
      updateIssueStatus,
    }),
    [
      households,
      supply,
      totalDemandLitres,
      turns,
      issues,
      updateSupply,
      updateHouseholdNeed,
      addTurn,
      updateTurn,
      addIssue,
      updateIssueStatus,
    ],
  )

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  const context = useContext(DemoContext)

  if (!context) {
    throw new Error(
      'useDemo must be used within DemoProvider',
    )
  }

  return context
}
