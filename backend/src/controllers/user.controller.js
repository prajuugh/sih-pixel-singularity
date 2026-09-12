// backend/src/controllers/user.controller.js
const bcrypt = require("bcryptjs");
const { query, fallbackStore } = require("../config/database");
const { persistLocalStore } = require("../services/local-store.service");

async function getAllUsers(req, res, next) {
  try {
    let dbUsers = [];
    try {
      const dbRes = await query(`SELECT id, name, email, role, department, created_at FROM users ORDER BY id ASC;`);
      if (dbRes?.rows?.length > 0) {
        dbUsers = dbRes.rows;
      }
    } catch (e) {
      // Database offline, use memory store
    }

    // Merge database users with fallbackStore.users without duplicates
    const allEmails = new Set(dbUsers.map((u) => (u.email || "").toLowerCase()));
    const merged = [...dbUsers];

    for (const u of fallbackStore.users) {
      if (u.email && !allEmails.has(u.email.toLowerCase())) {
        allEmails.add(u.email.toLowerCase());
        merged.push({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          created_at: u.created_at,
        });
      }
    }

    const formatted = merged.map((u) => {
      const rawRole = (u.role || "TEAMS").toUpperCase();
      const roleDisplayName =
        rawRole === "ADMIN" ? "Admin" : rawRole === "OFFICER" ? "Officer" : "Teams";

      return {
        id: u.id,
        name: u.name,
        username: u.email ? u.email.split("@")[0] : (u.name || "user"),
        email: u.email,
        role: roleDisplayName,
        department: u.department || "—",
        createdAt: u.created_at,
      };
    });

    res.json({
      success: true,
      data: { users: formatted, total: formatted.length },
    });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role = "Teams", department = "—" } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Name, email, and password are required." },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = (role || "TEAMS").toUpperCase();

    if (normalizedRole === "ADMIN") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Admins cannot create another admin account." },
      });
    }

    const validRoles = ["OFFICER", "TEAMS"];
    const finalRole = validRoles.includes(normalizedRole) ? normalizedRole : "TEAMS";
    let finalDept = department && department.trim() ? department.trim() : "—";
    if (finalRole === "OFFICER" && (!finalDept || finalDept === "—")) {
      finalDept = "Any Department";
    }

    // Check if user already exists in fallbackStore or DB
    const existingFallback = fallbackStore.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );
    if (existingFallback) {
      return res.status(409).json({
        success: false,
        error: { code: "USER_EXISTS", message: `A user with email "${email}" already exists.` },
      });
    }

    try {
      const existingDb = await query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1;`, [normalizedEmail]);
      if (existingDb?.rows?.length > 0) {
        return res.status(409).json({
          success: false,
          error: { code: "USER_EXISTS", message: `A user with email "${email}" already exists.` },
        });
      }
    } catch (e) {
      // Database offline or query error, proceed with fallback
    }

    // Hash the password securely with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into PostgreSQL / Supabase users table
    let createdId = fallbackStore.users.length + 1;
    try {
      const dbRes = await query(
        `INSERT INTO users (name, email, password_hash, role, department) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (email) DO NOTHING 
         RETURNING id, name, email, role, department, created_at;`,
        [name.trim(), normalizedEmail, passwordHash, finalRole, finalDept]
      );
      if (dbRes?.rows?.length > 0) {
        createdId = dbRes.rows[0].id;
      }
    } catch (dbErr) {
      console.warn("DB insert into users table note:", dbErr.message);
    }

    const newUser = {
      id: createdId,
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: finalRole,
      department: finalDept,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    fallbackStore.users.push(newUser);
    persistLocalStore(fallbackStore);

    const roleDisplayName =
      finalRole === "ADMIN" ? "Admin" : finalRole === "OFFICER" ? "Officer" : "Teams";

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          username: newUser.email.split("@")[0],
          email: newUser.email,
          role: roleDisplayName,
          department: newUser.department,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllUsers, createUser };
