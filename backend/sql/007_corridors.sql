-- 007_corridors.sql
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

CREATE INDEX IF NOT EXISTS idx_corridor_id ON corridors(corridor_id);
CREATE INDEX IF NOT EXISTS idx_corridor_availability_date ON corridor_availability(date);
CREATE INDEX IF NOT EXISTS idx_goods_forecasts_date ON goods_forecasts(date);
