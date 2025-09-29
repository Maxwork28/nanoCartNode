const express = require('express');
const router = express.Router();
const { verifyToken, verifyTokenAndRole } = require('../../middlewares/verifyToken');
const { auditLogger } = require('../../middlewares/auditLogger');
const {
  createUserOrder,
  verifyPayment,
  FetchOrderHistory,
  FetchOrderHistoryByAdmin,
  cancelOrder,
  fetchOrderByOrderId,
  returnRefund,
  returnAndExchange,
  handlePhonePeCallback,
} = require('../../controllers/userOrderController/userOrdersControllerSir');

// User Routes
router.post('/create', ...verifyTokenAndRole(['User']), createUserOrder);
router.get("/:orderId", ...verifyTokenAndRole(['User']), fetchOrderByOrderId);
router.get('/', ...verifyTokenAndRole(['User']), FetchOrderHistory);

router.post('/verify-payment', ...verifyTokenAndRole(['User']), verifyPayment);
router.post('/phonepe/callback', handlePhonePeCallback);

router.post('/cancel', ...verifyTokenAndRole(['User']), cancelOrder);
router.post('/return-refund', ...verifyTokenAndRole(['User']), returnRefund);
router.post('/return-exchange', ...verifyTokenAndRole(['User']), returnAndExchange);


router.get('/admin/:userId', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), FetchOrderHistoryByAdmin);

module.exports = router;