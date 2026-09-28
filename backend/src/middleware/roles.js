// backend/src/middleware/roles.js
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User authentication required" },
      });
    }

    const userRole = (req.user.role || "").toUpperCase().trim();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase().trim());

    const isAllowed =
      userRole === "ADMIN" ||
      normalizedAllowed.includes(userRole) ||
      normalizedAllowed.some((r) => userRole.includes(r) || (r === "OFFICER" && userRole.endsWith("OFFICER")));

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

module.exports = { requireRole };
