// backend/scripts/generateTrainSectionMapping.js
const fs = require("fs");
const path = require("path");

const SECTIONS_PATH = path.join(__dirname, "../data/normalized/track_sections.json");
const TRAIN_STOPS_PATH = path.join(__dirname, "../data/normalized/train_stops.json");
const TRAINS_PATH = path.join(__dirname, "../data/normalized/trains.json");
const OUTPUT_MAP_PATH = path.join(__dirname, "../data/normalized/section_schedules.json");

async function generateTrainSectionMapping() {
  console.log("=== Generating Train to Section Schedule Mapping ===");
  const sections = JSON.parse(fs.readFileSync(SECTIONS_PATH, "utf8"));
  const trainStops = JSON.parse(fs.readFileSync(TRAIN_STOPS_PATH, "utf8"));
  const trains = JSON.parse(fs.readFileSync(TRAINS_PATH, "utf8"));

  const trainMetaMap = new Map();
  trains.forEach((t) => trainMetaMap.set(t.train_no, t));

  console.log(`Matching ${sections.length} sections against ${Object.keys(trainStops).length} train timetables.`);

  // Build a lookup index for consecutive station pairs across all trains
  // Key: "FROM_TO" -> [ { train_no, entry_time, exit_time, day, sequence } ]
  const hopIndex = new Map();

  for (const [trainNo, stops] of Object.entries(trainStops)) {
    const meta = trainMetaMap.get(trainNo) || {};
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i + 1];
      if (!s1.station_code || !s2.station_code) continue;

      const keyForward = `${s1.station_code}_${s2.station_code}`;
      const entryTime = s1.departure_time || s1.arrival_time || "00:00";
      const exitTime = s2.arrival_time || s2.departure_time || entryTime;

      const scheduleEntry = {
        train_no: trainNo,
        train_name: meta.train_name || `Train ${trainNo}`,
        train_type: meta.train_type || "EXPRESS",
        source: meta.source_station || s1.station_code,
        destination: meta.destination_station || s2.station_code,
        priority: meta.train_type === "GOODS" ? 45 : 85,
        sequence: s1.sequence,
        day: s1.day,
        entry_time: entryTime,
        exit_time: exitTime,
        from_station: s1.station_code,
        from_station_name: s1.station_name,
        to_station: s2.station_code,
        to_station_name: s2.station_name,
      };

      if (!hopIndex.has(keyForward)) hopIndex.set(keyForward, []);
      hopIndex.get(keyForward).push(scheduleEntry);
    }
  }

  console.log(`Indexed ${hopIndex.size} distinct station hops across Indian Railways.`);

  // Map each section to its matching scheduled trains
  const sectionSchedules = {};
  let totalMappings = 0;

  for (const sec of sections) {
    const secId = sec.section_id;
    const legacyId = sec.legacy_track_id;
    const fromCode = sec.from_station;
    const toCode = sec.to_station;

    let matched = [];

    if (fromCode && toCode && fromCode !== "UNKNOWN" && toCode !== "UNKNOWN") {
      const fwd = hopIndex.get(`${fromCode}_${toCode}`) || [];
      const rev = hopIndex.get(`${toCode}_${fromCode}`) || [];
      matched = [...fwd, ...rev];
    }

    // Sort by entry time
    matched.sort((a, b) => a.entry_time.localeCompare(b.entry_time));

    const scheduleData = {
      section_id: secId,
      track_id: secId,
      legacy_track_id: legacyId,
      from_station: fromCode,
      from_station_name: sec.from_station_name,
      to_station: toCode,
      to_station_name: sec.to_station_name,
      distance_km: sec.distance_km,
      trainCount: matched.length,
      schedules: matched.map((m) => ({
        trainNo: m.train_no,
        trainName: m.train_name,
        type: m.train_type,
        source: m.source,
        destination: m.destination,
        priority: m.priority,
        day: m.day,
        arrival: m.entry_time,
        departure: m.exit_time,
        operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      })),
    };

    sectionSchedules[secId] = scheduleData;
    if (legacyId && legacyId !== secId) {
      sectionSchedules[legacyId] = scheduleData; // Alias for legacy lookup
    }
    totalMappings += matched.length;
  }

  fs.writeFileSync(OUTPUT_MAP_PATH, JSON.stringify(sectionSchedules, null, 2), "utf8");
  console.log(`✅ Saved section schedules to: ${OUTPUT_MAP_PATH}`);
  console.log(`Total scheduled train-section connections: ${totalMappings}`);

  return sectionSchedules;
}

if (require.main === module) {
  generateTrainSectionMapping().catch((err) => {
    console.error("Failed to generate train section mapping:", err);
    process.exit(1);
  });
}

module.exports = { generateTrainSectionMapping };
