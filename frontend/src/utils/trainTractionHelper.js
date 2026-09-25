// frontend/src/utils/trainTractionHelper.js

/**
 * Checks whether a given train operates on electric traction (25kV AC OHE catenary).
 * In Indian Railways, electric trains (including Vande Bharat, EMU/MEMU, Rajdhani,
 * Shatabdi, and electric locomotive-hauled Superfast/Express services) cannot run
 * on diversion routes, chords, or freight sidings that lack continuous overhead catenary.
 */
export function isElectricTrain(train) {
  if (!train) return false;

  // Explicit boolean flag
  if (typeof train.isElectric === "boolean") return train.isElectric;

  // Explicit traction string
  const traction = String(train.traction || "").toUpperCase();
  if (traction.includes("DIESEL")) {
    return false;
  }
  if (traction.includes("ELEC") || traction.includes("OHE") || traction.includes("25KV") || traction.includes("AC")) {
    return true;
  }

  // Locomotive Class (Indian Railways Freight & Passenger)
  const loco = String(train.locoClass || train.loco || train.locomotive || "").toUpperCase();
  if (
    loco.includes("WAG-9") ||
    loco.includes("WAG-12") ||
    loco.includes("WAG-7") ||
    loco.includes("WAG9") ||
    loco.includes("WAG12") ||
    loco.includes("WAG") ||
    loco.includes("WAP")
  ) {
    return true;
  }
  if (loco.includes("WDG") || loco.includes("WDP")) {
    return false;
  }

  const no = String(train.trainNo || train.train_no || "").toUpperCase();
  if (no.includes("WAG")) return true;
  if (no.includes("WDG")) return false;

  // Train Type / Category codes in Indian Railways
  const type = String(train.type || train.train_type || train.category || "").trim().toUpperCase();
  const passengerTypes = [
    "SF", "SUPERFAST", "EXP", "EXPRESS", "SKR", "SAMPARK KRANTI",
    "PASS", "PASSENGER", "MEMU", "EMU", "VB", "VANDE BHARAT",
    "SHATABDI", "RAJDHANI", "TEJAS", "MAIL", "INTERCITY", "SPECIAL"
  ];
  if (passengerTypes.some((pt) => type === pt || type.startsWith(pt))) {
    return true;
  }

  // Authentic Indian Railways corridor train names
  const name = String(train.trainName || train.train_name || train.name || "").toUpperCase();
  if (
    name.includes("VANDE BHARAT") ||
    name.includes("VB ") ||
    name.includes("EMU") ||
    name.includes("MEMU") ||
    name.includes("METRO") ||
    name.includes("SHATABDI") ||
    name.includes("RAJDHANI") ||
    name.includes("TEJAS") ||
    name.includes("KARNATAKA EXPRESS") ||
    name.includes("RANI CHENNAMMA") ||
    name.includes("GOL GUMBAZ") ||
    name.includes("SWARNA JAYANTI") ||
    name.includes("EXPRESS") ||
    name.includes("EXP") ||
    name.includes("PASSENGER") ||
    name.includes("KRANTI") ||
    name.includes("INTERCITY")
  ) {
    return true;
  }

  // In Indian Railways electrified trunk routes, any non-goods train is electric
  if (type && type !== "GOODS" && type !== "FREIGHT") {
    return true;
  }

  return false;
}

/**
 * Returns all electric trains that are involved in the request conflict or affected by the alternative.
 */
export function getElectricConflictTrains(option, request, conflictingTrains = []) {
  const isDiversionOpt = !option || option.type === "REROUTE" || option.type === "DIVERSION";
  if (!isDiversionOpt) return [];

  const candidates = [
    ...(Array.isArray(conflictingTrains) ? conflictingTrains : []),
    ...(Array.isArray(request?.conflictingTrains) ? request.conflictingTrains : []),
    ...(Array.isArray(request?.agentPlan?.conflictingTrains) ? request.agentPlan.conflictingTrains : []),
    ...(Array.isArray(option?.delayedTrains) ? option.delayedTrains : []),
    ...(Array.isArray(option?.delayed_trains) ? option.delayed_trains : []),
  ];

  const electricList = [];
  const seenNos = new Set();

  for (const t of candidates) {
    if (!t) continue;
    const trainNo = String(t.trainNo || t.train_no || t.no || t.id || "");
    const key = trainNo || String(t.trainName || t.train_name || Math.random());
    if (seenNos.has(key)) continue;

    if (isElectricTrain(t)) {
      seenNos.add(key);
      electricList.push({
        trainNo: t.trainNo || t.train_no || t.no || "IR",
        trainName: t.trainName || t.train_name || "Electric Service",
        type: t.type || t.train_type || "ELECTRIC",
        traction: t.traction || "25kV AC Electric",
        arrival: t.arrival || t.arrivalTime || "",
        departure: t.departure || t.departureTime || "",
      });
    }
  }

  return electricList;
}

/**
 * Evaluates whether a diversion option is passive (disabled) because an electric train cannot be diverted.
 */
export function evaluateDiversionPassivity(option, request, conflictingTrains = []) {
  const isDiversion = option?.type === "REROUTE" || option?.type === "DIVERSION";
  if (!isDiversion) {
    return { isPassive: false, electricTrains: [], reason: "" };
  }

  // If already flagged by backend
  if (option.passive === true || (option.feasible === false && option.disabledReason)) {
    return {
      isPassive: true,
      electricTrains: [],
      reason: option.disabledReason || "Diversion prohibited for electric train traction.",
    };
  }

  const electricTrains = getElectricConflictTrains(option, request, conflictingTrains);

  if (electricTrains.length > 0) {
    const trainNames = electricTrains
      .map((t) => `${t.trainNo} ${t.trainName} (${t.type})`)
      .join(", ");
    return {
      isPassive: true,
      electricTrains,
      reason: `Electric train (${trainNames}) cannot be diverted: alternate diversion corridor lacks 25kV AC overhead catenary (OHE).`,
    };
  }

  return { isPassive: false, electricTrains: [], reason: "" };
}
