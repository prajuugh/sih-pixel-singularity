// backend/scripts/seed_data.js
const bcrypt = require("bcryptjs");

async function generateSeedData(tracksCount = 5461) {
  // 1. Password hashes
  const adminHash = await bcrypt.hash("admin123", 10);
  const officerHash = await bcrypt.hash("officer123", 10);
  const engHash = await bcrypt.hash("eng123", 10);
  const sntHash = await bcrypt.hash("snt123", 10);
  const trdHash = await bcrypt.hash("trd123", 10);

  const users = [
    { name: "System Admin", email: "admin@rbps.com", password_hash: adminHash, role: "ADMIN", department: null },
    { name: "Officer Sharma", email: "officer.sharma@rbps.com", password_hash: officerHash, role: "OFFICER", department: "Control" },
    { name: "Officer Patil", email: "officer.patil@rbps.com", password_hash: officerHash, role: "OFFICER", department: "Control" },
    { name: "Engineering Team Lead", email: "engineering@rbps.com", password_hash: engHash, role: "TEAMS", department: "Engineering" },
    { name: "Signal & Telecom Team", email: "signaltelecom@rbps.com", password_hash: sntHash, role: "TEAMS", department: "Signal & Telecom" },
    { name: "Traction Distribution Team", email: "traction@rbps.com", password_hash: trdHash, role: "TEAMS", department: "Traction Distribution" },
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
      status: i % 15 === 0 ? "MAINTENANCE_REQUIRED" : "OPERATIONAL",
    });
  }

  // 4. Maintenance Tasks (250 tasks from TMS, SMMS, TDMS)
  const sourceSystems = ["TMS", "SMMS", "TDMS"];
  const taskTypes = [
    "Rail Grinding", "Track Patrol", "Turnout Renewal", "Ballast Tamping",
    "OHE Inspection", "Cantilever Adjustment", "Tensioning Check",
    "Point Machine Inspection", "Signal Cable Replacement", "Track Circuit Testing", "Axle Counter Maintenance"
  ];

  const maintenanceTasks = [];
  for (let i = 1; i <= 250; i++) {
    const sourceSystem = sourceSystems[i % sourceSystems.length];
    const dept = sourceSystem === "TMS" ? "Engineering" : sourceSystem === "TDMS" ? "Traction Distribution" : "Signal & Telecom";
    const assetType = sourceSystem === "TMS" ? "TRACK" : sourceSystem === "TDMS" ? "OHE" : "SIGNAL";
    const trackNum = ((i * 19) % tracksCount) + 1;
    const trackId = `KA-T-${String(trackNum).padStart(6, "0")}`;
    const taskType = taskTypes[i % taskTypes.length];

    const dayOffset = (i % 20);
    const dueDate = new Date(2026, 8, 10 + dayOffset).toISOString().split("T")[0];

    maintenanceTasks.push({
      task_id: `${sourceSystem}-2026-${String(i).padStart(5, "0")}`,
      source_system: sourceSystem,
      department: dept,
      asset_type: assetType,
      track_id: trackId,
      task_type: taskType,
      description: `Preventive and corrective ${taskType} on segment ${trackId}`,
      criticality: 45 + ((i * 13) % 55),
      urgency: 40 + ((i * 7) % 60),
      failure_probability: 20 + ((i * 19) % 75),
      overdue_days: (i % 7 === 0) ? 12 : 0,
      due_date: dueDate,
      estimated_duration_minutes: 60 + ((i * 15) % 180), // 60-240 min
      required_block: true,
      status: i % 10 === 0 ? "COMPLETED" : i % 5 === 0 ? "SCHEDULED" : "PENDING",
    });
  }

  // 5. Maintenance Requests (Approved blocks for Officer Live Map)
  const maintenanceRequests = [
    {
      id: 1,
      request_id: "ENG-2026-00001",
      created_by: 3,
      department: "Engineering",
      asset_type: "TRACK",
      asset_condition: "Good",
      track_id: "KA-T-000342",
      track_ids: ["KA-T-000342"],
      task_type: "Track Tamping & Alignment",
      description: "Ballast packing and dynamic track stabilization",
      requested_date: "2026-09-15",
      from_date: "2026-09-15",
      to_date: "2026-09-15",
      preferred_start_time: "19:00",
      preferred_end_time: "21:00",
      estimated_duration_minutes: 120,
      required_block: true,
      status: "APPROVED",
      priority_score: 85,
      conflict: false,
      recommended_block: {
        date: "2026-09-15",
        startTime: "19:00",
        endTime: "21:00",
        trackId: "KA-T-000342",
        priorityScore: 85,
      },
      officer_feedback: "Approved by Section Engineer for 19:00-21:00 window",
      officer_id: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      request_id: "SIG-2026-00002",
      created_by: 4,
      department: "Signal & Telecom",
      asset_type: "SIGNAL",
      asset_condition: "Good",
      track_id: "KA-T-000100",
      track_ids: ["KA-T-000100"],
      task_type: "Point Machine & Interlocking Overhaul",
      description: "Dual motor point machine alignment & electronic relay testing",
      requested_date: "2026-09-15",
      from_date: "2026-09-15",
      to_date: "2026-09-15",
      preferred_start_time: "21:00",
      preferred_end_time: "22:30",
      estimated_duration_minutes: 90,
      required_block: true,
      status: "APPROVED",
      priority_score: 78,
      conflict: false,
      recommended_block: {
        date: "2026-09-15",
        startTime: "21:00",
        endTime: "22:30",
        trackId: "KA-T-000100",
        priorityScore: 78,
      },
      officer_feedback: "Approved by Divisional Signal Officer",
      officer_id: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      request_id: "TRD-2026-00003",
      created_by: 5,
      department: "Traction Distribution",
      asset_type: "OHE",
      asset_condition: "Good",
      track_id: "KA-T-000550",
      track_ids: ["KA-T-000550"],
      task_type: "OHE 25kV Cantilever & Wire Inspection",
      description: "Overhead catenary inspection and contact wire height calibration",
      requested_date: "2026-09-15",
      from_date: "2026-09-15",
      to_date: "2026-09-15",
      preferred_start_time: "22:30",
      preferred_end_time: "00:30",
      estimated_duration_minutes: 120,
      required_block: true,
      status: "APPROVED",
      priority_score: 92,
      conflict: false,
      recommended_block: {
        date: "2026-09-15",
        startTime: "22:30",
        endTime: "00:30",
        trackId: "KA-T-000550",
        priorityScore: 92,
      },
      officer_feedback: "Approved by Senior Divisional Electrical Engineer",
      officer_id: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];


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
