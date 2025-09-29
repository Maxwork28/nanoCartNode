const express = require('express');
const router = express.Router();
const { verifyTokenAndRole } = require('../../middlewares/verifyToken');
const { auditLogger } = require('../../middlewares/auditLogger');
const { updateOrderStatus, updatePaymentStatus, updateItemRefundStatus, updateDeliveryDate } = require("../../controllers/userOrderController/orderStatusMaintainAdminController");

router.put("/order-status", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateOrderStatus);
router.put("/payment-status", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updatePaymentStatus);
router.put("/item-refund-status", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateItemRefundStatus);
router.put("/item-refund-transaction", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateItemRefundStatus);
router.put("/delivery-date", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateDeliveryDate);

module.exports = router;