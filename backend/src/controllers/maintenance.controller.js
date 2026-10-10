// backend/src/controllers/maintenance.controller.js
const { fallbackStore } = require("../config/database");
const { checkConflict } = require("../services/maintenance.service");

async function getMaintenanceTasks(req, res, next) {
  try {
    const { department, sourceSystem, status } = req.query;
    let tasks = [...fallbackStore.maintenance_tasks];

    if (department) tasks = tasks.filter((t) => t.department.toLowerCase() === department.toLowerCase());
    if (sourceSystem) tasks = tasks.filter((t) => t.source_system.toUpperCase() === sourceSystem.toUpperCase());
    if (status) tasks = tasks.filter((t) => t.status.toUpperCase() === status.toUpperCase());

    res.json({
      success: true,
      data: {
        total: tasks.length,
        tasks,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMaintenanceTaskById(req, res, next) {
  try {
    const { taskId } = req.params;
    const task = fallbackStore.maintenance_tasks.find((t) => t.task_id === taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: "TASK_NOT_FOUND", message: `Maintenance task ${taskId} not found` },
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

async function postCheckConflict(req, res, next) {
  try {
    const { trackId, date, startTime, endTime } = req.body;

    if (!trackId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "trackId, startTime, and endTime are required" },
      });
    }

    const result = await checkConflict(trackId, date, startTime, endTime);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMaintenanceTasks,
  getMaintenanceTaskById,
  postCheckConflict,
};
