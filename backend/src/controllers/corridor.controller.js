// backend/src/controllers/corridor.controller.js
const { fallbackStore } = require("../config/database");

async function getCorridors(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        total: fallbackStore.corridors.length,
        corridors: fallbackStore.corridors,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getCorridorById(req, res, next) {
  try {
    const { corridorId } = req.params;
    const corridor = fallbackStore.corridors.find((c) => c.corridor_id === corridorId);

    if (!corridor) {
      return res.status(404).json({
        success: false,
        error: { code: "CORRIDOR_NOT_FOUND", message: `Corridor ${corridorId} not found` },
      });
    }

    const availability = fallbackStore.corridor_availability.filter((a) => a.corridor_id === corridorId);

    res.json({
      success: true,
      data: {
        corridor,
        availability,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCorridors,
  getCorridorById,
};
