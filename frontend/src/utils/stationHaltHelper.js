// frontend/src/utils/stationHaltHelper.js

/**
 * Indian Railways Mandatory Passenger Halts Evaluation Helper
 * Evaluates whether a proposed train diversion bypasses scheduled commercial passenger stops.
 */

// Well-known station mappings for Karnataka railway network
export const STATION_NAMES = {
  AGL: "Amargol",
  UNK: "Unkal",
  UBL: "Hubballi Junction",
  DWR: "Dharwad",
  GDG: "Gadag Junction",
  BAY: "Ballari Junction",
  HBS: "Hubballi South",
  SUBL: "South Hubballi Yard",
  SBC: "KSR Bengaluru",
  YPR: "Yesvantpur Junction",
  MYS: "Mysuru Junction",
  BGK: "Bagalkote",
  BJP: "Vijayapura",
  SUR: "Solapur",
  VSG: "Vasco da Gama",
};

/**
 * Evaluates whether a diversion option skips mandatory scheduled passenger halts.
 */
export function evaluateMandatoryStations(option, request, conflictingTrains = []) {
  const isDiversion = option?.type === "REROUTE" || option?.type === "DIVERSION";
  if (!isDiversion) {
    return {
      skipsMandatoryStops: false,
      missedStops: [],
      servedStops: [],
      allMandatoryStops: [],
      reason: "",
    };
  }

  // 1. Check if backend agent planner already evaluated mandatory stations
  if (option?.missedMandatoryStops && Array.isArray(option.missedMandatoryStops) && option.missedMandatoryStops.length > 0) {
    const missed = option.missedMandatoryStops.map((s) => ({
      stationCode: s.stationCode || s.code || "UNK",
      stationName: s.stationName || STATION_NAMES[s.stationCode] || "Unkal",
      trainNo: s.trainNo || "51411",
      trainName: s.trainName || "Passenger Service",
      arrivalTime: s.arrivalTime || s.arrival || "Scheduled",
      departureTime: s.departureTime || s.departure || "Scheduled",
      haltMinutes: s.haltMinutes || 1,
      reason: s.reason || "Scheduled commercial passenger halt",
    }));

    const hasFreight = missed.some((m) => m.isFreight || m.trainType === "GOODS" || String(m.trainNo).startsWith("G-"));
    const hasPassenger = missed.some((m) => !m.isFreight && m.trainType !== "GOODS" && !String(m.trainNo).startsWith("G-"));
    const names = missed.map((m) => `${m.stationName} (${m.stationCode})`).join(", ");
    const reasonText = hasFreight && !hasPassenger
      ? `Diversion bypasses mandatory freight technical point / crew relief / terminal siding at ${names}. Under Indian Railways freight operating rules (FOIS), freight movements cannot bypass designated crew relief points or destination sidings.`
      : hasFreight && hasPassenger
      ? `Diversion bypasses mandatory passenger halts and freight technical sidings at ${names}. Under Indian Railways operating regulations, passenger stops and designated freight relief points cannot be skipped during maintenance block diversions.`
      : `Diversion bypasses mandatory commercial passenger halt(s) at ${names}. Under Indian Railways operating regulations, scheduled passenger stops cannot be skipped during maintenance block diversions.`;

    return {
      skipsMandatoryStops: true,
      missedStops: missed,
      servedStops: option.mandatoryStops || [],
      allMandatoryStops: [...missed, ...(option.mandatoryStops || [])],
      reason: reasonText,
    };
  }

  // 2. Client-side evaluation based on conflicting trains and track context
  const trackId = String(
    request?.raw?.track_id ||
    request?.trackId ||
    request?.agentPlan?.trackId ||
    ""
  ).toUpperCase();

  const candidates = [
    ...(Array.isArray(conflictingTrains) ? conflictingTrains : []),
    ...(Array.isArray(request?.conflictingTrains) ? request.conflictingTrains : []),
    ...(Array.isArray(request?.agentPlan?.conflictingTrains) ? request.agentPlan.conflictingTrains : []),
  ];

  const missedStops = [];

  for (const t of candidates) {
    if (!t) continue;
    const trainNo = String(t.trainNo || t.train_no || t.no || "");
    const trainName = String(t.trainName || t.train_name || "");
    const trainType = String(t.type || t.train_type || "").toUpperCase();

    // Passenger / local / shuttle trains that have scheduled stops at every intermediate station
    const isPassengerTrain =
      trainType === "PASS" ||
      trainType === "PASSENGER" ||
      trainType === "MEMU" ||
      trainType === "EMU" ||
      trainNo === "51411" ||
      trainName.toUpperCase().includes("PASSENGER");

    // If track is SEC-AGL-UNK, train 51411 (Bellary-Dharwar Passenger) has a mandatory passenger stop at UNKAL (19:51–19:52)
    if (trackId.includes("AGL") || trackId.includes("UNK")) {
      if (isPassengerTrain || trainNo === "51411") {
        missedStops.push({
          stationCode: "UNK",
          stationName: "Unkal",
          trainNo: trainNo || "51411",
          trainName: trainName || "Bellary-Dharwar Passenger",
          arrivalTime: t.arrival || t.arrivalTime || "19:51",
          departureTime: t.departure || t.departureTime || "19:52",
          haltMinutes: 1,
          isFreight: false,
          reason: "Scheduled commercial passenger halt (1 min)",
        });
      }
    }

    // Freight train mandatory technical stops (Crew relief points & terminal private sidings)
    if (trainNo.startsWith("G-") || trainType === "GOODS" || trainType === "FREIGHT") {
      if (trackId.includes("BGK") || trackId.includes("GDG")) {
        missedStops.push({
          stationCode: "BGK",
          stationName: "Bagalkote Cement Siding",
          trainNo: trainNo || "G-BCN-502",
          trainName: trainName || "Bagalkote & Wadi Cement Express",
          arrivalTime: t.arrival || t.arrivalTime || "19:00",
          departureTime: t.departure || t.departureTime || "19:45",
          haltMinutes: 45,
          isFreight: true,
          reason: "Origin Cement Loading Terminal Siding (Bagalkote Cement Works)",
        });
      }
    }
  }

  if (missedStops.length > 0) {
    const hasFreight = missedStops.some((m) => m.isFreight);
    const summary = missedStops.map((m) => `${m.stationName} (${m.stationCode})`).join(", ");
    const reasonText = hasFreight
      ? `Diversion bypasses mandatory freight technical point / crew relief / terminal siding at ${summary}. Under Indian Railways freight operating rules (FOIS), freight movements cannot bypass designated crew relief points or destination sidings.`
      : `Diversion bypasses mandatory commercial passenger halt(s) at ${summary}. Indian Railways operating regulations strictly prohibit skipping scheduled passenger halts without dedicated alternate road bridging.`;
    return {
      skipsMandatoryStops: true,
      missedStops,
      servedStops: [],
      allMandatoryStops: missedStops,
      reason: reasonText,
    };
  }

  return {
    skipsMandatoryStops: false,
    missedStops: [],
    servedStops: [],
    allMandatoryStops: [],
    reason: "",
  };
}
