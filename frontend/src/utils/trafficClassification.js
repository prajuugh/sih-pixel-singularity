// frontend/src/utils/trafficClassification.js

/**
 * Traffic Classification Utility for Indian Railways
 * Distinguishes between Passenger Services and Freight / Goods Operations (FOIS).
 */

export function isFreightTrain(train) {
  if (!train) return false;

  const no = String(train.trainNo || train.train_no || train.no || "").toUpperCase();
  const name = String(train.trainName || train.train_name || train.name || "").toUpperCase();
  const type = String(train.type || train.train_type || "").toUpperCase();
  const category = String(train.category || "").toUpperCase();
  const rake = String(train.rakeType || train.rake || "").toUpperCase();

  if (no.startsWith("G-") || no.startsWith("FR-") || no.includes("GOODS")) {
    return true;
  }

  if (
    type === "GOODS" ||
    type === "FREIGHT" ||
    category === "FREIGHT" ||
    category === "GOODS"
  ) {
    return true;
  }

  const freightKeywords = [
    "FREIGHT", "GOODS", "BOXN", "BCN", "BCNHL", "BOBRN", "BTPN", "BLCA", "BRNA",
    "COAL SPECIAL", "IRON ORE", "CEMENT EXPRESS", "PETROLEUM TANKER", "CONTAINER",
    "RO-RO", "AUTOMOBILE RAKE", "STEEL SPECIAL", "FERTILIZER"
  ];

  if (freightKeywords.some((kw) => name.includes(kw) || rake.includes(kw))) {
    return true;
  }

  return false;
}

export function isPassengerTrain(train) {
  if (!train) return false;
  return !isFreightTrain(train);
}

/**
 * Classifies a maintenance request into:
 * - "GOODS": Dedicated freight movement conflict or goods track maintenance
 * - "PASSENGER": Passenger train conflict or mainline passenger track maintenance
 * - "MIXED": Involves both passenger and freight train movements
 */
export function getRequestTrafficType(request) {
  if (!request) return "PASSENGER";

  const candidates = [
    ...(Array.isArray(request.conflictingTrains) ? request.conflictingTrains : []),
    ...(Array.isArray(request.agentPlan?.conflictingTrains) ? request.agentPlan.conflictingTrains : []),
    ...(Array.isArray(request.raw?.conflicting_trains) ? request.raw.conflicting_trains : []),
  ];

  let hasFreight = false;
  let hasPassenger = false;

  for (const t of candidates) {
    if (isFreightTrain(t)) {
      hasFreight = true;
    } else {
      hasPassenger = true;
    }
  }

  // If no conflicting trains, check request task_type, description, or track
  if (candidates.length === 0) {
    const text = `${request.type || ""} ${request.task_type || ""} ${request.description || ""} ${request.asset_type || ""}`.toLowerCase();
    if (
      text.includes("goods") ||
      text.includes("freight") ||
      text.includes("rake") ||
      text.includes("boxn") ||
      text.includes("bcn") ||
      text.includes("siding") ||
      text.includes("axle load")
    ) {
      return "GOODS";
    }
    return "PASSENGER";
  }

  if (hasFreight && hasPassenger) return "MIXED";
  if (hasFreight) return "GOODS";
  return "PASSENGER";
}
