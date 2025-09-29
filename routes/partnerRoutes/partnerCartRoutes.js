const express = require("express");
const router = express.Router();
const { auditLogger } = require('../../middlewares/auditLogger');
// Import the required Controller
const {
  addToCart,
  removeItemFromCart,
  getPartnerCart,
  getPartnerCartByAdmin,
  updateItemQuantityBySizeAction
} = require("../../controllers/partnerController/partnerCartController");

const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken");

// Route to add an item to the partner's cart
router.post("/create", ...verifyTokenAndRole(['Partner']), addToCart);

// Route to update item quantity in the partner's cart
router.patch("/update-quantity", ...verifyTokenAndRole(['Partner']), updateItemQuantityBySizeAction);

// Route to remove an item from the partner's cart
router.delete("/removeitem", ...verifyTokenAndRole(['Partner']), removeItemFromCart);

// Route to fetch the partner's cart
router.get("/", ...verifyTokenAndRole(['Partner']), getPartnerCart);

// Route to fetch the partner's cart by admin (Admin and SubAdmin can access)
router.get("/admin/:partnerId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getPartnerCartByAdmin);

module.exports = router;