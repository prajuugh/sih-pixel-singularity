// backend/src/services/live-train/rapidapiProvider.js
const { LiveTrainProvider } = require("./liveTrainProvider");
const { matchPointToSection } = require("../section-matching.service");

class RapidApiLiveTrainProvider extends LiveTrainProvider {
  constructor(apiKey, apiHost = "irctc1.p.rapidapi.com") {
    super("RAPIDAPI_IRCTC");
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  async getLiveTrains() {
    // RapidAPI operates per train query; returns empty if no batch call is available
    return [];
  }

  async getLiveTrainByNumber(trainNo) {
    if (!this.apiKey) {
      throw new Error("RapidAPI key not configured");
    }

    const url = `https://${this.apiHost}/api/v1/liveTrainStatus?trainNo=${trainNo}&startDay=1`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": this.apiKey,
        "x-rapidapi-host": this.apiHost,
      },
    });

    if (!response.ok) {
      throw new Error(`RapidAPI live train status failed with status ${response.status}`);
    }

    const json = await response.json();
    const data = json.data || {};

    const lat = data.current_location_lat ? Number(data.current_location_lat) : null;
    const lng = data.current_location_lng ? Number(data.current_location_lng) : null;

    let matched = null;
    if (lat && lng) {
      matched = matchPointToSection(lat, lng);
    }

    return {
      train_no: trainNo,
      train_name: data.train_name || `Train ${trainNo}`,
      train_type: "EXPRESS",
      source_station: data.source || "UNKNOWN",
      destination_station: data.destination || "UNKNOWN",
      latitude: lat,
      longitude: lng,
      speed_kmh: data.speed || 0,
      delay_minutes: data.delay || 0,
      status: data.status || "RUNNING",
      current_station: data.current_station_name || "En-route",
      next_station: data.upcoming_stations?.[0]?.station_name || "Next Stop",
      matched_section_id: matched?.sectionId || null,
      matched_track_id: matched?.trackId || null,
      distance_from_section_m: matched?.distanceMeters || null,
      confidence_percent: matched?.confidence || null,
      source: "RAPIDAPI_IRCTC",
      is_simulated: false,
      disclaimer: "Data relayed from public commercial API gateway.",
      last_updated: new Date().toISOString(),
    };
  }
}

module.exports = { RapidApiLiveTrainProvider };
