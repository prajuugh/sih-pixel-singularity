-- ====================================================================
-- AUTOMATIC BLOCK PLANNING SYSTEM — COMPLETE SUPABASE SQL SCHEMA
-- Paste this script directly into Supabase SQL Editor and click RUN
-- ====================================================================

-- Enable PostGIS spatial extension (Supported natively by Supabase)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'OFFICER', 'TEAMS')),
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Tracks Table (PostGIS Geometry)
CREATE TABLE IF NOT EXISTS tracks (
    id SERIAL PRIMARY KEY,
    track_id VARCHAR(50) UNIQUE NOT NULL,
    osm_id VARCHAR(50),
    geometry GEOMETRY(LineString, 4326),
    railway VARCHAR(50) DEFAULT 'rail',
    gauge VARCHAR(50) DEFAULT 'broad',
    electrified VARCHAR(50) DEFAULT 'contact_line',
    frequency VARCHAR(50) DEFAULT '50',
    maxspeed INT DEFAULT 110,
    passenger_lines INT DEFAULT 2,
    usage VARCHAR(50) DEFAULT 'main',
    voltage VARCHAR(50) DEFAULT '25000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracks_track_id ON tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_geometry ON tracks USING GIST (geometry);

-- 3. Assets Table
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(50) UNIQUE NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('TRACK', 'OHE', 'SIGNAL', 'POINT_MACHINE', 'INTERLOCKING', 'TELECOM')),
    department VARCHAR(100) NOT NULL,
    track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    criticality INT DEFAULT 50 CHECK (criticality BETWEEN 0 AND 100),
    installation_date DATE,
    last_maintenance_date DATE,
    condition_score INT DEFAULT 80 CHECK (condition_score BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT 'OPERATIONAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_asset_id ON assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_track_id ON assets(track_id);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department);

-- 4. Maintenance Tasks Table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(50) UNIQUE NOT NULL,
    source_system VARCHAR(50) NOT NULL CHECK (source_system IN ('TMS', 'SMMS', 'TDMS', 'MANUAL')),
    department VARCHAR(100) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    description TEXT,
    criticality INT DEFAULT 50 CHECK (criticality BETWEEN 0 AND 100),
    urgency INT DEFAULT 50 CHECK (urgency BETWEEN 0 AND 100),
    failure_probability INT DEFAULT 30 CHECK (failure_probability BETWEEN 0 AND 100),
    overdue_days INT DEFAULT 0,
    due_date DATE,
    estimated_duration_minutes INT NOT NULL DEFAULT 60,
    required_block BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_task_id ON maintenance_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_track_id ON maintenance_tasks(track_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_tasks(status);

-- 5. Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    department VARCHAR(100) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    description TEXT,
    requested_date DATE NOT NULL,
    preferred_start_time TIME NOT NULL,
    preferred_end_time TIME NOT NULL,
    estimated_duration_minutes INT NOT NULL DEFAULT 60,
    required_block BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (
        status IN (
            'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 
            'REVISION_REQUIRED', 'RESUBMITTED', 'REJECTED', 
            'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'
        )
    ),
    officer_feedback TEXT,
    officer_id INT REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_requests_request_id ON maintenance_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_requests_track_id ON maintenance_requests(track_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON maintenance_requests(status);

-- 6. Trains & Relational Route Segments Table
CREATE TABLE IF NOT EXISTS trains (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(50) UNIQUE NOT NULL,
    train_name VARCHAR(255) NOT NULL,
    train_type VARCHAR(50) NOT NULL CHECK (train_type IN ('PASSENGER', 'EXPRESS', 'SUPERFAST', 'SPECIAL', 'GOODS')),
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    operating_days VARCHAR(100) DEFAULT 'DAILY',
    priority INT DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS train_route_segments (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(50) REFERENCES trains(train_no) ON DELETE CASCADE,
    track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    CONSTRAINT unique_train_segment UNIQUE (train_no, track_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_trains_train_no ON trains(train_no);
CREATE INDEX IF NOT EXISTS idx_train_route_track_id ON train_route_segments(track_id);

-- 7. Corridors, Availability & Goods Forecasts
CREATE TABLE IF NOT EXISTS corridors (
    id SERIAL PRIMARY KEY,
    corridor_id VARCHAR(50) UNIQUE NOT NULL,
    corridor_name VARCHAR(255) NOT NULL,
    division VARCHAR(100) DEFAULT 'SWR',
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS corridor_tracks (
    id SERIAL PRIMARY KEY,
    corridor_id VARCHAR(50) REFERENCES corridors(corridor_id) ON DELETE CASCADE,
    track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
    sequence INT NOT NULL
);

CREATE TABLE IF NOT EXISTS corridor_availability (
    id SERIAL PRIMARY KEY,
    availability_id VARCHAR(50) UNIQUE NOT NULL,
    corridor_id VARCHAR(50) REFERENCES corridors(corridor_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BLOCKED', 'RESTRICTED')),
    reason TEXT
);

CREATE TABLE IF NOT EXISTS goods_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_id VARCHAR(50) UNIQUE NOT NULL,
    track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
    corridor_id VARCHAR(50) REFERENCES corridors(corridor_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    expected_train_count INT DEFAULT 5,
    forecast_confidence INT DEFAULT 85,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Block Plans, Blocks, Alternatives & Reviews
CREATE TABLE IF NOT EXISTS block_plans (
    id SERIAL PRIMARY KEY,
    plan_id VARCHAR(50) UNIQUE NOT NULL,
    planning_date DATE NOT NULL,
    horizon VARCHAR(20) DEFAULT 'WEEKLY' CHECK (horizon IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    block_plan_id INT REFERENCES block_plans(id) ON DELETE CASCADE,
    track_id VARCHAR(50) REFERENCES tracks(track_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    priority_score INT DEFAULT 50,
    status VARCHAR(50) DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_tasks (
    id SERIAL PRIMARY KEY,
    block_id INT REFERENCES blocks(id) ON DELETE CASCADE,
    maintenance_task_id INT REFERENCES maintenance_tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS planning_alternatives (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
    block_id INT REFERENCES blocks(id) ON DELETE CASCADE,
    alternative_type VARCHAR(50) NOT NULL CHECK (alternative_type IN ('RESCHEDULE', 'REROUTE', 'DELAY')),
    description TEXT NOT NULL,
    feasible BOOLEAN DEFAULT TRUE,
    train_impact VARCHAR(255),
    delay_minutes INT DEFAULT 0,
    operational_cost NUMERIC(10, 2) DEFAULT 0.00,
    priority_score INT DEFAULT 50,
    rank INT DEFAULT 1,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_reviews (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(50) REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
    officer_id INT REFERENCES users(id) ON DELETE CASCADE,
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISION_REQUIRED')),
    feedback TEXT,
    alternative_id INT REFERENCES planning_alternatives(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disable Row Level Security (RLS) so Express backend can perform queries freely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE trains DISABLE ROW LEVEL SECURITY;
ALTER TABLE train_route_segments DISABLE ROW LEVEL SECURITY;
ALTER TABLE corridors DISABLE ROW LEVEL SECURITY;
ALTER TABLE corridor_tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE corridor_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE goods_forecasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE block_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE block_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE planning_alternatives DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
