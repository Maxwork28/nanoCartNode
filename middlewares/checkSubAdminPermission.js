const { apiResponse } = require("../utils/apiResponse");

// Middleware to check if SubAdmin has specific permission
exports.checkSubAdminPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json(apiResponse(401, false, "Authentication required"));
      }

      // If user is Admin, allow all actions
      if (req.user.role === "Admin") {
        return next();
      }

      // If user is SubAdmin, check permissions
      if (req.user.role === "SubAdmin") {
        // Check if subadmin is active
        if (req.user.isSubAdminActive === false) {
          return res.status(403).json(apiResponse(403, false, "SubAdmin account is deactivated"));
        }

        // Check if SubAdmin has the required permission
        if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
          return res.status(403).json(apiResponse(403, false, `Permission denied. Required permission: ${requiredPermission}`));
        }

        return next();
      }

      // If user is not Admin or SubAdmin
      return res.status(403).json(apiResponse(403, false, "Admin or SubAdmin access required"));

    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json(apiResponse(500, false, "Internal server error"));
    }
  };
};

// Middleware to check if user can manage SubAdmins (Admin only)
exports.checkSubAdminManagement = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json(apiResponse(401, false, "Authentication required"));
    }

    // Only Admin can manage SubAdmins
    if (req.user.role !== "Admin") {
      return res.status(403).json(apiResponse(403, false, "Admin access required for SubAdmin management"));
    }

    next();
  } catch (error) {
    console.error("SubAdmin management check error:", error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Middleware to check if user can view audit logs (Admin only)
exports.checkAuditLogAccess = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json(apiResponse(401, false, "Authentication required"));
    }

    // Only Admin can view audit logs
    if (req.user.role !== "Admin") {
      return res.status(403).json(apiResponse(403, false, "Admin access required for audit logs"));
    }

    next();
  } catch (error) {
    console.error("Audit log access check error:", error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};
