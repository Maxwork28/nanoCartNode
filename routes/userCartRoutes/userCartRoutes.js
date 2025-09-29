const express = require("express");
const router = express.Router();
const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken");

// Import Cart Controllers
const {
  addToCart,
  removeItemFromCart,
  getUserCart,
  getUserCartByAdmin,
  updateCartItemQuantity
} = require("../../controllers/userCartController/userCartController");
const { auditLogger } = require('../../middlewares/auditLogger');

// Route to create item in User's cart
router.post("/create", ...verifyTokenAndRole(['User']), addToCart);

// Route to Remove item in User's cart
router.delete(
  "/removeitem",
  ...verifyTokenAndRole(['User']),
  removeItemFromCart
);

// Route to update item quantity in partner's cart
router.put("/update-quantity", ...verifyTokenAndRole(['User']), updateCartItemQuantity);

router.get("/", ...verifyTokenAndRole(['User']), getUserCart);

// Admin can view any user's cart
router.get("/admin/:userId", ...verifyTokenAndRole(['Admin','SubAdmin']),auditLogger(), getUserCartByAdmin);

module.exports = router;
