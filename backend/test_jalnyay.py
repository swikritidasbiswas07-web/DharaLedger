
import math

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def run_allocation(
    spring,
    storage,
    households,
    capacities=None,
):
    payload = {
        "availableSpringWaterLitres": spring,
        "usableStorageLitres": storage,
        "households": households,
    }

    if capacities is not None:
        payload["zoneCapacityLitres"] = capacities

    return client.post("/api/allocate", json=payload)


def household(id, zone, demand):
    return {
        "id": id,
        "zone": zone,
        "dailyNeedLitres": demand,
    }


def verify_constraints(data, capacities=None):
    """Check physical and household-level constraints."""

    allocations = data["allocations"]

    assert data["status"] == "optimal"

    total = sum(
        h["allocatedLitres"] for h in allocations
    )

    # Output quantities are rounded to 3 decimals.
    rounding_tolerance = len(allocations) * 0.001 + 0.01

    assert total <= (
        data["totalAvailableLitres"] + rounding_tolerance
    )

    assert math.isclose(
        total,
        data["totalAllocatedLitres"],
        abs_tol=rounding_tolerance,
    )

    for h in allocations:
        assert h["allocatedLitres"] >= -0.001

        assert h["allocatedLitres"] <= (
            h["requestedLitres"] + 0.001
        )

        assert h["unmetLitres"] >= -0.001

    if capacities is not None:
        for zone in data["zoneResults"]:
            if zone["zone"] in capacities:
                assert zone["allocatedLitres"] <= (
                    capacities[zone["zone"]] + rounding_tolerance
                )


def test_normal_supply():
    response = run_allocation(
        300,
        0,
        [
            household("H001", "Upper", 80),
            household("H002", "Lower", 120),
        ],
    )

    assert response.status_code == 200

    data = response.json()

    verify_constraints(data)

    assert data["totalAllocatedLitres"] == pytest.approx(200)
    assert data["unmetDemandLitres"] == pytest.approx(0)


def test_shortage_allocation():
    response = run_allocation(
        150,
        0,
        [
            household("H001", "Upper", 80),
            household("H002", "Lower", 120),
        ],
    )

    assert response.status_code == 200

    data = response.json()
    verify_constraints(data)

    values = {
        h["householdId"]: h["allocatedLitres"]
        for h in data["allocations"]
    }

    assert values["H001"] == pytest.approx(60)
    assert values["H002"] == pytest.approx(90)

    assert data["satisfactionRatio"] == pytest.approx(0.75)


def test_zone_capacity_limit():
    capacities = {
        "Upper": 50,
        "Lower": 120,
    }

    response = run_allocation(
        150,
        0,
        [
            household("H001", "Upper", 80),
            household("H002", "Lower", 120),
        ],
        capacities,
    )

    assert response.status_code == 200

    data = response.json()
    verify_constraints(data, capacities)

    assert data["totalAllocatedLitres"] == pytest.approx(150)

    values = {
        h["householdId"]: h["allocatedLitres"]
        for h in data["allocations"]
    }

    assert values["H001"] == pytest.approx(50)
    assert values["H002"] == pytest.approx(100)


def test_zero_water():
    response = run_allocation(
        0,
        0,
        [
            household("H001", "Upper", 100),
            household("H002", "Lower", 100),
        ],
    )

    assert response.status_code == 200

    data = response.json()
    verify_constraints(data)

    assert data["totalAllocatedLitres"] == pytest.approx(0)
    assert data["unmetDemandLitres"] == pytest.approx(200)
    assert data["satisfactionRatio"] == pytest.approx(0)


def test_zero_demand():
    response = run_allocation(
        200,
        0,
        [
            household("H001", "Upper", 0),
            household("H002", "Lower", 0),
        ],
    )

    assert response.status_code == 200

    data = response.json()
    verify_constraints(data)

    assert data["totalAllocatedLitres"] == pytest.approx(0)
    assert data["unmetDemandLitres"] == pytest.approx(0)


def test_pipeline_failure_leaves_water_unused():
    response = run_allocation(
        300,
        0,
        [
            household("H001", "Upper", 100),
            household("H002", "Lower", 100),
        ],
        {
            "Upper": 100,
            "Lower": 20,
        },
    )

    assert response.status_code == 200

    data = response.json()

    verify_constraints(
        data,
        {"Upper": 100, "Lower": 20},
    )

    assert data["totalAllocatedLitres"] == pytest.approx(120)
    assert data["unusedWaterLitres"] == pytest.approx(180)
    assert data["unmetDemandLitres"] == pytest.approx(80)


def test_minimum_fairness_guarantee():
    response = run_allocation(
        150,
        0,
        [
            household("H001", "Upper", 80),
            household("H002", "Lower", 120),
        ],
        {
            "Upper": 50,
            "Lower": 120,
        },
    )

    assert response.status_code == 200

    data = response.json()
    ratio = data["satisfactionRatio"]

    for h in data["allocations"]:
        if h["requestedLitres"] > 0:
            actual_ratio = (
                h["allocatedLitres"]
                / h["requestedLitres"]
            )

            assert actual_ratio >= ratio - 0.0001


def test_negative_supply_is_rejected():
    response = run_allocation(
        -100,
        0,
        [household("H001", "Upper", 100)],
    )

    assert response.status_code == 422


def test_duplicate_ids_are_rejected():
    response = run_allocation(
        200,
        0,
        [
            household("H001", "Upper", 100),
            household("H001", "Lower", 100),
        ],
    )

    assert response.status_code == 400


def test_unknown_zone_is_rejected():
    response = run_allocation(
        200,
        0,
        [household("H001", "Upper", 100)],
        {"Unknown Zone": 50},
    )

    assert response.status_code == 400


def test_negative_capacity_is_rejected():
    response = run_allocation(
        200,
        0,
        [household("H001", "Upper", 100)],
        {"Upper": -50},
    )

    assert response.status_code == 400

def test_surplus_is_shared_fairly():
    response = run_allocation(
        200,
        0,
        [
            household("H001", "Upper", 100),
            household("H002", "Middle", 100),
            household("H003", "Lower", 100),
        ],
        {
            "Upper": 50,
            "Middle": 100,
            "Lower": 100,
        },
    )

    assert response.status_code == 200

    data = response.json()

    values = {
        h["householdId"]: h["allocatedLitres"]
        for h in data["allocations"]
    }

    assert values["H001"] == pytest.approx(50)
    assert values["H002"] == pytest.approx(75)
    assert values["H003"] == pytest.approx(75)

    assert data["totalAllocatedLitres"] == pytest.approx(200)


def test_equal_needs_in_same_zone_receive_equal_water():
    response = run_allocation(
        150,
        0,
        [
            household("H001", "Upper", 100),
            household("H002", "Upper", 100),
            household("H003", "Lower", 100),
        ],
        {
            "Upper": 80,
            "Lower": 100,
        },
    )

    assert response.status_code == 200

    data = response.json()

    values = {
        h["householdId"]: h["allocatedLitres"]
        for h in data["allocations"]
    }

    assert values["H001"] == pytest.approx(
        values["H002"]
    )

    assert values["H001"] == pytest.approx(40)
    assert values["H003"] == pytest.approx(70)
