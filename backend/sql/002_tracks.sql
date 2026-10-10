-- 002_tracks.sql
CREATE EXTENSION IF NOT EXISTS postgis;

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
