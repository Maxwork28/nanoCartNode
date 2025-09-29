const { apiResponse } = require("../utils/apiResponse");

exports.isSubAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json(apiResponse(401, false, "Authentication required"));
    }

    // Check if user role is SubAdmin
    if (req.user.role !== "SubAdmin") {
      return res.status(403).json(apiResponse(403, false, "SubAdmin access required"));
    }

    // Check if subadmin is active
    if (req.user.isSubAdminActive === false) {
      return res.status(403).json(apiResponse(403, false, "SubAdmin account is deactivated"));
    }

    next();
  } catch (error) {
    console.error("SubAdmin middleware error:", error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};
