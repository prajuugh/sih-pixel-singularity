// backend/src/config/database.js
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
dotenv.config();

const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  PGHOST,
  PGPORT,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
} = process.env;
const LOCAL_STORE_ONLY = process.env.LOCAL_STORE_ONLY === "true";

// Initialize Supabase Client SDK safely if configured
let supabase = null;
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
if (
  !LOCAL_STORE_ONLY &&
  SUPABASE_URL &&
  SUPABASE_URL !== "https://your-project-ref.supabase.co" &&
  supabaseKey
) {
  try {
    supabase = createClient(SUPABASE_URL, supabaseKey, { auth: { persistSession: false } });
    console.log(`⚡ Supabase Client initialized with endpoint: ${SUPABASE_URL}`);
  } catch (err) {
    console.warn("Supabase JS SDK init skipped (using direct PostgreSQL pg pool):", err.message);
  }
}

// PostgreSQL / Supabase Connection Pool configuration
let pgConfig = null;
if (!LOCAL_STORE_ONLY && DATABASE_URL) {
  pgConfig = {
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  };
} else if (!LOCAL_STORE_ONLY && PGHOST) {
  pgConfig = {
    host: PGHOST,
    port: parseInt(PGPORT || "5432"),
    database: PGDATABASE || "rbps_db",
    user: PGUSER || "postgres",
    password: PGPASSWORD || "postgres",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
  };
}

let pool = null;
let useFallbackStore = false;

// Embedded Data Store fallback for standalone / offline development
const fallbackStore = {
  users: [
    { id: 1, username: "admin", name: "System Admin", email: "admin@rbps.com", password_hash: "admin123", role: "ADMIN", department: null },
  ],
  tracks: [],
  assets: [],
  maintenance_tasks: [],
  maintenance_requests: [],
  trains: [],
  train_route_segments: [],
  corridors: [],
  corridor_tracks: [],
  corridor_availability: [],
  goods_forecasts: [],
  block_plans: [],
  blocks: [],
  block_tasks: [],
  planning_alternatives: [],
  request_reviews: [],
  audit_logs: [],
  agent_runs: [],
  agent_steps: [],
  constraint_results: [],
  stations: [],
  track_sections: [],
  train_stops: [],
  train_section_schedule: [],
  live_train_positions: [],
  data_sources: [
    { name: "OGD_INDIA_STATIONS", publisher: "Ministry of Railways / OGD India", status: "ACTIVE" },
    { name: "OGD_INDIA_TRAINS", publisher: "Ministry of Railways / OGD India", status: "ACTIVE" },
    { name: "OPENSTREETMAP_RAILWAYS", publisher: "OpenStreetMap Contributors", status: "ACTIVE" },
  ],
};

function getPool() {
  if (!pool && !useFallbackStore && pgConfig) {
    try {
      pool = new Pool(pgConfig);
      pool.on("error", (err) => {
        console.warn("PostgreSQL/Supabase pool connection error:", err.message);
      });
    } catch (err) {
      useFallbackStore = true;
    }
  }
  return pool;
}

// Unified query runner: supports Supabase PostgreSQL connection pool, Supabase JS client, and embedded fallback
async function query(text, params = []) {
  if (!useFallbackStore && pgConfig) {
    try {
      const activePool = getPool();
      if (activePool) {
        const res = await activePool.query(text, params);
        return res;
      }
    } catch (err) {
      console.warn(`PostgreSQL query notice: ${err.message}`);
      // Only switch to offline memory store if the database network connection failed
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND" || err.code === "ETIMEDOUT") {
        if (!useFallbackStore) {
          console.warn(`PostgreSQL/Supabase connection failed (${err.message}). Using active memory store.`);
          useFallbackStore = true;
        }
      } else {
        throw err;
      }
    }
  }

  // Query against fallback memory store
  return queryFallback(text, params);
}

function queryFallback(text, params = []) {
  const sql = text.trim().toUpperCase();

  if (sql.includes("FROM TRACKS")) {
    let results = [...fallbackStore.tracks];
    if (sql.includes("WHERE TRACK_ID =")) {
      const trackId = params[0];
      results = results.filter((t) => t.track_id === trackId);
    }
    if (sql.includes("LIMIT")) {
      const limitMatch = text.match(/LIMIT\s+(\$?\d+|\d+)/i);
      const limitVal = limitMatch
        ? (limitMatch[1].startsWith("$") ? parseInt(params[parseInt(limitMatch[1].slice(1)) - 1]) : parseInt(limitMatch[1]))
        : 100;
      results = results.slice(0, limitVal);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("FROM USERS")) {
    let results = [...fallbackStore.users];
    if (sql.includes("WHERE EMAIL =")) {
      const email = params[0];
      results = results.filter((u) => u.email === email);
    }
    if (sql.includes("WHERE ID =")) {
      const id = parseInt(params[0]);
      results = results.filter((u) => u.id === id);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("FROM ASSETS")) {
    let results = [...fallbackStore.assets];
    if (sql.includes("WHERE TRACK_ID =")) {
      const trackId = params[0];
      results = results.filter((a) => a.track_id === trackId);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("FROM MAINTENANCE_REQUESTS")) {
    let results = [...fallbackStore.maintenance_requests];
    if (sql.includes("WHERE REQUEST_ID =")) {
      const reqId = params[0];
      results = results.filter((r) => r.request_id === reqId);
    } else if (sql.includes("WHERE TRACK_ID =")) {
      const trackId = params[0];
      results = results.filter((r) => r.track_id === trackId);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("INSERT INTO MAINTENANCE_REQUESTS")) {
    const newReq = {
      id: fallbackStore.maintenance_requests.length + 1,
      request_id: params[0],
      created_by: params[1],
      department: params[2],
      asset_type: params[3],
      track_id: params[4],
      task_type: params[5],
      description: params[6],
      requested_date: params[7],
      preferred_start_time: params[8],
      preferred_end_time: params[9],
      estimated_duration_minutes: params[10] || 60,
      required_block: params[11] !== undefined ? params[11] : true,
      status: params[12] || "SUBMITTED",
      officer_feedback: params[13] || null,
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    fallbackStore.maintenance_requests.push(newReq);
    return { rows: [newReq], rowCount: 1 };
  }

  if (sql.includes("UPDATE MAINTENANCE_REQUESTS")) {
    const reqId = params[params.length - 1];
    const req = fallbackStore.maintenance_requests.find((r) => r.request_id === reqId);
    if (req) {
      if (sql.includes("STATUS =")) req.status = params[0];
      if (sql.includes("OFFICER_FEEDBACK =")) req.officer_feedback = params[1];
      if (sql.includes("OFFICER_ID =")) req.officer_id = params[2];
      req.reviewed_at = new Date().toISOString();
      req.updated_at = new Date().toISOString();
      return { rows: [req], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  if (sql.includes("FROM TRAINS")) {
    return { rows: fallbackStore.trains, rowCount: fallbackStore.trains.length };
  }
  if (sql.includes("FROM TRAIN_ROUTE_SEGMENTS")) {
    let results = [...fallbackStore.train_route_segments];
    if (sql.includes("WHERE TRACK_ID =")) {
      const trackId = params[0];
      results = results.filter((s) => s.track_id === trackId);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("FROM CORRIDORS")) {
    return { rows: fallbackStore.corridors, rowCount: fallbackStore.corridors.length };
  }
  if (sql.includes("FROM CORRIDOR_AVAILABILITY")) {
    let results = [...fallbackStore.corridor_availability];
    if (sql.includes("WHERE CORRIDOR_ID =")) {
      results = results.filter((c) => c.corridor_id === params[0]);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("FROM STATIONS")) {
    let results = [...fallbackStore.stations];
    if (sql.includes("WHERE STATION_CODE =")) {
      const code = String(params[0]).toUpperCase();
      results = results.filter((s) => s.station_code === code);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("FROM TRACK_SECTIONS")) {
    let results = [...fallbackStore.track_sections];
    if (sql.includes("WHERE SECTION_ID =") || sql.includes("WHERE TRACK_ID =")) {
      const id = String(params[0]).toUpperCase();
      results = results.filter((s) => s.section_id === id || s.track_id === id || s.legacy_track_id === id);
    }
    return { rows: results, rowCount: results.length };
  }

  if (sql.includes("FROM LIVE_TRAIN_POSITIONS")) {
    return { rows: fallbackStore.live_train_positions, rowCount: fallbackStore.live_train_positions.length };
  }

  if (sql.includes("FROM DATA_SOURCES")) {
    return { rows: fallbackStore.data_sources, rowCount: fallbackStore.data_sources.length };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  supabase,
  fallbackStore,
  getPool,
};
