// backend/src/middleware/roles.js
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User authentication required" },
      });
    }

    const userRole = (req.user.role || "").toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    if (!normalizedAllowed.includes(userRole) && userRole !== "ADMIN") {
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
