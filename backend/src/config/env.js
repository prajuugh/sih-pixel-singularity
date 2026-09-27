// backend/src/config/env.js
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  JWT_SECRET: process.env.JWT_SECRET || "railway_block_planning_super_secret_jwt_key_2026",
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL || "http://127.0.0.1:5001",
  APP_URL: process.env.APP_URL || process.env.FRONTEND_URL || "http://13.201.193.163:5000",
  // SMTP Configuration
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || "",
  SMTP_FROM: process.env.SMTP_FROM || (process.env.SMTP_USER || "noreply@rbps.railnet.gov.in"),
  SMTP_SECURE: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
};

