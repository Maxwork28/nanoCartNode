const express = require('express');
const router = express.Router();
const { auditLogger } = require('../../middlewares/auditLogger');

const { verifyTokenAndRole } = require('../../middlewares/verifyToken.js');
const {
  getUserOrderDetails,
  getAllOrders,
  filterOrdersByStatus,
  filterOrdersByPaymentMode,
  getTotalRevenue,
  getFilteredTotalRevenue,
  getItemsByOrderedNumber,
  getPartnerOrderDetails,
  getTotalUserOrdersCount,
  getTotalPartnerOrdersCount,
  getTotalConfirmedUserOrdersCount,
  getTotalConfirmedPartnerOrdersCount,
  getTotalPendingUserOrdersCount,
  getTotalPendingPartnerOrdersCount,
  getTotalCancelledUserOrdersCount,
  getTotalReturnedUserOrdersCount,
  getTotalReturnedPartnerOrdersCount,
  getTotalExchangedUserOrdersCount,
  getTotalDispatchedUserOrdersCount,
  getAllPendingOrdersUser,
  getAllCancelledOrdersUser,
  getAllReturnedOrdersUser,
  getAllExchangedOrdersUser,
  getAllDispatchedOrdersUser,
  getAllPendingOrdersPartner,
  getAllReturnedOrdersPartner,
  getAllDispatchedOrdersPartner,
  getAllUserOrders,
  getAllPartnerOrders,
  getOrderStats
} = require('../../controllers/adminSideController/adminOrderController.js');

// Route to get user order details (Admin and SubAdmin can access)
router.get('/users/:userId/orders', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getUserOrderDetails);

// Route to get all orders (user and partner) with enhanced filtering (Admin and SubAdmin can access)
router.get('/orders/all', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllOrders);

// Route to get order statistics and filter options (Admin and SubAdmin can access)
router.get('/orders/stats', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getOrderStats);

// Route to get all user orders (Admin and SubAdmin can access)
router.get('/user-orders', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllUserOrders);

// Route to get all partner orders (Admin and SubAdmin can access)
router.get('/partner-orders', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllPartnerOrders);

// Route to filter orders by status (Admin and SubAdmin can access)
router.get('/orders/filter/status', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), filterOrdersByStatus);

// Route to filter orders by payment mode (Admin and SubAdmin can access)
router.get('/orders/filter/payment-mode', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), filterOrdersByPaymentMode);

// Route to get total revenue (Admin and SubAdmin can access)
router.get('/revenue/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalRevenue);

// Route to get total revenue (Admin and SubAdmin can access)
router.get('/revenue/total/filter', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getFilteredTotalRevenue);

// Route to get items by ordered number (Admin and SubAdmin can access)
router.get('/items/ordered', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getItemsByOrderedNumber);

// Route to get partner order details (Admin and SubAdmin can access)
router.get('/partner/:partnerId/orders', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getPartnerOrderDetails);

// Suggested routes for additional controller functions (Admin and SubAdmin can access)
router.get('/orders/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalUserOrdersCount);
router.get('/orders/total/partner', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalPartnerOrdersCount);
router.get('/orders/confirmed/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalConfirmedUserOrdersCount);
router.get('/orders/confirmed/total/partner', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalConfirmedPartnerOrdersCount);
router.get('/orders/pending/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalPendingUserOrdersCount);
router.get('/orders/pending/total/partner', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalPendingPartnerOrdersCount);
router.get('/orders/cancelled/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalCancelledUserOrdersCount);
router.get('/orders/returned/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalReturnedUserOrdersCount);
router.get('/orders/returned/total/partner', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalReturnedPartnerOrdersCount);
router.get('/orders/exchanged/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalExchangedUserOrdersCount);
router.get('/orders/dispatched/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getTotalDispatchedUserOrdersCount);

// Order status routes (Admin and SubAdmin can access)
router.get('/orders/pending', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllPendingOrdersUser);
router.get('/orders/cancelled', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllCancelledOrdersUser);
router.get('/orders/returned', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllReturnedOrdersUser);
router.get('/orders/exchanged', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllExchangedOrdersUser);
router.get('/orders/dispatched', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllDispatchedOrdersUser);

// Partner order status routes (Admin and SubAdmin can access)
router.get("/orders/pending/partner", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllPendingOrdersPartner);
router.get("/orders/returned/partner", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllReturnedOrdersPartner);
router.get("/orders/dispatched/partner", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(),     getAllDispatchedOrdersPartner);

module.exports = router;