CREATE TABLE IF NOT EXISTS agent_runs (
    run_id VARCHAR(80) PRIMARY KEY,
    request_id VARCHAR(50) REFERENCES maintenance_requests(request_id) ON DELETE SET NULL,
    schema_version VARCHAR(20) NOT NULL,
    status VARCHAR(40) NOT NULL,
    verification_passed BOOLEAN NOT NULL DEFAULT FALSE,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS agent_steps (
    id BIGSERIAL PRIMARY KEY,
    run_id VARCHAR(80) NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL,
    agent VARCHAR(100) NOT NULL,
    status VARCHAR(40) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    implementation_version VARCHAR(100),
    input_artifact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_artifact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    UNIQUE (run_id, step_id)
);

CREATE TABLE IF NOT EXISTS constraint_results (
    id BIGSERIAL PRIMARY KEY,
    run_id VARCHAR(80) NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
    rule_id VARCHAR(120) NOT NULL,
    passed BOOLEAN NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_request_id ON agent_runs(request_id);
CREATE INDEX IF NOT EXISTS idx_agent_steps_run_id ON agent_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_constraint_results_run_id ON constraint_results(run_id);
