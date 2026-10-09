import type { MaintenanceIssue, TurnRecord } from '../types'

const TURN_KEY = 'dharaledger.demo.turns'
const ISSUE_KEY = 'dharaledger.demo.issues'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadTurnRecords(): TurnRecord[] {
  return readJson<TurnRecord[]>(TURN_KEY, [])
}

export function saveTurnRecords(records: TurnRecord[]): void {
  localStorage.setItem(TURN_KEY, JSON.stringify(records))
}

export function loadMaintenanceIssues(): MaintenanceIssue[] {
  return readJson<MaintenanceIssue[]>(ISSUE_KEY, [])
}

export function saveMaintenanceIssues(issues: MaintenanceIssue[]): void {
  localStorage.setItem(ISSUE_KEY, JSON.stringify(issues))
}
