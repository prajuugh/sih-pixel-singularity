// backend/src/controllers/train.controller.js
const { fallbackStore } = require("../config/database");

async function getTrains(req, res, next) {
  try {
    const { type } = req.query;
    let trains = [...fallbackStore.trains];

    if (type) {
      trains = trains.filter((t) => t.train_type.toUpperCase() === type.toUpperCase());
    }

    res.json({
      success: true,
      data: {
        total: trains.length,
        trains,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getTrainByNo(req, res, next) {
  try {
    const { trainNo } = req.params;
    const train = fallbackStore.trains.find((t) => t.train_no === trainNo);

    if (!train) {
      return res.status(404).json({
        success: false,
        error: { code: "TRAIN_NOT_FOUND", message: `Train ${trainNo} not found` },
      });
    }

    res.json({
      success: true,
      data: train,
    });
  } catch (err) {
    next(err);
  }
}

async function getTrainRoute(req, res, next) {
  try {
    const { trainNo } = req.params;
    const segments = fallbackStore.train_route_segments
      .filter((s) => s.train_no === trainNo)
      .sort((a, b) => a.sequence - b.sequence);

    res.json({
      success: true,
      data: {
        trainNo,
        totalSegments: segments.length,
        routeSegments: segments,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTrains,
  getTrainByNo,
  getTrainRoute,
};
