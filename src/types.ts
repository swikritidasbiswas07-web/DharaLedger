export type PageId =
  | 'overview'
  | 'jalnyay'
  | 'scenario'
  | 'turns'
  | 'maintenance'

export type Zone = 'Upper Spring' | 'Middle Terrace' | 'Lower Ward'

export type Household = {
  id: string
  zone: Zone
  occupancy: number
  dailyNeedLitres: number
}

export type SupplyInputs = {
  availableSpringWaterLitres: number
  usableStorageLitres: number
}

export type ScenarioId = 'normal' | 'low' | 'storage-failure'

export type ScenarioPreview = {
  id: ScenarioId
  name: string
  summary: string
  availableSpringWaterLitres: number
  usableStorageLitres: number
  householdCount: number
  notes: string[]
}

export type TurnStatus = 'Planned' | 'Delivered' | 'Shortfall'

export type TurnRecord = {
  id: string
  householdId: string
  date: string
  plannedLitres: number
  actualLitres: number
  status: TurnStatus
  notes: string
  createdAt: string
}

export type IssueStatus = 'Open' | 'In Progress' | 'Resolved'

export type MaintenanceIssue = {
  id: string
  title: string
  location: string
  notes: string
  status: IssueStatus
  createdAt: string
  updatedAt: string
}

export type DailyYieldPoint = {
  dateLabel: string
  litres: number
}
