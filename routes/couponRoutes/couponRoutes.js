const express = require('express');
const router = express.Router();
const { createCoupon, applyCouponByPartner, applyCouponByUser, updateCoupon, deleteCoupon, getAllCoupons } = require('../../controllers/couponController/couponController'); // Adjusted path
const { verifyToken, verifyTokenAndRole } = require('../../middlewares/verifyToken');
const { auditLogger } = require('../../middlewares/auditLogger');
// Create a new coupon (Admin and SubAdmin can access)
router.post('/create', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), createCoupon);

// Apply a coupon to a purchase amount (Partner only)
router.post('/apply-partner', ...verifyTokenAndRole(['Partner']), applyCouponByPartner);

// Apply a coupon to a purchase amount (User only)
router.post('/apply-user', ...verifyTokenAndRole(['User']), applyCouponByUser);

// Update a coupon by couponCode (Admin and SubAdmin can access)
router.put('/update', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateCoupon);

// Delete a coupon by couponCode (Admin and SubAdmin can access)
router.delete('/delete', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteCoupon);

// Get all coupons (Admin and SubAdmin can access)
router.get('/', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllCoupons);

module.exports = router;