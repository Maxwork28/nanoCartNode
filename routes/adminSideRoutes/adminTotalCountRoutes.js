const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/verifyToken.js');
const { isAdmin } = require('../../middlewares/isAdmin.js');
const {
  getTotalUsers,
  getTotalPartners,
  getTotalCategories,
  getTotalSubcategories,
  getTotalItems,
  getAllUsers,
  getAllPartners,
  getUsersMonthlyTrends,
  getPartnersMonthlyTrends,
  getItemsMonthlyTrends,
  getCategoriesMonthlyTrends,
  getSubcategoriesMonthlyTrends,
  getInventoryMonthlyTrends,
  getRevenueMonthlyTrends,
  getOrdersMonthlyTrends,
} = require('../../controllers/adminSideController/adminCountTotalController.js');



// Route to get total count of Users
router.get('/users/total', verifyToken, isAdmin, getTotalUsers);

// Route to get total count of Partners
router.get('/partners/total', verifyToken, isAdmin, getTotalPartners);

// Route to get total count of Categories
router.get('/categories/total', verifyToken, isAdmin, getTotalCategories);

// Route to get total count of Subcategories
router.get('/subcategories/total', verifyToken, isAdmin, getTotalSubcategories);

// Route to get total count of Items
router.get('/items/total', verifyToken, isAdmin, getTotalItems);

// Route to get all users
router.get('/users', verifyToken, isAdmin, getAllUsers);

// Route to get all partners
router.get('/partners', verifyToken, isAdmin, getAllPartners);

// Monthly trends routes
router.get('/users/monthly-trends', verifyToken, isAdmin, getUsersMonthlyTrends);
router.get('/partners/monthly-trends', verifyToken, isAdmin, getPartnersMonthlyTrends);
router.get('/items/monthly-trends', verifyToken, isAdmin, getItemsMonthlyTrends);
router.get('/categories/monthly-trends', verifyToken, isAdmin, getCategoriesMonthlyTrends);
router.get('/subcategories/monthly-trends', verifyToken, isAdmin, getSubcategoriesMonthlyTrends);
router.get('/inventory/monthly-trends', verifyToken, isAdmin, getInventoryMonthlyTrends);
router.get('/revenue/monthly-trends', verifyToken, isAdmin, getRevenueMonthlyTrends);
router.get('/orders/monthly-trends', verifyToken, isAdmin, getOrdersMonthlyTrends);

module.exports = router;