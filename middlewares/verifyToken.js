const jwt = require("jsonwebtoken");
const { apiResponse } = require("../utils/apiResponse");
require("dotenv").config();

// Main token verification function
exports.verifyToken = async (req, res, next) => {
  try {
    // Extract token only from Authorization header
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.replace("Bearer ", "")
      : null;
    console.log(token);

    if (token === null) {
      return res.status(404).json(apiResponse(false, 401, "Token is Missing"));
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not configured");
    }

    // Verify token (synchronous)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded ->", decoded);
    req.user = decoded;
    return next();
    
  } catch (error) {
    console.log(error.message)
    if (error.name === "JsonWebTokenError") {
      console.log("Token is Invalid")
      return res.status(404).json(apiResponse(false, 401, "Token is Invalid"));
    }
    if (error.name === "TokenExpiredError") {
      console.log("Token has Expired")
      return res.status(404).json(apiResponse(false, 401, "Token has Expired"));
    }
    return res
      .status(500)
      .json(
        apiResponse(
          false,
          500,
          "Something went wrong while validating the token"
        )
      );
  }
};

// Role verification function
exports.verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json(apiResponse(401, false, "Authentication required"));
      }

      // Check if user role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json(apiResponse(403, false, `Access denied. Required roles: ${allowedRoles.join(', ')}`));
      }

      // Special checks for SubAdmin
      if (req.user.role === "SubAdmin") {
        // Check if subadmin is active
        if (req.user.isSubAdminActive === false) {
          return res.status(403).json(apiResponse(403, false, "SubAdmin account is deactivated"));
        }
      }

      next();
    } catch (error) {
      console.error("Role verification error:", error);
      return res.status(500).json(apiResponse(500, false, "Internal server error"));
    }
  };
};

// Combined token and role verification
exports.verifyTokenAndRole = (allowedRoles) => {
  return [
    exports.verifyToken,
    exports.verifyRole(allowedRoles)
  ];
};

// Specific role middleware functions for backward compatibility
exports.isAdmin = exports.verifyRole(["Admin"]);
exports.isSubAdmin = exports.verifyRole(["SubAdmin"]);
exports.isUser = exports.verifyRole(["User"]);
exports.isPartner = exports.verifyRole(["Partner"]);
exports.isAdminOrSubAdmin = exports.verifyRole(["Admin", "SubAdmin"]);
exports.isAdminOrPartner = exports.verifyRole(["Admin", "Partner"]);
exports.isSubAdminOrPartner = exports.verifyRole(["SubAdmin", "Partner"]);
exports.isAdminOrSubAdminOrPartner = exports.verifyRole(["Admin", "SubAdmin", "Partner"]);
