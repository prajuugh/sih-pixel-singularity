// backend/src/middleware/roles.js

function normalizeRole(role) {
  const r = String(role || "").toUpperCase().trim();
  if (r === "ADMIN" || r === "SUPERADMIN") return "ADMIN";
  if (r.includes("OFFICER") || r.includes("CONTROLLER")) return "OFFICER";
  if (r === "TEAM" || r === "TEAMS" || r.includes("ENG") || r.includes("MAINTENANCE") || r.includes("FIELD") || r.includes("CREW")) return "TEAMS";
  return r;
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User authentication required" },
      });
    }

    const userRawRole = (req.user.role || "").toUpperCase().trim();
    const userRole = normalizeRole(userRawRole);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

    const isAllowed =
      userRole === "ADMIN" ||
      userRawRole === "ADMIN" ||
      normalizedAllowed.includes(userRole) ||
      allowedRoles.some((r) => {
        const nr = r.toUpperCase().trim();
        return (
          userRawRole === nr ||
          userRawRole.includes(nr) ||
          nr.includes(userRawRole) ||
          (nr === "TEAMS" && (userRawRole === "TEAM" || userRawRole.includes("ENG"))) ||
          (nr === "OFFICER" && userRawRole.includes("OFFICER"))
        );
      });

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires one of roles: ${allowedRoles.join(", ")}`,
        },
      });
    }

    next();
  };
}

module.exports = { requireRole, normalizeRole };
