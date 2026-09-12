// backend/src/server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const { PORT } = require("./config/env");
const { initializeDatabase } = require("../scripts/init_db");
const { errorHandler } = require("./middleware/errorHandler");

// Import route modules
const authRoutes = require("./routes/auth.routes");
const tracksRoutes = require("./routes/tracks.routes");
const requestsRoutes = require("./routes/requests.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");
const trainsRoutes = require("./routes/trains.routes");
const corridorsRoutes = require("./routes/corridors.routes");
const planningRoutes = require("./routes/planning.routes");
const usersRoutes = require("./routes/users.routes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Root Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "HEALTHY",
    service: "Automatic Block Planning System API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Mount REST Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/tracks", tracksRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/trains", trainsRoutes);
app.use("/api/corridors", corridorsRoutes);
app.use("/api/planning", planningRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Initialize Database Data & Start Listening
async function startServer() {
  await initializeDatabase();

  app.listen(PORT, () => {
    console.log(`===========================================================`);
    console.log(`🚀 RBPS Express Backend Server running on port ${PORT}`);
    console.log(`🌐 API Endpoint: http://localhost:${PORT}/api`);
    console.log(`===========================================================`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

module.exports = app;
