
# DharaLedger
### From Springs to Water Security

**DharaLedger** is a community-oriented water allocation and infrastructure monitoring prototype designed for spring-dependent settlements.

The project explores how transparent, explainable mathematical allocation can help communities plan water distribution, assess supply disruptions, document actual deliveries, and track infrastructure maintenance.

Developed as a software prototype for **Hack-A-Throne National Hackathon 2026**, under the **Sustainability & Smart Cities** track.

> **Prototype disclosure:** DharaLedger currently uses synthetic household, supply, and infrastructure data. It has not been field-validated or deployed by a water-management authority.

---

## The Problem

Spring-dependent communities can face fluctuating water availability, uneven distribution, infrastructure losses, and limited visibility into actual household deliveries.

When water becomes scarce, deciding who receives how much becomes a difficult resource-allocation problem.

An effective planning system should be able to:

- Account for differing household water needs.
- Respect water delivery constraints across geographical zones.
- Avoid unnecessarily favouring one household or zone.
- Explain how shortages and allocations are calculated.
- Explore drought and infrastructure-failure scenarios.
- Compare planned water supply against actual delivery.
- Track infrastructure issues from reporting to resolution.

**DharaLedger brings these functions into one integrated prototype.**

## Core Modules

### 1. Overview Dashboard

Provides a consolidated view of the demonstration settlement, including household demand, supply information, and water-management indicators.

### 2. JalNyay 3.0 — Fair Water Allocation

JalNyay is DharaLedger's central allocation engine.

It calculates household water allocations using available water, household requirements, and optional zone-level delivery limits.

The engine includes:

- Demand-based proportional allocation.
- Progressive max-min fairness across zones.
- Household-level proportional sharing within each zone.
- Zone-specific delivery capacity constraints.
- Shortage and unmet-demand calculations.
- A reported minimum demand-satisfaction ratio.

#### Allocation formulation

For household \(i\):

- \(d_i\): daily water demand in litres.
- \(x_i\): allocated water in litres.

The allocation must satisfy:

\[
0 \le x_i \le d_i
\]

and:

\[
\sum_i x_i \le W
\]

where \(W\) is total available water, including the separately specified usable stored water.

When a zone \(z\) has a delivery capacity \(C_z\):

\[
\sum_{i \in z} x_i \le C_z
\]

The algorithm seeks a fair distribution of attainable demand-satisfaction ratios across zones, subject to available supply and applicable zone constraints.

Within a zone, allocated water is divided among households proportionally to their stated daily demands.

**Important:** The fairness model is a mathematical planning approach, not a substitute for community consultation, locally approved priorities, or field-verified water requirements.

### 3. Scenario Lab

Explores how allocation outcomes change under simulated supply disruptions.

Supported demonstration scenarios include:

- **Normal Conditions:** Baseline spring-water availability.
- **Drought:** Reduced spring discharge.
- **Pipeline Failure:** Restricted delivery capacity in an affected zone.

Scenario results help compare delivered volume, unmet demand, and fairness outcomes.

### 4. TurnTracker

Records planned and actual water deliveries for synthetic households.

Features include:

- Creating planned distribution turns.
- Updating a pending turn after delivery.
- Automatically identifying completed deliveries and shortfalls.
- Calculating shortages from completed distribution records.
- Monitoring completion statistics.
- Filtering records by distribution status.
- Flagging existing duplicate household-date entries.

Records are stored locally in the user's browser for demonstration purposes.

### 5. Maintenance Dashboard

Tracks hypothetical infrastructure incidents such as damaged feeder pipelines, leaking connections, and spring-intake problems.

Features include:

- Infrastructure issue reporting.
- Issue location and description.
- Open, In Progress, and Resolved statuses.
- Live issue summary statistics.
- Search and status filters.
- Browser-local record persistence.

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Backend | Python, FastAPI |
| Optimisation | SciPy |
| Backend testing | pytest |
| Demonstration persistence | Browser localStorage |
| API communication | HTTP / JSON |

## System Architecture

```text
                    DHARALEDGER
                         |
                 React + TypeScript
                         |
            +------------+------------+
            |            |            |
         Overview     Scenario      TurnTracker
         Dashboard      Lab              |
            |            |          localStorage
            |            |
         JalNyay --------+
            |
        REST API
            |
          FastAPI
            |
       SciPy Optimisation
            |
      Household Allocations

    Maintenance Dashboard
             |
         localStorage
```

The frontend communicates with the FastAPI allocation endpoint for JalNyay and scenario calculations.

TurnTracker and Maintenance use browser-local storage. They do not currently write to a shared backend database.

---

## Running Locally

### Prerequisites

- Node.js and npm
- Python 3.10 or newer
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/DharaLedger.git
cd DharaLedger
```

Replace `YOUR_USERNAME` with the repository owner's GitHub username.

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Create a Python virtual environment

From the project root:

**Windows PowerShell:**

```powershell
py -m venv backend/.venv
backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

**macOS / Linux:**

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
```

### 4. Start the FastAPI backend

**Windows PowerShell:**

```powershell
backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --reload --port 8000
```

**macOS / Linux:**

```bash
backend/.venv/bin/python -m uvicorn main:app --app-dir backend --reload --port 8000
```

Backend address:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

### 5. Start the frontend

Open a second terminal in the project root.

```bash
npm run dev
```

On Windows PowerShell, if `.ps1` execution is restricted:

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:5173
```

**Note:** The current frontend API configuration targets the local FastAPI server. A production deployment will require configuring the deployed backend address.

---

## Running Tests

The project includes automated tests for the JalNyay allocation API, covering normal supply, water shortages, zone capacity constraints, fairness, edge cases, and input validation.

From the project root on Windows:

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\test_jalnyay.py -v
```

On macOS / Linux:

```bash
backend/.venv/bin/python -m pytest backend/test_jalnyay.py -v
```

**Current verified backend result:** 13 tests passed during local development.

To check the frontend production build:

```bash
npm run build
```

On Windows PowerShell:

```powershell
npm.cmd run build
```

---

## Demonstration Data and Limitations

DharaLedger is currently a prototype, not a production water-distribution system.

- Household data and water demands are synthetic.
- Infrastructure incidents and delivery records are demonstrations.
- Spring-discharge values are not based on verified live sensors.
- Browser-local records are not synchronised across devices.
- No authentication, community approval workflow, or central database is implemented.
- The allocation model assumes the specified demands, supplies, and zone capacities are valid inputs.
- Actual deployment would require hydrological assessment, community engagement, operational validation, and data-protection safeguards.

The system should not be used to make real-world water distribution decisions without appropriate validation and oversight.

---

## Future Development

Potential improvements include:

- Field-verified spring-discharge and household-demand datasets.
- Secure authentication and role-based access.
- Shared database storage.
- Community-approved allocation policies.
- Time-based pipeline and distribution scheduling.
- Historical water availability and consumption analytics.
- Integration with sensor or manually verified measurement data.
- Audit logs for record corrections.
- Mobile-first and low-connectivity deployment support.

---

## Project Status

**Software MVP:** Feature-complete in local development.

**Core modules:** Overview, JalNyay 3.0, Scenario Lab, TurnTracker, and Maintenance.

**Current stage:** Repository preparation, public deployment, and hackathon demonstration.

---

## Author

**Swikriti Das Biswas**
Undergraduate, Department of Chemical Engineering
Jadavpur University, Kolkata

---

*DharaLedger — From Springs to Water Security.*
