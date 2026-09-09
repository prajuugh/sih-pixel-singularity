# Walkthrough — Automatic Block Planning System Backend

We have successfully constructed and verified the complete **Backend System** for the Automatic Block Planning System (Karnataka Geography), strictly fulfilling all specifications in the Backend PRD without changing any existing frontend code.

---

## Key Achievements

### 1. PostgreSQL + PostGIS Schema & Migrations (`backend/sql/`)
- Enabled PostGIS extension for spatial LineString track geometries (`SRID 4326`).
- Created 9 core SQL migrations:
  - `001_users.sql`: User authentication & RBAC roles (`ADMIN`, `OFFICER`, `TEAMS`).
  - `002_tracks.sql`: Track table with application-owned `track_id` (`KA-T-000001` to `KA-T-005461`).
  - `003_assets.sql`: Assets across Track, OHE, Signal, Point Machine, Interlocking, Telecom.
  - `004_maintenance.sql`: Maintenance tasks from TMS, SMMS, TDMS.
  - `005_requests.sql`: Frontend maintenance requests and full lifecycle state machine (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REVISION_REQUIRED`, `RESUBMITTED`, `REJECTED`, `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`).
  - `006_trains.sql`: Trains and relational `train_route_segments` table for track timetable mapping.
  - `007_corridors.sql`: Corridors, corridor availability slots, and Goods train forecasts.
  - `008_planning.sql`: Block plans (`DAILY`, `WEEKLY`, `MONTHLY`), blocks, block_tasks (multi-department grouping), planning_alternatives (`RESCHEDULE`, `REROUTE`, `DELAY`), and request_reviews.
  - `009_audit.sql`: Audit logs tracking action history.

### 2. Track Importer & Domain Data Seeder (`backend/scripts/`)
- `import_tracks.js`: Generated **5,461 GeoJSON LineString track segments** for Karnataka state geography.
- `seed_data.js`: Populated 400 assets, 250 maintenance tasks, 45 trains, 1,711 route segments, 350 goods forecasts, 10 key Karnataka corridors, and 520 corridor availability slots.
- `init_db.js`: Automated migration runner with PostgreSQL connection pool & spatial data fallback store.

### 3. Node.js Express REST API Layer (`backend/src/`)
- Auth endpoints: `POST /api/auth/login`, `GET /api/auth/me`.
- Track endpoints: `GET /api/tracks`, `GET /api/tracks/:trackId`, `GET /api/tracks/:trackId/traffic`, `GET /api/tracks/:trackId/maintenance`.
- Maintenance request endpoints: `POST /api/requests`, `GET /api/requests`, `GET /api/requests/:requestId`, `POST /api/requests/:requestId/submit`, `POST /api/requests/:requestId/review` (Officer only).
- Maintenance task & conflict check endpoints: `GET /api/maintenance`, `POST /api/maintenance/check`.
- Train & Route endpoints: `GET /api/trains`, `GET /api/trains/:trainNo`, `GET /api/trains/:trainNo/route`.
- Corridor endpoints: `GET /api/corridors`, `GET /api/corridors/:corridorId`.
- Block Planning endpoints: `POST /api/planning/weekly`, `POST /api/planning/monthly`, `GET /api/planning/:planId`, `GET /api/planning/:planId/blocks`, `GET /api/planning/:planId/alternatives`.

### 4. Python 4-Agent Optimization Service (`backend/agent-service/`)
- **Orchestrator Agent**: Manages multi-agent workflow.
- **Maintenance Agent**: Normalizes multi-department tasks and asset condition.
- **Traffic Agent**: Detects track occupancy conflicts (`train.arrival < maintenance.end AND train.departure > maintenance.start`), processes Goods forecasts, and computes graph detours via `networkx`.
- **Block Planner Agent**:
  - MCDA priority scoring (Safety 20%, Criticality 20%, Urgency 15%, Overdue 15%, Failure Prob 10%, Asset Avail 10%, Train Impact 10%).
  - Multi-department task grouping into single common blocks.
  - Alternatives generation: `RESCHEDULE`, `REROUTE`, and `DELAY`.
  - Enforces deterministic safety constraints and generates natural language explainability.

---

## Verification Results

Executed `node scripts/test_backend.js` automated test suite:
- 5,461 Karnataka track segments loaded cleanly.
- 400 assets, 250 maintenance tasks, 45 trains, 1,711 route segments, 350 goods forecasts, 10 corridors, 520 availability slots verified.
- **Test 1 (No conflict)**: Night slot `03:00-04:30` on `KA-T-000342` returned `safe: true`.
- **Test 2 (Passenger train conflict)**: Evening slot `19:00-20:00` on `KA-T-000342` correctly identified `12627 Karnataka Express` passage (19:15-19:22).
- **Request State Machine & Officer Review**: Transitioned request `ENG-2026-00006` from `SUBMITTED` to `REVISION_REQUIRED` with feedback recorded.
- **Planning & Alternatives**: Generated block plan with `RESCHEDULE`, `DELAY`, and `REROUTE` alternatives.
- **Test Suite Result**: **23 PASSED, 0 FAILED**.

---

## How to Run

### Start Express REST API Server:
```bash
cd backend
npm run dev
```

### Start Python Agent Microservice:
```bash
cd backend/agent-service
python main.py
```

### Run Test Suite:
```bash
cd backend
npm test
```
