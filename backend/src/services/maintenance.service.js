// backend/src/services/maintenance.service.js
const { fallbackStore } = require("../config/database");

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

async function checkConflict(trackId, date, startTime, endTime) {
  const reqStartMins = timeToMinutes(startTime);
  const reqEndMins = timeToMinutes(endTime);
  const tid = trackId.toUpperCase();

  // 1. Get track schedules from the master controller
  const { getOrGenerateSchedulesForTrack } = require("../controllers/track.controller");
  const trackSchedules = getOrGenerateSchedulesForTrack(tid);

  const conflicts = [];

  for (const s of trackSchedules) {
    const arrMins = timeToMinutes(s.arrival);
    const depMins = timeToMinutes(s.departure);

    // Overlap condition: train.arrival < maintenance.end AND train.departure > maintenance.start
    if (arrMins < reqEndMins && depMins > reqStartMins) {
      conflicts.push({
        trainNo: s.trainNo,
        trainName: s.trainName,
        trainType: s.type || "EXPRESS",
        arrival: s.arrival,
        departure: s.departure,
        overlapMinutes: Math.min(reqEndMins, depMins) - Math.max(reqStartMins, arrMins),
      });
    }
  }

  // 2. Also check any explicit fallback store segments
  const routeSegments = fallbackStore.train_route_segments.filter(
    (s) => s.track_id === tid
  );

  for (const seg of routeSegments) {
    if (conflicts.some((c) => c.trainNo === seg.train_no)) continue;

    const arrMins = timeToMinutes(seg.arrival_time);
    const depMins = timeToMinutes(seg.departure_time);

    if (arrMins < reqEndMins && depMins > reqStartMins) {
      const train = fallbackStore.trains.find((t) => t.train_no === seg.train_no) || {
        train_no: seg.train_no,
        train_name: "Scheduled Train",
        train_type: "EXPRESS",
      };

      conflicts.push({
        trainNo: train.train_no,
        trainName: train.train_name,
        trainType: train.train_type,
        arrival: seg.arrival_time,
        departure: seg.departure_time,
        overlapMinutes: Math.min(reqEndMins, depMins) - Math.max(reqStartMins, arrMins),
      });
    }
  }

  return {
    safe: conflicts.length === 0,
    conflicts,
  };
}

module.exports = {
  checkConflict,
};
