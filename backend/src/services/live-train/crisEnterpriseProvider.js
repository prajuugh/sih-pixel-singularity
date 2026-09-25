// backend/src/services/live-train/crisEnterpriseProvider.js
const { LiveTrainProvider } = require("./liveTrainProvider");

/**
 * Official CRIS (Centre for Railway Information Systems) / NTES / RTIS Enterprise Gateway Stub.
 *
 * NOTE: Production access to real-time RTIS (Real-Time Train Information System)
 * and NTES feeds requires:
 * 1. Ministry of Railways (Railway Board) MoU or Hackathon Enterprise API Whitelist.
 * 2. Static Dedicated IP whitelisting.
 * 3. Mutual TLS (mTLS) certificate exchange.
 * 4. CRIS OAuth 2.0 Bearer Token.
 */
class CrisEnterpriseProvider extends LiveTrainProvider {
  constructor(endpoint, clientId, clientSecret) {
    super("CRIS_RTIS_OFFICIAL");
    this.endpoint = endpoint;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async getLiveTrains() {
    if (!this.clientId || !this.endpoint) {
      throw new Error(
        "CRIS Enterprise Gateway requires official Ministry credentials. " +
        "Please provide CRIS_ENDPOINT, CRIS_CLIENT_ID, and CRIS_CLIENT_SECRET."
      );
    }
    // Enterprise integration endpoint implementation
    return [];
  }

  async getLiveTrainByNumber(trainNo) {
    if (!this.clientId) {
      throw new Error("CRIS Enterprise credentials not configured.");
    }
    return null;
  }
}

module.exports = { CrisEnterpriseProvider };
