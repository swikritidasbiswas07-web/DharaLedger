
from collections import defaultdict
from typing import Dict, List
import math

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy.optimize import linprog

app = FastAPI(
    title="DharaLedger - JalNyay API",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Household(BaseModel):
    id: str
    zone: str = "Unassigned"
    dailyNeedLitres: float = Field(
        ge=0, allow_inf_nan=False
    )


class AllocationRequest(BaseModel):
    availableSpringWaterLitres: float = Field(
        ge=0, allow_inf_nan=False
    )
    usableStorageLitres: float = Field(
        ge=0, allow_inf_nan=False
    )
    households: List[Household] = Field(
        min_length=1
    )
    zoneCapacityLitres: Dict[str, float] = Field(
        default_factory=dict
    )


@app.get("/")
def home():
    return {
        "message": "JalNyay API 3.0 is running",
        "solver": "SciPy HiGHS + progressive water filling",
    }


def fair_zone_allocation(
    zone_demands: dict,
    zone_caps: dict,
    available: float,
):
    """
    Progressive water filling.

    All zones initially receive the same fraction of
    their demand. A zone stops receiving additional
    water when its capacity is reached.

    Remaining water is distributed proportionally
    to demand among zones that can still receive it.

    Assumes independent delivery capacities for zones.
    """

    zones = list(zone_demands.keys())

    effective_caps = {
        z: min(zone_caps.get(z, math.inf), zone_demands[z])
        for z in zones
    }

    max_deliverable = sum(effective_caps.values())
    target = min(available, max_deliverable)

    if target <= 0:
        return {z: 0.0 for z in zones}

    if target >= max_deliverable:
        return effective_caps.copy()

    # Find the highest common proportional share
    # that does not exceed the available water.
    low = 0.0
    high = 1.0

    for _ in range(80):
        mid = (low + high) / 2

        required = sum(
            min(zone_demands[z] * mid, effective_caps[z])
            for z in zones
        )

        if required <= target:
            low = mid
        else:
            high = mid

    allocations = {
        z: min(zone_demands[z] * low, effective_caps[z])
        for z in zones
    }

    return allocations


@app.post("/api/allocate")
def allocate(request: AllocationRequest):

    households = request.households

    ids = [h.id for h in households]

    if len(ids) != len(set(ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate household IDs"
        )

    if any(
        not h.id.strip() or not h.zone.strip()
        for h in households
    ):
        raise HTTPException(
            status_code=400,
            detail="Household IDs and zones cannot be empty"
        )

    caps = request.zoneCapacityLitres

    if any(
        not math.isfinite(c) or c < 0
        for c in caps.values()
    ):
        raise HTTPException(
            status_code=400,
            detail="Zone capacities must be finite and nonnegative"
        )

    available = (
        request.availableSpringWaterLitres
        + request.usableStorageLitres
    )

    zone_demands = defaultdict(float)

    for h in households:
        zone_demands[h.zone] += h.dailyNeedLitres

    total_demand = sum(zone_demands.values())

    if (
        not math.isfinite(available)
        or not math.isfinite(total_demand)
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid total water volume"
        )

    unknown = set(caps) - set(zone_demands)

    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown zone(s): {sorted(unknown)}"
        )

    # STAGE 1:
    # SciPy calculates the greatest minimum
    # satisfaction share guaranteed to households.
    #
    # Zero-demand zones do not affect the result.

    if total_demand == 0:
        guaranteed_ratio = 1.0

    else:
        A = [[total_demand]]
        b = [available]

        for zone, cap in caps.items():
            A.append([zone_demands[zone]])
            b.append(cap)

        result = linprog(
            c=[-1.0],
            A_ub=A,
            b_ub=b,
            bounds=[(0, 1)],
            method="highs"
        )

        if not result.success:
            raise HTTPException(
                status_code=422,
                detail="Fairness optimisation failed"
            )

        guaranteed_ratio = max(
            0.0,
            min(1.0, float(result.x[0]))
        )

    # STAGE 2:
    # Progressively share remaining deliverable
    # water rather than arbitrarily favouring
    # households after the minimum is met.

    zone_allocations = fair_zone_allocation(
        zone_demands,
        caps,
        available
    )

    allocations = []

    for h in households:

        demand_in_zone = zone_demands[h.zone]

        zone_fraction = (
            zone_allocations[h.zone] / demand_in_zone
            if demand_in_zone > 0
            else 1.0
        )

        allocated = h.dailyNeedLitres * zone_fraction

        allocations.append({
            "householdId": h.id,
            "zone": h.zone,
            "requestedLitres": round(
                h.dailyNeedLitres, 3
            ),
            "allocatedLitres": round(allocated, 3),
            "unmetLitres": round(
                max(0.0, h.dailyNeedLitres - allocated),
                3
            ),
        })

    total_allocated = sum(zone_allocations.values())

    zone_results = []

    for zone, demand in zone_demands.items():
        allocated = zone_allocations[zone]

        zone_results.append({
            "zone": zone,
            "demandLitres": round(demand, 3),
            "allocatedLitres": round(allocated, 3),
            "unmetLitres": round(
                max(0.0, demand - allocated), 3
            ),
            "capacityLitres": caps.get(zone),
        })

    # Actual minimum satisfaction for households
    # with positive requirements.
    positive_ratios = [
        zone_allocations[h.zone] / zone_demands[h.zone]
        for h in households
        if h.dailyNeedLitres > 0
    ]

    actual_minimum = (
        min(positive_ratios)
        if positive_ratios
        else 1.0
    )

    return {
        "status": "optimal",
        "method": (
            "Progressive max-min fair allocation "
            "with independent zone constraints"
        ),
        "totalAvailableLitres": round(available, 3),
        "totalDemandLitres": round(total_demand, 3),
        "totalAllocatedLitres": round(total_allocated, 3),
        "unmetDemandLitres": round(
            max(0.0, total_demand - total_allocated), 3
        ),
        "unusedWaterLitres": round(
            max(0.0, available - total_allocated), 3
        ),
        "satisfactionRatio": round(
            min(guaranteed_ratio, actual_minimum), 6
        ),
        "allocations": allocations,
        "zoneResults": zone_results,
    }
