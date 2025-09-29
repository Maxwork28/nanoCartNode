// routes/partnerRoutes/partnerAuthRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { partnerSignup,partnerSignup1, verifyPartner, getPartnerProfiles } = require("../../controllers/partnerController/partnerAuthController");
const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Partner signup (B2C -> B2B transition)
router.post("/signup", upload.single("imageShop"), partnerSignup);

// Partner signup (B2C -> B2B transition)
router.post("/signup1", upload.single("imageShop"), partnerSignup1);

// Verify a partner (admin only)
router.post("/verify/:id", ...verifyTokenAndRole(['Admin']),auditLogger(), verifyPartner);

// Partner profile (protected)
router.get("/profile", ...verifyTokenAndRole(['Partner']), getPartnerProfiles);

// Export the router
module.exports = router;