const express = require("express");
const router = express.Router();

// Import the required Controller
const {
  addToWishlist,
  removeItemFromWishlist,
  getPartnerWishlist,
  getPartnerWishlistForAdmin
} = require("../../controllers/partnerController/partnerWishlistController");
const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');

// Route to add an item to the partner's wishlist
router.post("/create", ...verifyTokenAndRole(['Partner']), addToWishlist);

// Route to remove an item from the partner's wishlist 
router.put("/removeitem", ...verifyTokenAndRole(['Partner']), removeItemFromWishlist);

// Route to fetch the partner's wishlist
router.get("/", ...verifyTokenAndRole(['Partner']), getPartnerWishlist);

// Route to fetch the partner's wishlist for Admin or SubAdmin
router.get("/admin/:partnerId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getPartnerWishlistForAdmin);

module.exports = router;