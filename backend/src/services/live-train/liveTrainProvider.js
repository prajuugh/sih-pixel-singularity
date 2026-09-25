// backend/src/services/live-train/liveTrainProvider.js

/**
 * Abstract interface for live train tracking providers.
 * All providers (Mock simulation, RapidAPI, CRIS Enterprise) implement this contract.
 */
class LiveTrainProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Returns a list of all currently active live trains across the network.
   * @returns {Promise<Array<LiveTrainPosition>>}
   */
  async getLiveTrains() {
    throw new Error("getLiveTrains() must be implemented by provider subclass");
  }

  /**
   * Returns live position and status for a specific train number.
   * @param {string} trainNo 5-digit Indian Railway train number
   * @returns {Promise<LiveTrainPosition|null>}
   */
  async getLiveTrainByNumber(trainNo) {
    throw new Error("getLiveTrainByNumber() must be implemented by provider subclass");
  }
}

module.exports = { LiveTrainProvider };
