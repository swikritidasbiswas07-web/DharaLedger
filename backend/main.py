
import os
import math
from collections import defaultdict
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy.optimize import linprog


# ============================================================
# DHARALEDGER — JALNYAY API 3.0
# Fair, explainable spring-water allocation engine
# ============================================================

app = FastAPI(
    title="DharaLedger - JalNyay API",
    description=(
        "Explainable, progressive max-min fair water "
        "allocation for synthetic spring-dependent communities."
    ),
    version="3.0",
)


# ============================================================
# CORS CONFIGURATION
# Supports local development and deployed Vercel frontend
# ============================================================

local_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Example Render environment variable:
#
# CORS_ORIGINS=https://dharaledger.vercel.app
#
# Multiple origins can be separated by commas.
# Use the real Vercel domain assigned to your project.

production_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

allowed_origins = list(
    dict.fromkeys(local_origins + production_origins)
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class Household(BaseModel):
    id: str
    zone: str = "Unassigned"

    dailyNeedLitres: float = Field(
        ge=0,
        allow_inf_nan=False,
    )


class AllocationRequest(BaseModel):
    availableSpringWaterLitres: float = Field(
        ge=0,
        allow_inf_nan=False,
    )

    usableStorageLitres: float = Field(
        ge=0,
        allow_inf_nan=False,
    )

    households: List[Household] = Field(
        min_length=1,
    )

    zoneCapacityLitres: Dict[str, float] = Field(
        default_factory=dict,
    )


# ============================================================
# API HEALTH CHECK
# ============================================================

@app.get("/")
def home():
    return {
        "message": "JalNyay API 3.0 is running",
        "solver": "SciPy HiGHS + progressive water filling",
        "project": "DharaLedger",
        "status": "online",
    }


# ============================================================
# FAIR ZONE ALLOCATION
# Progressive proportional water filling
# ============================================================

def fair_zone_allocation(
    zone_demands: dict,
    zone_caps: dict,
    available: float,
):
    """
    Progressively allocate available water across zones.

    Each zone initially receives the same fraction of
    its total demand.

    A zone stops receiving additional water when its
    capacity is reached.

    Remaining water is progressively shared among
    zones that can still receive it.

    Assumption:
        Zone capacity constraints are independent.
    """

    zones = list(zone_demands.keys())

    effective_caps = {
        zone: min(
            zone_caps.get(zone, math.inf),
            zone_demands[zone],
        )
        for zone in zones
    }

    max_deliverable = sum(
        effective_caps.values()
    )

    target = min(
        available,
        max_deliverable,
    )

    if target <= 0:
        return {
            zone: 0.0
            for zone in zones
        }

    if target >= max_deliverable:
        return effective_caps.copy()

    low = 0.0
    high = 1.0

    # Binary search for the largest common
    # proportional satisfaction share.
    for _ in range(80):
        mid = (low + high) / 2

        required = sum(
            min(
                zone_demands[zone] * mid,
                effective_caps[zone],
            )
            for zone in zones
        )

        if required <= target:
            low = mid
        else:
            high = mid

    allocations = {
        zone: min(
            zone_demands[zone] * low,
            effective_caps[zone],
        )
        for zone in zones
    }

    return allocations


# ============================================================
# JALNYAY 3.0 ALLOCATION ENDPOINT
# ============================================================

@app.post("/api/allocate")
def allocate(request: AllocationRequest):

    households = request.households

    # --------------------------------------------------------
    # 1. VALIDATE HOUSEHOLDS
    # --------------------------------------------------------

    ids = [
        household.id
        for household in households
    ]

    if len(ids) != len(set(ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate household IDs",
        )

    if any(
        not household.id.strip()
        or not household.zone.strip()
        for household in households
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Household IDs and zones cannot be empty"
            ),
        )

    # --------------------------------------------------------
    # 2. VALIDATE ZONE CAPACITIES
    # --------------------------------------------------------

    caps = request.zoneCapacityLitres

    if any(
        not math.isfinite(capacity)
        or capacity < 0
        for capacity in caps.values()
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Zone capacities must be finite "
                "and nonnegative"
            ),
        )

    # --------------------------------------------------------
    # 3. CALCULATE AVAILABLE WATER
    # --------------------------------------------------------

    available = (
        request.availableSpringWaterLitres
        + request.usableStorageLitres
    )

    # Storage represents additional usable water.
    # It should not duplicate spring volume.

    zone_demands = defaultdict(float)

    for household in households:
        zone_demands[
            household.zone
        ] += household.dailyNeedLitres

    total_demand = sum(
        zone_demands.values()
    )

    if (
        not math.isfinite(available)
        or not math.isfinite(total_demand)
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid total water volume",
        )

    # --------------------------------------------------------
    # 4. CHECK UNKNOWN ZONES
    # --------------------------------------------------------

    unknown = (
        set(caps)
        - set(zone_demands)
    )

    if unknown:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unknown zone(s): {sorted(unknown)}"
            ),
        )

    # ========================================================
    # STAGE 1 — OPTIMISE MINIMUM SATISFACTION RATIO
    # ========================================================

    if total_demand == 0:
        guaranteed_ratio = 1.0

    else:
        A = [[total_demand]]
        b = [available]

        for zone, capacity in caps.items():
            A.append([
                zone_demands[zone]
            ])
            b.append(capacity)

        result = linprog(
            c=[-1.0],
            A_ub=A,
            b_ub=b,
            bounds=[(0, 1)],
            method="highs",
        )

        if not result.success:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Fairness optimisation failed"
                ),
            )

        guaranteed_ratio = max(
            0.0,
            min(
                1.0,
                float(result.x[0]),
            ),
        )

    # ========================================================
    # STAGE 2 — PROGRESSIVE MAX-MIN FAIR WATER SHARING
    # ========================================================

    zone_allocations = fair_zone_allocation(
        zone_demands,
        caps,
        available,
    )

    # --------------------------------------------------------
    # 5. DISTRIBUTE EACH ZONE'S WATER TO HOUSEHOLDS
    # --------------------------------------------------------

    allocations = []

    for household in households:

        demand_in_zone = zone_demands[
            household.zone
        ]

        zone_fraction = (
            zone_allocations[
                household.zone
            ] / demand_in_zone
            if demand_in_zone > 0
            else 1.0
        )

        allocated = (
            household.dailyNeedLitres
            * zone_fraction
        )

        allocations.append({
            "householdId": household.id,
            "zone": household.zone,
            "requestedLitres": round(
                household.dailyNeedLitres,
                3,
            ),
            "allocatedLitres": round(
                allocated,
                3,
            ),
            "unmetLitres": round(
                max(
                    0.0,
                    household.dailyNeedLitres - allocated,
                ),
                3,
            ),
        })

    # --------------------------------------------------------
    # 6. CALCULATE OVERALL WATER ALLOCATION
    # --------------------------------------------------------

    total_allocated = sum(
        zone_allocations.values()
    )

    # --------------------------------------------------------
    # 7. CALCULATE ZONE-WISE RESULTS
    # --------------------------------------------------------

    zone_results = []

    for zone, demand in zone_demands.items():

        allocated = zone_allocations[
            zone
        ]

        zone_results.append({
            "zone": zone,
            "demandLitres": round(
                demand,
                3,
            ),
            "allocatedLitres": round(
                allocated,
                3,
            ),
            "unmetLitres": round(
                max(
                    0.0,
                    demand - allocated,
                ),
                3,
            ),
            "capacityLitres": caps.get(
                zone
            ),
        })

    # --------------------------------------------------------
    # 8. CALCULATE ACTUAL MINIMUM SATISFACTION
    # --------------------------------------------------------

    positive_ratios = [
        zone_allocations[
            household.zone
        ] / zone_demands[
            household.zone
        ]
        for household in households
        if household.dailyNeedLitres > 0
    ]

    actual_minimum = (
        min(positive_ratios)
        if positive_ratios
        else 1.0
    )

    # ========================================================
    # FINAL API RESPONSE
    # ========================================================

    return {
        "status": "optimal",

        "method": (
            "Progressive max-min fair allocation "
            "with independent zone constraints"
        ),

        "totalAvailableLitres": round(
            available,
            3,
        ),

        "totalDemandLitres": round(
            total_demand,
            3,
        ),

        "totalAllocatedLitres": round(
            total_allocated,
            3,
        ),

        "unmetDemandLitres": round(
            max(
                0.0,
                total_demand - total_allocated,
            ),
            3,
        ),

        "unusedWaterLitres": round(
            max(
                0.0,
                available - total_allocated,
            ),
            3,
        ),

        "satisfactionRatio": round(
            min(
                guaranteed_ratio,
                actual_minimum,
            ),
            6,
        ),

        "allocations": allocations,

        "zoneResults": zone_results,
    }
