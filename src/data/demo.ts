import type {
  DailyYieldPoint,
  Household,
  ScenarioPreview,
  SupplyInputs,
  Zone,
} from '../types'

const ZONES: Zone[] = ['Upper Spring', 'Middle Terrace', 'Lower Ward']
const OCCUPANCY = [2, 3, 4, 5, 6]
const LITRES_PER_PERSON = [42, 45, 48, 50]

export const DEMO_HOUSEHOLDS: Household[] = Array.from({ length: 40 }, (_, index) => {
  const occupancy = OCCUPANCY[index % OCCUPANCY.length]
  const litresPerPerson = LITRES_PER_PERSON[index % LITRES_PER_PERSON.length]

  return {
    id: `H${String(index + 1).padStart(3, '0')}`,
    zone: ZONES[index % ZONES.length],
    occupancy,
    dailyNeedLitres: occupancy * litresPerPerson,
  }
})

export const DEFAULT_SUPPLY: SupplyInputs = {
  availableSpringWaterLitres: 8000,
  usableStorageLitres: 2000,
}

export const HYPOTHETICAL_WEEKLY_YIELD: DailyYieldPoint[] = [
  { dateLabel: '3 Oct', litres: 8200 },
  { dateLabel: '4 Oct', litres: 7900 },
  { dateLabel: '5 Oct', litres: 8100 },
  { dateLabel: '6 Oct', litres: 7600 },
  { dateLabel: '7 Oct', litres: 8400 },
  { dateLabel: '8 Oct', litres: 8000 },
  { dateLabel: '9 Oct', litres: 8000 },
]

export function totalHouseholdDemand(households: Household[]): number {
  return households.reduce((sum, household) => sum + household.dailyNeedLitres, 0)
}

export function createScenarioPreviews(householdCount: number): ScenarioPreview[] {
  return [
    {
      id: 'normal',
      name: 'Normal Supply',
      summary: 'Standard planning day using the demo spring yield and intact storage.',
      availableSpringWaterLitres: 8000,
      usableStorageLitres: 2000,
      householdCount,
      notes: [
        'Hypothetical spring yield held at 8,000 L for the planning day.',
        'Usable tank storage remains 2,000 L.',
        'All 40 demo household requirement rows stay in the input set.',
      ],
    },
    {
      id: 'low',
      name: 'Low Supply',
      summary: 'Drought-drill assumption with reduced spring yield and unchanged storage.',
      availableSpringWaterLitres: 4800,
      usableStorageLitres: 2000,
      householdCount,
      notes: [
        'Hypothetical spring yield reduced to 4,800 L.',
        'Usable storage is still assumed at 2,000 L.',
        'Household requirement rows are not recalculated here.',
      ],
    },
    {
      id: 'storage-failure',
      name: 'Storage Failure',
      summary: 'Tank or feeder storage is treated as unavailable for the planning day.',
      availableSpringWaterLitres: 8000,
      usableStorageLitres: 0,
      householdCount,
      notes: [
        'Hypothetical spring yield remains 8,000 L.',
        'Usable storage is set to 0 L for this drill.',
        'No allocation schedule is generated on this screen.',
      ],
    },
  ]
}

export function supplyConditionLabel(
  availableLitres: number,
  demandLitres: number,
): 'Normal' | 'Watch' {
  return availableLitres >= demandLitres ? 'Normal' : 'Watch'
}
