-- 005_requests.sql
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
