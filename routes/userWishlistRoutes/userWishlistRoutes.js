const express = require("express");
const router = express.Router();

// Import the required Controller
const {
  addToWishlist,
  removeItemFromWishlist,
  getUserWishlist,
  getUserWishlistByAdmin
} = require("../../controllers/userWishlistController/userWishlistController");

const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');
  
// Route to add an item to the wishlist
router.post("/create", ...verifyTokenAndRole(['User']), addToWishlist);

// Route to remove an item from the wishlist
router.put("/remove", ...verifyTokenAndRole(['User']), removeItemFromWishlist);

// Route to fetch the user's wishlist
router.get("/", ...verifyTokenAndRole(['User']), getUserWishlist);

// Route to fetch the user's wishlist (Admin and SubAdmin can access)
router.get("/admin/:userId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getUserWishlistByAdmin);

module.exports = router;
