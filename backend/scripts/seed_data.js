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

  // 5. Maintenance Requests (submitted through frontend)
  const maintenanceRequests = [
    {
      request_id: "SMMS-2026-00782",
      created_by: 5,
      department: "Signal & Telecom",
      asset_type: "POINT_MACHINE",
      track_id: "KA-T-000342",
      task_type: "Point Machine Inspection",
      description: "Preventive inspection of point machine operation.",
      requested_date: "2026-09-11",
      preferred_start_time: "01:00",
      preferred_end_time: "02:30",
      estimated_duration_minutes: 90,
      required_block: true,
      status: "SUBMITTED",
      officer_feedback: "Request is under AI conflict evaluation.",
      submitted_at: "2026-09-10T14:32:00Z",
    },
    {
      request_id: "TMS-2026-00124",
      created_by: 4,
      department: "Engineering",
      asset_type: "TRACK",
      track_id: "KA-T-000100",
      task_type: "Rail Grinding",
      description: "Track surface grinding for defect removal.",
      requested_date: "2026-09-12",
      preferred_start_time: "10:30",
      preferred_end_time: "12:30",
      estimated_duration_minutes: 120,
      required_block: true,
      status: "UNDER_REVIEW",
      officer_feedback: "Pending sign-off from officer on duty.",
      submitted_at: "2026-09-09T09:10:00Z",
    },
    {
      request_id: "TMS-2026-00128",
      created_by: 4,
      department: "Engineering",
      asset_type: "TRACK",
      track_id: "KA-T-000342",
      task_type: "Track Maintenance",
      description: "Routine track maintenance work.",
      requested_date: "2026-09-14",
      preferred_start_time: "23:00",
      preferred_end_time: "01:00",
      estimated_duration_minutes: 120,
      required_block: true,
      status: "APPROVED",
      officer_feedback: "Approved for night maintenance window.",
      submitted_at: "2026-09-08T11:00:00Z",
    },
    {
      request_id: "SMMS-2026-00098",
      created_by: 5,
      department: "Signal & Telecom",
      asset_type: "SIGNAL",
      track_id: "KA-T-000500",
      task_type: "Signal Cable Replacement",
      description: "Replacement of damaged signal cables.",
      requested_date: "2026-09-18",
      preferred_start_time: "02:00",
      preferred_end_time: "04:00",
      estimated_duration_minutes: 120,
      required_block: true,
      status: "SUBMITTED",
      officer_feedback: null,
      submitted_at: "2026-09-07T11:20:00Z",
    },
    {
      request_id: "TDMS-2026-00131",
      created_by: 6,
      department: "Traction Distribution",
      asset_type: "OHE",
      track_id: "KA-T-000342",
      task_type: "OHE Maintenance",
      description: "Inspection and maintenance of OHE equipment.",
      requested_date: "2026-09-11",
      preferred_start_time: "01:15",
      preferred_end_time: "02:45",
      estimated_duration_minutes: 90,
      required_block: true,
      status: "SUBMITTED",
      officer_feedback: "Multi-department candidate for combined block.",
      submitted_at: "2026-09-10T15:00:00Z",
    },
  ];

  // 6. Trains (45 trains) & Route Segments (1,600+ route segments)
  const trainTypes = ["EXPRESS", "SUPERFAST", "PASSENGER", "GOODS", "SPECIAL"];
  const trains = [
    { train_no: "12627", train_name: "Karnataka Express", train_type: "SUPERFAST", source: "SBC Bengaluru", destination: "NDLS New Delhi", priority: 95 },
    { train_no: "12007", train_name: "Shatabdi Express", train_type: "SUPERFAST", source: "MAS Chennai", destination: "MYS Mysuru", priority: 98 },
    { train_no: "16591", train_name: "Hampi Express", train_type: "EXPRESS", source: "UBL Hubballi", destination: "MYS Mysuru", priority: 80 },
    { train_no: "12725", train_name: "Siddhaganga Intercity", train_type: "EXPRESS", source: "SBC Bengaluru", destination: "DWR Dharwad", priority: 85 },
    { train_no: "16589", train_name: "Rani Chennamma Express", train_type: "EXPRESS", source: "SBC Bengaluru", destination: "MRJ Miraj", priority: 88 },
    { train_no: "16515", train_name: "Karwar Express", train_type: "EXPRESS", source: "YPR Yesvantpur", destination: "KAWR Karwar", priority: 75 },
    { train_no: "56913", train_name: "Bengaluru - Hubballi Passenger", train_type: "PASSENGER", source: "SBC Bengaluru", destination: "UBL Hubballi", priority: 60 },
    { train_no: "G-BOXN-401", train_name: "Iron Ore Freight Special", train_type: "GOODS", source: "BAY Ballari", destination: "MAQ Mangaluru", priority: 40 },
    { train_no: "G-BCN-204", train_name: "Foodgrain Container Express", train_type: "GOODS", source: "UBL Hubballi", destination: "SBC Bengaluru", priority: 45 },
    { train_no: "G-POL-108", train_name: "Petroleum Tanker rake", train_type: "GOODS", source: "MAQ Mangaluru", destination: "KLBG Kalaburagi", priority: 50 },
  ];

  // Add more generated trains up to 45
  for (let i = 11; i <= 45; i++) {
    const tType = trainTypes[i % trainTypes.length];
    const isFreight = tType === "GOODS";
    const tNo = isFreight ? `G-FREIGHT-${100 + i}` : `${12000 + i * 11}`;
    const tName = isFreight ? `Goods Freight Cargo #${i}` : `Express Passenger #${i}`;
    trains.push({
      train_no: tNo,
      train_name: tName,
      train_type: tType,
      source: "SBC Bengaluru",
      destination: "UBL Hubballi",
      priority: isFreight ? 35 + (i % 20) : 70 + (i % 25),
    });
  }

  // 1,600+ train_route_segments
  const trainRouteSegments = [];
  trains.forEach((t) => {
    // Each train spans ~35 to 40 consecutive track segments
    const startTrackNum = (parseInt(t.train_no.replace(/\D/g, "") || "100") * 7) % 5000 + 1;
    for (let seq = 1; seq <= 38; seq++) {
      const trackId = `KA-T-${String(startTrackNum + seq).padStart(6, "0")}`;
      // Calculate times in HH:MM format
      const startMinutes = (18 * 60 + seq * 8) % (24 * 60); // Starts around 18:00
      const endMinutes = (startMinutes + 7) % (24 * 60);

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
