// backend/src/config/env.js
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "railway_block_planning_super_secret_jwt_key_2026",
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL || "http://127.0.0.1:5001",
};
