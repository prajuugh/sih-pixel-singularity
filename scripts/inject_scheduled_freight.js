// scripts/inject_scheduled_freight.js
const fs = require('fs');
const path = require('path');

const freightPath = path.join(__dirname, '../backend/data/normalized/scheduled_freight_trains.json');
const schedulesPath = path.join(__dirname, '../backend/data/normalized/section_schedules.json');

const freightTrains = JSON.parse(fs.readFileSync(freightPath, 'utf8'));
const sectionSchedules = JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));

console.log(`Starting scheduled freight injection for ${freightTrains.length} freight services...`);

let injectedCount = 0;

freightTrains.forEach((fr) => {
  const freightEntry = {
    trainNo: fr.trainNo,
    train_no: fr.trainNo,
    trainName: fr.trainName,
    train_name: fr.trainName,
    type: "GOODS",
    train_type: "GOODS",
    category: fr.category || "FREIGHT",
    subCategory: fr.subCategory,
    rakeType: fr.rakeType,
    commodity: fr.commodity,
    grossTonnage: fr.grossTonnage,
    wagonCount: fr.wagonCount,
    locoClass: fr.locoClass,
    traction: fr.traction,
    isElectric: fr.isElectric,
    isFreight: true,
    isTimeTabled: true,
    arrival: fr.arrival,
    departure: fr.departure,
    arrival_time: fr.arrival,
    departure_time: fr.departure,
    source: fr.source,
    destination: fr.destination,
    source_station_name: fr.source,
    destination_station_name: fr.destination,
    source_station: fr.sourceCode,
    destination_station: fr.destinationCode,
    operatingDays: fr.operatingDays,
    priority: fr.priority,
  };

  const tracks = fr.trackIds || [];
  tracks.forEach((tid) => {
    const key = tid.toUpperCase();
    if (!sectionSchedules[key]) {
      sectionSchedules[key] = {
        section_id: key,
        track_id: key,
        from_station: null,
        to_station: null,
        trainCount: 0,
        schedules: [],
      };
    }

    // Check if train already present
    const exists = sectionSchedules[key].schedules.some(
      (s) => (s.trainNo || s.train_no) === fr.trainNo
    );

    if (!exists) {
      sectionSchedules[key].schedules.push(freightEntry);
      sectionSchedules[key].trainCount = sectionSchedules[key].schedules.length;
      injectedCount++;
    }
  });
});

fs.writeFileSync(schedulesPath, JSON.stringify(sectionSchedules, null, 2), 'utf8');
console.log(`✅ Successfully injected ${injectedCount} scheduled goods train entries across section_schedules.json!`);
