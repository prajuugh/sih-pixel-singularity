-- 004_maintenance.sql
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
