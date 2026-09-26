// backend/scripts/seed_data.js
const bcrypt = require("bcryptjs");

async function generateSeedData(tracksCount = 5461) {
  // 1. Password hashes
  const adminHash = await bcrypt.hash("admin123", 10);

  const users = [
    { id: 1, username: "admin", name: "System Admin", email: "admin@rbps.com", password_hash: adminHash, role: "ADMIN", department: null },
  ];

  // 2. Corridors (10 major Karnataka corridors)
  const corridors = [
    { corridor_id: "COR-KA-001", corridor_name: "Bengaluru (SBC) - Mysuru (MYS) Double Line", division: "SBC", description: "High density electrified passenger corridor" },
    { corridor_id: "COR-KA-002", corridor_name: "Bengaluru (YPR) - Hubballi (UBL) Trunk Line", division: "UBL", description: "Major arterial north-south Karnataka corridor" },
    { corridor_id: "COR-KA-003", corridor_name: "Hubballi (UBL) - Belagavi (BGM) Line", division: "UBL", description: "Freight and passenger connector line" },
    { corridor_id: "COR-KA-004", corridor_name: "Bengaluru (SBC) - Jolarpettai (JTJ) Trunk", division: "SBC", description: "Chennai-bound high speed mainline" },
    { corridor_id: "COR-KA-005", corridor_name: "Hassan (HAS) - Mangaluru (MAQ) Ghat Section", division: "MYS", description: "Sakleshpur Subrahmanya ghat freight & passenger route" },
    { corridor_id: "COR-KA-006", corridor_name: "Bengaluru (YPR) - Guntakal (GTL) Line", division: "SBC", description: "Delhi/Hyderabad northbound corridor" },
    { corridor_id: "COR-KA-007", corridor_name: "Ballari (BAY) - Hosapete (HPT) Mining Freight Section", division: "UBL", description: "Heavy iron-ore freight corridor" },
    { corridor_id: "COR-KA-008", corridor_name: "Wadi (WADI) - Kalaburagi (KLBG) Line", division: "SUR", description: "Electrified main line linking Mumbai-Chennai" },
    { corridor_id: "COR-KA-009", corridor_name: "Arsikere (ASK) - Birur (RRB) Junction", division: "MYS", description: "Central Karnataka connecting node" },
    { corridor_id: "COR-KA-010", corridor_name: "Mangaluru (MAJN) - Karwar Konkan Railway Section", division: "KR", description: "Coastal Konkan trunk section" },
  ];

  // 3. Assets (400 assets)
  const assetTypes = ["TRACK", "OHE", "SIGNAL", "POINT_MACHINE", "INTERLOCKING", "TELECOM"];
  const assetDepts = {
    TRACK: "Engineering",
    OHE: "Traction Distribution",
    SIGNAL: "Signal & Telecom",
    POINT_MACHINE: "Signal & Telecom",
    INTERLOCKING: "Signal & Telecom",
    TELECOM: "Signal & Telecom",
  };

  const assets = [];
  for (let i = 1; i <= 400; i++) {
    const assetType = assetTypes[i % assetTypes.length];
    const trackNum = ((i * 13) % tracksCount) + 1;
    const trackId = `KA-T-${String(trackNum).padStart(6, "0")}`;
    const department = assetDepts[assetType];

    assets.push({
      asset_id: `AST-${String(i).padStart(5, "0")}`,
      asset_type: assetType,
      department,
      track_id: trackId,
      asset_name: `${department} ${assetType} Unit #${i}`,
      criticality: 40 + ((i * 11) % 60), // 40-100
      installation_date: "2018-04-15",
      last_maintenance_date: "2026-03-10",
      condition_score: 30 + ((i * 17) % 70), // 30-100
      status: "OPERATIONAL",
    });
  }

  // 4. Maintenance Tasks (250 tasks from TMS, SMMS, TDMS)
  const sourceSystems = ["TMS", "SMMS", "TDMS"];
  const taskTypes = [
    "Rail Grinding", "Track Patrol", "Turnout Renewal", "Ballast Tamping",
    "OHE Inspection", "Cantilever Adjustment", "Tensioning Check",
    "Point Machine Inspection", "Signal Cable Replacement", "Track Circuit Testing", "Axle Counter Maintenance"
  ];

  // 4. Maintenance Tasks (Clean start - 0 test tasks)
  const maintenanceTasks = [];

  // 5. Maintenance Requests (Cleared - ready for fresh operational planning)
  const maintenanceRequests = [];


  // 6. Real-World Trains & Continuous Route Segments
  const { REAL_WORLD_TRAIN_FLEET } = require("../src/services/schedule.service");
  const trains = [];
  const trainMap = new Map();

  for (const t of REAL_WORLD_TRAIN_FLEET) {
    if (!trainMap.has(t.trainNo)) {
      trainMap.set(t.trainNo, true);
      trains.push({
        train_no: t.trainNo,
        train_name: t.trainName,
        train_type: t.type,
        source: t.source,
        destination: t.destination,
        priority: t.priority,
      });
    }
  }

  // Ensure minimum 50 trains for PRD & test suite
  for (let i = trains.length + 1; i <= 60; i++) {
    const isFreight = i % 4 === 0;
    const tNo = isFreight ? `G-FREIGHT-${100 + i}` : `${12100 + i * 13}`;
    trains.push({
      train_no: tNo,
      train_name: isFreight ? `Goods Heavy Freight #${i}` : `Superfast Express #${i}`,
      train_type: isFreight ? "GOODS" : "EXPRESS",
      source: "SBC Bengaluru",
      destination: "UBL Hubballi",
      priority: isFreight ? 45 : 82,
    });
  }

  // 2,500+ train route segments across Karnataka network
  const trainRouteSegments = [];
  trains.forEach((t, tIdx) => {
    const startTrackNum = (tIdx * 89) % 5000 + 1;
    const baseHour = (tIdx * 2 + 5) % 24;
    const spanCount = 42;

    for (let seq = 1; seq <= spanCount; seq++) {
      const trackId = `KA-T-${String(startTrackNum + seq).padStart(6, "0")}`;
      const startMinutes = (baseHour * 60 + seq * 6) % 1440;
      const endMinutes = (startMinutes + (t.train_type === "GOODS" ? 9 : 6)) % 1440;

      const arrH = String(Math.floor(startMinutes / 60)).padStart(2, "0");
      const arrM = String(startMinutes % 60).padStart(2, "0");
      const depH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const depM = String(endMinutes % 60).padStart(2, "0");

      trainRouteSegments.push({
        train_no: t.train_no,
        track_id: trackId,
        sequence: seq,
        arrival_time: `${arrH}:${arrM}`,
        departure_time: `${depH}:${depM}`,
      });
    }
  });

  // Specifically add conflict test segment for KA-T-000342 (19:15 - 19:22)
  trainRouteSegments.push({
    train_no: "12627",
    track_id: "KA-T-000342",
    sequence: 15,
    arrival_time: "19:15",
    departure_time: "19:22",
  });

  // 7. Goods Forecasts (350 records)
  const goodsForecasts = [];
  for (let i = 1; i <= 350; i++) {
    const trackNum = ((i * 17) % tracksCount) + 1;
    const trackId = `KA-T-${String(trackNum).padStart(6, "0")}`;
    const corridorId = corridors[i % corridors.length].corridor_id;
    const dayOffset = i % 14;
    const date = new Date(2026, 8, 10 + dayOffset).toISOString().split("T")[0];

    goodsForecasts.push({
      forecast_id: `GF-2026-${String(i).padStart(5, "0")}`,
      track_id: trackId,
      corridor_id: corridorId,
      date,
      expected_train_count: 4 + (i % 8),
      forecast_confidence: 75 + (i % 20),
      start_time: "00:00",
      end_time: "06:00",
    });
  }

  // 8. Corridor Availability (500+ slots)
  const corridorAvailability = [];
  for (let i = 1; i <= 520; i++) {
    const corridorId = corridors[i % corridors.length].corridor_id;
    const dayOffset = i % 14;
    const date = new Date(2026, 8, 10 + dayOffset).toISOString().split("T")[0];
    const isNight = i % 3 === 0;

    corridorAvailability.push({
      availability_id: `CA-2026-${String(i).padStart(5, "0")}`,
      corridor_id: corridorId,
      date,
      start_time: isNight ? "01:00" : "11:00",
      end_time: isNight ? "04:30" : "13:00",
      status: i % 12 === 0 ? "RESTRICTED" : i % 25 === 0 ? "BLOCKED" : "AVAILABLE",
      reason: isNight ? "Scheduled maintenance window" : "Regular traffic corridor slot",
    });
  }

  return {
    users,
    corridors,
    assets,
    maintenanceTasks,
    maintenanceRequests,
    trains,
    trainRouteSegments,
    goodsForecasts,
    corridorAvailability,
  };
}

module.exports = { generateSeedData };
