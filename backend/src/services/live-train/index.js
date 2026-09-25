// backend/src/services/live-train/index.js
const { MockLiveTrainProvider } = require("./mockProvider");
const { RapidApiLiveTrainProvider } = require("./rapidapiProvider");
const { CrisEnterpriseProvider } = require("./crisEnterpriseProvider");

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.LIVE_TRAIN_API_KEY;
const CRIS_ENDPOINT = process.env.CRIS_ENDPOINT;

let activeProvider = null;

if (CRIS_ENDPOINT && process.env.CRIS_CLIENT_ID) {
  activeProvider = new CrisEnterpriseProvider(
    CRIS_ENDPOINT,
    process.env.CRIS_CLIENT_ID,
    process.env.CRIS_CLIENT_SECRET
  );
  console.log("⚡ Live Train Service configured with CRIS Enterprise Provider");
} else if (RAPIDAPI_KEY) {
  activeProvider = new RapidApiLiveTrainProvider(RAPIDAPI_KEY);
  console.log("⚡ Live Train Service configured with RapidAPI Provider");
} else {
  activeProvider = new MockLiveTrainProvider();
  console.log("⚡ Live Train Service configured with Mock Physics Simulation Provider");
}

module.exports = {
  getLiveTrains: (options) => activeProvider.getLiveTrains(options),
  getLiveTrainByNumber: (trainNo) => activeProvider.getLiveTrainByNumber(trainNo),
  getActiveProviderName: () => activeProvider.name,
};
