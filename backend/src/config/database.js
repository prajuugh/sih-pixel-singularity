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

// Initialize Supabase Client SDK if SUPABASE_URL and a key are provided
let supabase = null;
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
if (
  SUPABASE_URL &&
  SUPABASE_URL !== "https://your-project-ref.supabase.co" &&
  supabaseKey
) {
  supabase = createClient(SUPABASE_URL, supabaseKey);
  console.log(`⚡ Supabase Client initialized with endpoint: ${SUPABASE_URL}`);
}

// PostgreSQL / Supabase Connection Pool configuration
let pgConfig = null;
if (DATABASE_URL) {
  pgConfig = {
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  };
} else if (PGHOST) {
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
  users: [],
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
      if (!useFallbackStore) {
        console.warn(`PostgreSQL/Supabase pool connection attempt (${err.message}). Using active memory store.`);
        useFallbackStore = true;
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

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query,
  supabase,
  fallbackStore,
  getPool,
};
