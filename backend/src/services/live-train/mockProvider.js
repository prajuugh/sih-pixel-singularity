// backend/src/services/live-train/mockProvider.js
const fs = require("fs");
const path = require("path");
const { LiveTrainProvider } = require("./liveTrainProvider");
const { matchPointToSection } = require("../section-matching.service");

const TRAINS_GEOM_PATH = path.join(__dirname, "../../../data/normalized/trains_geometry.json");
const TRAIN_STOPS_PATH = path.join(__dirname, "../../../data/normalized/train_stops.json");
const STATIONS_PATH = path.join(__dirname, "../../../data/normalized/stations.json");

// Dedicated Pan-India fleet representing major trunk corridors across all of India
const PAN_INDIA_ACTIVE_FLEET = [
  // Western / Northern Corridors
  { trainNo: "12951", trainName: "Mumbai Central - New Delhi Rajdhani Express", type: "RAJDHANI", baseDelay: 4, speed: 125 },
  { trainNo: "12953", trainName: "August Kranti Rajdhani Express", type: "RAJDHANI", baseDelay: 8, speed: 120 },
  { trainNo: "12009", trainName: "Mumbai Central - Ahmedabad Shatabdi", type: "SHATABDI", baseDelay: 0, speed: 115 },
  { trainNo: "20901", trainName: "Mumbai Central - Gandhinagar Vande Bharat", type: "VANDE BHARAT", baseDelay: 0, speed: 130 },
  { trainNo: "12137", trainName: "Punjab Mail (Mumbai CST - Firozpur)", type: "SUPERFAST", baseDelay: 14, speed: 95 },
  { trainNo: "12903", trainName: "Golden Temple Mail", type: "SUPERFAST", baseDelay: 10, speed: 90 },

  // Eastern / Northern Corridors
  { trainNo: "12301", trainName: "Howrah - New Delhi Rajdhani Express", type: "RAJDHANI", baseDelay: 10, speed: 125 },
  { trainNo: "12259", trainName: "Sealdah - New Delhi AC Duronto Express", type: "DURONTO", baseDelay: 5, speed: 120 },
  { trainNo: "22436", trainName: "New Delhi - Varanasi Vande Bharat Express", type: "VANDE BHARAT", baseDelay: 0, speed: 130 },
  { trainNo: "12801", trainName: "Purushottam Express (Puri - New Delhi)", type: "SUPERFAST", baseDelay: 16, speed: 90 },
  { trainNo: "12004", trainName: "New Delhi - Lucknow Shatabdi Express", type: "SHATABDI", baseDelay: 2, speed: 110 },

  // Southern / Central / Karnataka Corridors
  { trainNo: "12627", trainName: "Karnataka Express (Bengaluru - New Delhi)", type: "SUPERFAST", baseDelay: 12, speed: 105 },
  { trainNo: "22691", trainName: "Bengaluru - Hazrat Nizamuddin Rajdhani", type: "RAJDHANI", baseDelay: 6, speed: 125 },
  { trainNo: "12007", trainName: "Chennai - Mysuru Shatabdi Express", type: "SHATABDI", baseDelay: 0, speed: 110 },
  { trainNo: "12615", trainName: "Grand Trunk (GT) Express (Chennai - Delhi)", type: "SUPERFAST", baseDelay: 18, speed: 95 },
  { trainNo: "12621", trainName: "Tamil Nadu Express (Chennai - New Delhi)", type: "SUPERFAST", baseDelay: 9, speed: 100 },
  { trainNo: "16589", trainName: "Rani Chennamma Express (SBC - Miraj)", type: "SUPERFAST", baseDelay: 15, speed: 85 },
  { trainNo: "12725", trainName: "Siddhaganga Intercity Express (SBC - DWR)", type: "INTERCITY", baseDelay: 4, speed: 90 },
  { trainNo: "20671", trainName: "Kalaburagi Vande Bharat Express", type: "VANDE BHARAT", baseDelay: 0, speed: 130 },
  { trainNo: "16591", trainName: "Hampi Express (Mysuru - Hubballi)", type: "EXPRESS", baseDelay: 7, speed: 75 },
  { trainNo: "16595", trainName: "Panchaganga Express (SBC - Karwar)", type: "SUPERFAST", baseDelay: 12, speed: 80 },
  { trainNo: "16535", trainName: "Gol Gumbaz Express (MYS - Pandharpur)", type: "EXPRESS", baseDelay: 20, speed: 70 },
  { trainNo: "16515", trainName: "Karwar Express via Hassan", type: "EXPRESS", baseDelay: 8, speed: 65 },

  // Northeast / East Coast / Central Cross Corridors
  { trainNo: "12423", trainName: "Dibrugarh - New Delhi Rajdhani Express", type: "RAJDHANI", baseDelay: 22, speed: 110 },
  { trainNo: "12505", trainName: "North East Express (Kamakhya - Delhi)", type: "EXPRESS", baseDelay: 25, speed: 85 },
  { trainNo: "12859", trainName: "Gitanjali Express (Mumbai CST - Howrah)", type: "SUPERFAST", baseDelay: 15, speed: 95 },
  { trainNo: "12723", trainName: "Telangana Express (Hyderabad - New Delhi)", type: "SUPERFAST", baseDelay: 11, speed: 100 },
  { trainNo: "12163", trainName: "Mumbai LTT - Chennai Central Express", type: "SUPERFAST", baseDelay: 13, speed: 90 },
  { trainNo: "20833", trainName: "Visakhapatnam - Secunderabad Vande Bharat", type: "VANDE BHARAT", baseDelay: 0, speed: 130 },

  // Dedicated Freight Corridors
  { trainNo: "G-BOXN-401", trainName: "Ballari Iron Ore Heavy Freight", type: "GOODS", baseDelay: 35, speed: 55 },
  { trainNo: "G-BCN-204", trainName: "Whitefield Container Cargo Freight", type: "GOODS", baseDelay: 25, speed: 60 },
  { trainNo: "G-CONT-801", trainName: "Western DFC Container Superfreight", type: "GOODS", baseDelay: 10, speed: 75 },
  { trainNo: "G-COAL-502", trainName: "Talcher Heavy Coal Rake", type: "GOODS", baseDelay: 40, speed: 50 },

  // Additional Pan-India Trunk Lines & Superfasts
  { trainNo: "12625", trainName: "Kerala Express (New Delhi - Trivandrum)", type: "SUPERFAST", baseDelay: 14, speed: 100 },
  { trainNo: "12841", trainName: "Coromandel Express (Howrah - Chennai)", type: "SUPERFAST", baseDelay: 8, speed: 105 },
  { trainNo: "12779", trainName: "Goa Express (Vasco Da Gama - Hazrat Nizamuddin)", type: "SUPERFAST", baseDelay: 20, speed: 90 },
  { trainNo: "12925", trainName: "Paschim Express (Bandra Terminus - Amritsar)", type: "SUPERFAST", baseDelay: 11, speed: 95 },
  { trainNo: "12957", trainName: "Swarna Jayanti Rajdhani (Ahmedabad - New Delhi)", type: "RAJDHANI", baseDelay: 3, speed: 120 },
  { trainNo: "12309", trainName: "Patna Rajdhani Express", type: "RAJDHANI", baseDelay: 6, speed: 125 },
  { trainNo: "12431", trainName: "Trivandrum Rajdhani Express", type: "RAJDHANI", baseDelay: 12, speed: 115 },
  { trainNo: "12617", trainName: "Mangala Lakshadweep Express (Ernakulam - NZM)", type: "SUPERFAST", baseDelay: 16, speed: 85 },
  { trainNo: "16345", trainName: "Netravati Express (LTT - Thiruvananthapuram)", type: "EXPRESS", baseDelay: 9, speed: 80 },
  { trainNo: "10103", trainName: "Mandovi Express (Mumbai CST - Madgaon)", type: "EXPRESS", baseDelay: 5, speed: 85 },
  { trainNo: "12915", trainName: "Ashram Express (Ahmedabad - Delhi)", type: "SUPERFAST", baseDelay: 7, speed: 95 },
  { trainNo: "12345", trainName: "Saraighat Express (Howrah - Guwahati)", type: "SUPERFAST", baseDelay: 18, speed: 90 },
  { trainNo: "11077", trainName: "Jhelum Express (Pune - Jammu Tawi)", type: "EXPRESS", baseDelay: 24, speed: 80 },
  { trainNo: "12809", trainName: "Mumbai CSMT - Howrah Mail", type: "MAIL", baseDelay: 15, speed: 90 },
  { trainNo: "12622", trainName: "Tamil Nadu Express (New Delhi - Chennai)", type: "SUPERFAST", baseDelay: 10, speed: 105 },
  { trainNo: "12727", trainName: "Godavari Express (Visakhapatnam - Hyderabad)", type: "SUPERFAST", baseDelay: 4, speed: 90 },
];

const TRAINS_PATH = path.join(__dirname, "../../../data/normalized/trains.json");
const { getEnhancedTrainGeometry } = require("../train-geometry.service");

class MockLiveTrainProvider extends LiveTrainProvider {
  constructor() {
    super("MOCK_PHYSICS_SIMULATION");
    this.trainsGeomMap = new Map();
    this.trainStopsMap = {};
    this.stationMap = new Map();
    this.allTrainsList = [];
    this.allTrainsMap = new Map();
    this.initData();
  }

  initData() {
    try {
      if (fs.existsSync(TRAINS_PATH)) {
        this.allTrainsList = JSON.parse(fs.readFileSync(TRAINS_PATH, "utf8"));
        this.allTrainsList.forEach((t) => this.allTrainsMap.set(String(t.train_no).trim(), t));
        console.log(`⚡ MockLiveTrainProvider loaded full fleet of ${this.allTrainsList.length} Indian Railway trains`);
      }
      if (fs.existsSync(TRAINS_GEOM_PATH)) {
        const list = JSON.parse(fs.readFileSync(TRAINS_GEOM_PATH, "utf8"));
        list.forEach((t) => this.trainsGeomMap.set(String(t.train_no).trim(), t));
        console.log(`⚡ MockLiveTrainProvider loaded ${this.trainsGeomMap.size} Pan-India train route geometries`);
      }
      if (fs.existsSync(TRAIN_STOPS_PATH)) {
        this.trainStopsMap = JSON.parse(fs.readFileSync(TRAIN_STOPS_PATH, "utf8"));
      }
      if (fs.existsSync(STATIONS_PATH)) {
        const stations = JSON.parse(fs.readFileSync(STATIONS_PATH, "utf8"));
        stations.forEach((s) => this.stationMap.set(s.station_code, s));
      }
    } catch (err) {
      console.warn("Mock provider data loading issue:", err.message);
    }
  }

  // Calculate live position along a train's authentic route geometry
  calculateTrainMovement(trainNo, trainMeta, elapsedSeconds, includeRoute = false) {
    const cleanNo = String(trainNo).trim();
    const trainInfo =
      trainMeta ||
      this.allTrainsMap.get(cleanNo) ||
      this.allTrainsMap.get(cleanNo.padStart(5, "0")) ||
      this.allTrainsMap.get(cleanNo.replace(/^0+/, ""));

    let geomData =
      this.trainsGeomMap.get(cleanNo) ||
      this.trainsGeomMap.get(cleanNo.padStart(5, "0")) ||
      this.trainsGeomMap.get(cleanNo.replace(/^0+/, ""));

    // Check if enhanced geometry exists
    const enhanced = getEnhancedTrainGeometry(cleanNo);
    let coords = enhanced?.coordinates || geomData?.route_geometry?.coordinates || [];

    if (coords.length < 2) {
      return null;
    }

    const stops =
      this.trainStopsMap[cleanNo] ||
      this.trainStopsMap[cleanNo.padStart(5, "0")] ||
      this.trainStopsMap[cleanNo.replace(/^0+/, "")] ||
      [];

    const numMatch = cleanNo.replace(/[^0-9]/g, "") || "100";
    const seed = parseInt(numMatch, 10);

    // Realistic IST time-based movement physics
    const now = new Date();
    const istMs = now.getTime() + (5 * 60 + 30) * 60 * 1000;
    const istDate = new Date(istMs);
    const istHours = istDate.getUTCHours();
    const istMinutes = istDate.getUTCMinutes();
    const istSeconds = istDate.getUTCSeconds();
    const currentIstMinute = istHours * 60 + istMinutes + istSeconds / 60;

    function parseTimeToMin(t) {
      if (!t) return null;
      const parts = t.split(":");
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    const depMin = parseTimeToMin(trainInfo?.departure_time || geomData?.departure_time) ?? ((seed * 37) % 1440);
    let durationMin =
      (trainInfo?.duration_hours || geomData?.duration_hours || 0) * 60 +
      (trainInfo?.duration_minutes || geomData?.duration_minutes || 0);

    if (!durationMin || durationMin < 30) {
      const dist = trainInfo?.distance_km || geomData?.distance_km;
      durationMin = dist ? Math.max(60, Math.round((dist / 75) * 60)) : 360;
    }

    // Steady, smooth progress along the route at real operating speed
    const elapsedSinceDep = (currentIstMinute - depMin + 14400) % 1440;
    const progress = Math.min(0.999, Math.max(0.001, ((elapsedSinceDep + (seed % 19)) % durationMin) / durationMin));

    const totalPoints = coords.length;
    const floatIndex = progress * (totalPoints - 1);
    const lowIndex = Math.floor(floatIndex);
    const highIndex = Math.min(lowIndex + 1, totalPoints - 1);
    const subRatio = floatIndex - lowIndex;

    const p1 = coords[lowIndex];
    const p2 = coords[highIndex];

    const lng = Number((p1[0] + (p2[0] - p1[0]) * subRatio).toFixed(6));
    const lat = Number((p1[1] + (p2[1] - p1[1]) * subRatio).toFixed(6));

    // Approximate stop index
    let currentStation = trainInfo?.source_station_name || trainInfo?.source_station || "Origin";
    let nextStation = trainInfo?.destination_station_name || trainInfo?.destination_station || "Destination";
    if (stops.length > 0) {
      const stopIdx = Math.min(Math.floor(progress * stops.length), stops.length - 1);
      currentStation = stops[stopIdx]?.station_name || stops[stopIdx]?.station_code || currentStation;
      const nextIdx = Math.min(stopIdx + 1, stops.length - 1);
      nextStation = stops[nextIdx]?.station_name || stops[nextIdx]?.station_code || nextStation;
    }

    // Authentic speed according to train category
    const trainType = (trainInfo?.train_type || trainInfo?.type || geomData?.train_type || "EXPRESS").toUpperCase();
    let baseSpeed = 80;
    if (trainType.includes("VANDE BHARAT") || trainType.includes("VB")) baseSpeed = 120;
    else if (trainType.includes("RAJ") || trainType.includes("DURONTO")) baseSpeed = 115;
    else if (trainType.includes("SHTB") || trainType.includes("SHATABDI")) baseSpeed = 110;
    else if (trainType.includes("SF") || trainType.includes("SUPERFAST")) baseSpeed = 95;
    else if (trainType.includes("GOODS") || trainType.includes("FREIGHT")) baseSpeed = 55;
    else baseSpeed = 75;

    // Small realistic cruising fluctuation (+/- 3 km/h)
    const speed = baseSpeed + ((Math.floor(istSeconds / 10) + seed) % 7) - 3;

    const baseDelay = trainInfo?.baseDelay ?? (seed % 14);
    const delayMinutes = Math.max(0, baseDelay + ((Math.floor(istSeconds / 30) + seed) % 5) - 2);
    const status = delayMinutes > 15 ? "DELAYED" : delayMinutes > 0 ? "RUNNING" : "ON_TIME";

    const matchedSection = `SEC-${trainInfo?.source_station || geomData?.source_station || "IR"}-${trainInfo?.destination_station || geomData?.destination_station || "IR"}`;

    const res = {
      train_no: trainInfo?.train_no || geomData?.train_no || cleanNo,
      train_name: trainInfo?.train_name || trainInfo?.trainName || geomData?.train_name || `Train ${cleanNo}`,
      train_type: trainType,
      zone: trainInfo?.zone || geomData?.zone || "IR",
      source_station: trainInfo?.source_station || geomData?.source_station || "ORIGIN",
      source_station_name: trainInfo?.source_station_name || geomData?.source_station_name || trainInfo?.source_station,
      destination_station: trainInfo?.destination_station || geomData?.destination_station || "DEST",
      destination_station_name: trainInfo?.destination_station_name || geomData?.destination_station_name || trainInfo?.destination_station,
      departure_time: trainInfo?.departure_time || geomData?.departure_time || null,
      arrival_time: trainInfo?.arrival_time || geomData?.arrival_time || null,
      latitude: lat,
      longitude: lng,
      speed_kmh: speed,
      delay_minutes: delayMinutes,
      status,
      current_station: currentStation,
      next_station: nextStation,
      matched_section_id: matchedSection,
      matched_track_id: matchedSection,
      distance_from_section_m: 5.0,
      confidence_percent: 99,
      route_progress_percent: Math.round(progress * 100),
      total_stops: stops.length,
      source: "MOCK_PHYSICS_SIMULATION",
      is_simulated: true,
      last_updated: new Date().toISOString(),
    };

    if (includeRoute) {
      res.route_coordinates = coords;
    }

    return res;
  }

  async getLiveTrains(options = {}) {
    const { zone, type, search, limit = 250 } = options;
    const now = new Date();
    const elapsedSeconds = Math.floor(now.getTime() / 1000);

    const fleet =
      this.allTrainsList && this.allTrainsList.length > 0
        ? this.allTrainsList
        : PAN_INDIA_ACTIVE_FLEET;

    let filtered = fleet;

    if (zone && zone !== "ALL") {
      filtered = filtered.filter((t) => (t.zone || "").toUpperCase() === zone.toUpperCase());
    }

    if (type && type !== "ALL") {
      const uType = type.toUpperCase();
      filtered = filtered.filter((t) => {
        const name = (t.train_name || t.trainName || "").toUpperCase();
        const tt = (t.train_type || t.type || "").toUpperCase();
        if (uType === "VANDE_BHARAT" || uType === "VB" || uType === "VANDE BHARAT") return name.includes("VANDE BHARAT");
        if (uType === "RAJDHANI" || uType === "RAJ") return tt === "RAJ" || name.includes("RAJDHANI");
        if (uType === "SHATABDI" || uType === "SHTB") return tt === "SHTB" || name.includes("SHATABDI");
        if (uType === "SUPERFAST" || uType === "SF") return tt === "SF" || tt === "SUPERFAST";
        if (uType === "GOODS") return tt === "GOODS" || name.includes("FREIGHT");
        return true;
      });
    }

    if (search) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((t) => {
        const no = String(t.train_no || t.trainNo || "");
        const name = (t.train_name || t.trainName || "").toLowerCase();
        return no.includes(q) || name.includes(q);
      });
    }

    const totalMatching = filtered.length;
    const maxLimit = Math.min(limit || 250, 1000);
    const toProcess = filtered.slice(0, maxLimit);

    const liveList = [];
    for (const item of toProcess) {
      const trainNo = item.train_no || item.trainNo;
      const movement = this.calculateTrainMovement(trainNo, item, elapsedSeconds, false);
      if (movement) {
        liveList.push(movement);
      }
    }

    return {
      total: totalMatching,
      count: liveList.length,
      data: liveList,
    };
  }

  async getLiveTrainByNumber(trainNo) {
    const cleanNo = String(trainNo).trim();
    const now = new Date();
    const elapsedSeconds = Math.floor(now.getTime() / 1000);

    const trainMeta =
      this.allTrainsMap.get(cleanNo) ||
      this.allTrainsMap.get(cleanNo.padStart(5, "0")) ||
      this.allTrainsMap.get(cleanNo.replace(/^0+/, "")) ||
      PAN_INDIA_ACTIVE_FLEET.find(
        (f) =>
          f.trainNo === cleanNo ||
          f.trainNo === cleanNo.padStart(5, "0") ||
          f.trainNo === cleanNo.replace(/^0+/, "")
      );

    const movement = this.calculateTrainMovement(cleanNo, trainMeta, elapsedSeconds, true);
    if (movement) return movement;

    // Fallback if geometry map has it
    const geom =
      this.trainsGeomMap.get(cleanNo) ||
      this.trainsGeomMap.get(cleanNo.padStart(5, "0")) ||
      this.trainsGeomMap.get(cleanNo.replace(/^0+/, ""));

    if (geom) {
      return this.calculateTrainMovement(
        cleanNo,
        { train_name: geom.train_name, train_type: geom.train_type },
        elapsedSeconds,
        true
      );
    }

    return null;
  }
}

module.exports = { MockLiveTrainProvider };

