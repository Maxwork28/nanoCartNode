const express = require('express');
const router = express.Router();

const { verifyTokenAndRole } = require('../../middlewares/verifyToken.js');
const {
  getTotalUsers,
  getTotalPartners,
  getTotalCategories,
  getTotalSubcategories,
  getTotalItems,
  getLowStockItems,
  getAllUsers,
  getAllPartners,
  toggleUserStatus,
  togglePartnerStatus,
  getUsersMonthlyTrends,
  getPartnersMonthlyTrends,
  getItemsMonthlyTrends,
  getCategoriesMonthlyTrends,
  getSubcategoriesMonthlyTrends,
  getInventoryMonthlyTrends,
  getRevenueMonthlyTrends,
  getOrdersMonthlyTrends,
} = require('../../controllers/adminSideController/adminCountTotalController.js');



// Route to get total count of Users (Admin and SubAdmin can access)
router.get('/users/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getTotalUsers);

// Route to get total count of Partners (Admin and SubAdmin can access)
router.get('/partners/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getTotalPartners);

// Route to get total count of Categories (Admin and SubAdmin can access)
router.get('/categories/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getTotalCategories);

// Route to get total count of Subcategories (Admin and SubAdmin can access)
router.get('/subcategories/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getTotalSubcategories);

// Route to get total count of Items (Admin and SubAdmin can access)
router.get('/items/total', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getTotalItems);

// Route to get low stock items count (Admin and SubAdmin can access)
router.get('/items/low-stock', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getLowStockItems);

// Route to get all users (Admin and SubAdmin can access)
router.get('/users', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getAllUsers);

// Route to toggle user active status (Admin and SubAdmin can access)
router.put('/users/:userId/toggle-status', ...verifyTokenAndRole(['Admin', 'SubAdmin']), toggleUserStatus);

// Route to get all partners (Admin and SubAdmin can access)
router.get('/partners', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getAllPartners);

// Route to toggle partner active status (Admin and SubAdmin can access)
router.put('/partners/:partnerId/toggle-status', ...verifyTokenAndRole(['Admin', 'SubAdmin']), togglePartnerStatus);

// Monthly trends routes (Admin and SubAdmin can access)
router.get('/users/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getUsersMonthlyTrends);
router.get('/partners/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getPartnersMonthlyTrends);
router.get('/items/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getItemsMonthlyTrends);
router.get('/categories/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getCategoriesMonthlyTrends);
router.get('/subcategories/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getSubcategoriesMonthlyTrends);
router.get('/inventory/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getInventoryMonthlyTrends);
router.get('/revenue/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getRevenueMonthlyTrends);
router.get('/orders/monthly-trends', ...verifyTokenAndRole(['Admin', 'SubAdmin']), getOrdersMonthlyTrends);

module.exports = router;