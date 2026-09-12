// backend/src/routes/users.routes.js
const express = require("express");
const router = express.Router();
const { getAllUsers, createUser } = require("../controllers/user.controller");

router.get("/", getAllUsers);
router.post("/", createUser);

module.exports = router;
