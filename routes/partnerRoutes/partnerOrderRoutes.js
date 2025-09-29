const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');
const {
  createPartnerOrder,
  returnAndRefund,
  fetchAllPartnerOrders,
  fetchPartnerOrderByOrderId,
  creditRefundToWallet,
  updateOrderStatus,
  updatePaymentStatus,
  updateDeliveryDate,
} = require("../../controllers/partnerController/partnerOrderController");

// Configure Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create a new order (with cheque image upload)
router.post(
  "/create",
  ...verifyTokenAndRole(['Partner']),
  upload.single("chequeImageFile"),
  createPartnerOrder
);

// Fetch all orders for a partner
router.get("/", ...verifyTokenAndRole(['Partner']), fetchAllPartnerOrders);

// Fetch a specific order by orderId
router.get("/:orderId", ...verifyTokenAndRole(['Partner']), fetchPartnerOrderByOrderId);

// Request return and refund
router.post("/return-refund", ...verifyTokenAndRole(['Partner']), returnAndRefund);

// Credit refund amount to wallet (Admin and SubAdmin can access)
router.post("/credit-refund", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), creditRefundToWallet);

// Update order status (Admin and SubAdmin can access)
router.put("/status", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateOrderStatus);

// Update payment status (Admin and SubAdmin can access)
router.put("/payment-status", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updatePaymentStatus);

// Update delivery date (Admin and SubAdmin can access)
router.put("/delivery-date", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateDeliveryDate);

module.exports = router;
