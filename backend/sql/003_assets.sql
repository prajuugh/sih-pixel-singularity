-- 003_assets.sql
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
