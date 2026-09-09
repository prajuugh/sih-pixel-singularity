-- 006_trains.sql
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
CREATE INDEX IF NOT EXISTS idx_train_route_train_no ON train_route_segments(train_no);
