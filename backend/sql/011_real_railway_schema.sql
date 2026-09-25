-- 011_real_railway_schema.sql
-- Production schema for Authentic Indian Railways data architecture

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. DATA SOURCES TRACKING
CREATE TABLE IF NOT EXISTS data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    publisher VARCHAR(255) NOT NULL,
    url TEXT,
    dataset_version VARCHAR(50),
    retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    notes TEXT
);

-- 2. OFFICIAL STATIONS
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(20) UNIQUE NOT NULL,
    station_name VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    zone VARCHAR(50),
    division VARCHAR(50),
    source VARCHAR(50) DEFAULT 'OGD_INDIA',
    source_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stations_code ON stations(station_code);
CREATE INDEX IF NOT EXISTS idx_stations_coords ON stations(latitude, longitude);

-- 3. REAL TRAINS
-- Note: Extends or creates official trains master
CREATE TABLE IF NOT EXISTS official_trains (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(50) UNIQUE NOT NULL,
    train_name VARCHAR(255) NOT NULL,
    source_station VARCHAR(20) REFERENCES stations(station_code),
    destination_station VARCHAR(20) REFERENCES stations(station_code),
    running_days VARCHAR(100) DEFAULT 'DAILY',
    train_type VARCHAR(50) DEFAULT 'EXPRESS',
    source VARCHAR(50) DEFAULT 'OGD_INDIA',
    source_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_official_trains_no ON official_trains(train_no);

-- 4. TIMETABLE TRAIN STOPS
CREATE TABLE IF NOT EXISTS train_stops (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(50) NOT NULL,
    station_code VARCHAR(20) NOT NULL,
    sequence INT NOT NULL,
    arrival_time TIME,
    departure_time TIME,
    day INT DEFAULT 1,
    distance_km NUMERIC(8, 2) DEFAULT 0.0,
    source VARCHAR(50) DEFAULT 'OGD_TIMETABLE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_train_stop UNIQUE (train_no, sequence)
);

CREATE INDEX IF NOT EXISTS idx_train_stops_train_no ON train_stops(train_no);
CREATE INDEX IF NOT EXISTS idx_train_stops_station ON train_stops(station_code);
CREATE INDEX IF NOT EXISTS idx_train_stops_seq ON train_stops(train_no, sequence);

-- 5. APPLICATION-LEVEL RAILWAY SECTIONS
CREATE TABLE IF NOT EXISTS track_sections (
    section_id VARCHAR(100) PRIMARY KEY, -- e.g. SEC-UBL-GDG
    from_station VARCHAR(20) NOT NULL,
    to_station VARCHAR(20) NOT NULL,
    distance_km NUMERIC(8, 2),
    geometry GEOMETRY(LineString, 4326),
    source VARCHAR(50) DEFAULT 'osm',
    source_id VARCHAR(100), -- OSM way/relation ID
    railway_asset_id VARCHAR(100) NULL, -- Reserved for official Indian Railways asset ID if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_track_sections_from ON track_sections(from_station);
CREATE INDEX IF NOT EXISTS idx_track_sections_to ON track_sections(to_station);
CREATE INDEX IF NOT EXISTS idx_track_sections_geom ON track_sections USING GIST(geometry);

-- 6. TRAIN TO SECTION SCHEDULE MAPPING
CREATE TABLE IF NOT EXISTS train_section_schedule (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(50) NOT NULL,
    section_id VARCHAR(100) REFERENCES track_sections(section_id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    scheduled_entry_time TIME NOT NULL,
    scheduled_exit_time TIME NOT NULL,
    day INT DEFAULT 1,
    source VARCHAR(50) DEFAULT 'OGD_DERIVED',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_train_section_seq UNIQUE (train_no, section_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_tss_section ON train_section_schedule(section_id);
CREATE INDEX IF NOT EXISTS idx_tss_train ON train_section_schedule(train_no);
CREATE INDEX IF NOT EXISTS idx_tss_times ON train_section_schedule(section_id, scheduled_entry_time, scheduled_exit_time);

-- 7. LIVE TRAIN POSITIONS
CREATE TABLE IF NOT EXISTS live_train_positions (
    id SERIAL PRIMARY KEY,
    train_no VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    speed NUMERIC(6, 2) DEFAULT 0.0,
    delay_minutes INT DEFAULT 0,
    current_station VARCHAR(50),
    next_station VARCHAR(50),
    status VARCHAR(50) DEFAULT 'RUNNING',
    matched_section_id VARCHAR(100) REFERENCES track_sections(section_id) ON DELETE SET NULL,
    distance_from_section_m NUMERIC(10, 2),
    confidence NUMERIC(5, 2),
    source VARCHAR(50) NOT NULL,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ltp_train_no ON live_train_positions(train_no);
CREATE INDEX IF NOT EXISTS idx_ltp_timestamp ON live_train_positions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ltp_section ON live_train_positions(matched_section_id);
