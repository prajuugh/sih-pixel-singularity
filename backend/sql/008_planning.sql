-- 008_planning.sql
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

CREATE INDEX IF NOT EXISTS idx_block_plans_plan_id ON block_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_blocks_track_id ON blocks(track_id);
CREATE INDEX IF NOT EXISTS idx_planning_alternatives_request_id ON planning_alternatives(request_id);
