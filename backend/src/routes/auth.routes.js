// backend/src/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const {
  login,
  getMe,
  getAllUsers,
  createUser,
  deleteUser,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth");

router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.get("/users", requireAuth, getAllUsers);
router.post("/users", requireAuth, createUser);
router.delete("/users/:id", requireAuth, deleteUser);

// Password Management & Recovery
router.post("/change-password", changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;


