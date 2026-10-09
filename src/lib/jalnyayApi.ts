
export interface AllocationHousehold {
  id: string
  zone: string
  dailyNeedLitres: number
}

export interface AllocationRequest {
  availableSpringWaterLitres: number
  usableStorageLitres: number
  households: AllocationHousehold[]

  // Optional delivery capacities, in litres per day
  zoneCapacityLitres?: Record<string, number>
}

export interface HouseholdAllocation {
  householdId: string
  zone: string
  requestedLitres: number
  allocatedLitres: number
  unmetLitres: number
}

export interface ZoneAllocation {
  zone: string
  demandLitres: number
  allocatedLitres: number
  unmetLitres: number
  capacityLitres: number | null
}

export interface AllocationResult {
  status: string
  method: string
  totalAvailableLitres: number
  totalDemandLitres: number
  totalAllocatedLitres: number
  unmetDemandLitres: number
  unusedWaterLitres: number

  // Minimum guaranteed satisfaction fraction,
  // not necessarily overall demand satisfaction.
  satisfactionRatio: number

  allocations: HouseholdAllocation[]
  zoneResults: ZoneAllocation[]
}

// Development defaults to the local FastAPI server.
// Production reads the API URL configured in Vercel
// or .env.production.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:8000'
).replace(/\/+$/, '')

export async function runJalNyay(
  data: AllocationRequest,
): Promise<AllocationResult> {
  let response: Response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/allocate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      },
    )
  } catch {
    throw new Error(
      'Unable to connect to the JalNyay backend. Please check that the API service is running and accessible.',
    )
  }

  if (!response.ok) {
    let message =
      `JalNyay request failed: HTTP ${response.status}`

    try {
      const errorBody = await response.json()

      if (typeof errorBody.detail === 'string') {
        message = errorBody.detail
      }
    } catch {
      // Keep the HTTP error message.
    }

    throw new Error(message)
  }

  return (await response.json()) as AllocationResult
}
