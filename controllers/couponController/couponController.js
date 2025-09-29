const mongoose = require('mongoose');
const Coupon = require('../../models/Coupon/Coupon'); // Adjust path to your Coupon model
const { apiResponse } = require('../../utils/apiResponse'); // Adjust path to your apiResponse utility

exports.createCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      discountType,
      discountValue,
      minimumPurchase,
      expirationDate,
      isActive = true,
      maxUses,
      maxDiscount,
      usesPerUser,
      applicableCategories,
      description,
    } = req.body;

    // Validate required fields
    if (!couponCode || !discountType || discountValue === undefined || !expirationDate) {
      return res.status(400).json(apiResponse(400, false, 'Missing required fields: couponCode, discountType, discountValue, and expirationDate are required'));
    }

    // Validate discountType
    if (!['Percentage', 'Flat', 'FreeShipping'].includes(discountType)) {
      return res.status(400).json(apiResponse(400, false, 'Invalid discount type. Must be "Percentage", "Flat", or "FreeShipping"'));
    }

    // Validate discountValue
    if (discountType === 'Percentage' && (discountValue > 100 || discountValue <= 0)) {
      return res.status(400).json(apiResponse(400, false, 'Percentage discount must be between 0 and 100'));
    }
    if (discountType === 'Flat' && discountValue <= 0) {
      return res.status(400).json(apiResponse(400, false, 'Flat discount must be greater than 0'));
    }
    if (discountType === 'FreeShipping' && discountValue !== 0) {
      return res.status(400).json(apiResponse(400, false, 'Free shipping discount value must be 0'));
    }

    // Validate minimumPurchase
    if (minimumPurchase && minimumPurchase < 0) {
      return res.status(400).json(apiResponse(400, false, 'Minimum purchase cannot be negative'));
    }

    // Validate expiration date
    const expiration = new Date(expirationDate);
    if (isNaN(expiration.getTime()) || expiration <= new Date()) {
      return res.status(400).json(apiResponse(400, false, 'Expiration date must be a valid date in the future'));
    }

    // Validate maxUses
    if (maxUses !== undefined && (maxUses < 0 || (maxUses === 0 && maxUses !== null))) {
      return res.status(400).json(apiResponse(400, false, 'Max uses cannot be negative or zero unless unlimited (null)'));
    }

    // Validate usesPerUser
    if (usesPerUser !== undefined && (usesPerUser < 1 || !Number.isInteger(usesPerUser))) {
      return res.status(400).json(apiResponse(400, false, 'Uses per user must be a positive integer'));
    }

    // Validate maxDiscount
    if (maxDiscount !== undefined && (maxDiscount < 0 || (maxDiscount === 0 && maxDiscount !== null))) {
      return res.status(400).json(apiResponse(400, false, 'Max discount cannot be negative or zero unless unlimited (null)'));
    }

    // Validate applicableCategories
    if (applicableCategories && !Array.isArray(applicableCategories)) {
      return res.status(400).json(apiResponse(400, false, 'Applicable categories must be an array'));
    }

    // Validate description
    if (description && typeof description !== 'string') {
      return res.status(400).json(apiResponse(400, false, 'Description must be a string'));
    }

    // Check if couponCode already exists
    const existingCoupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json(apiResponse(400, false, 'Coupon code already exists'));
    }

    const coupon = new Coupon({
      couponCode: couponCode.toUpperCase(),
      discountType,
      discountValue,
      minimumPurchase: minimumPurchase || 0,
      expirationDate: expiration,
      isActive,
      maxUses,
      maxDiscount,
      usesPerUser,
      applicableCategories: applicableCategories || [],
      description: description || '',
    });

    await coupon.save();

    return res.status(201).json(apiResponse(201, true, 'Coupon created successfully', coupon));
  } catch (error) {
    return res.status(500).json(apiResponse(500, false, error.message || 'Internal server error'));
  }
};

exports.applyCouponByPartner = async (req, res) => {
  try {
    const { couponCode, totalAmount, categories } = req.body;
    const { partnerId } = req.user;

    if (!couponCode || typeof couponCode !== 'string' || couponCode.trim() === '') {
      return res.status(400).json(apiResponse(400, false, 'Coupon code is required'));
    }
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json(apiResponse(400, false, 'Invalid partner ID'));
    }
    if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json(apiResponse(400, false, 'Invalid total amount'));
    }
    if (categories && !Array.isArray(categories)) {
      return res.status(400).json(apiResponse(400, false, 'Categories must be an array'));
    }

    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json(apiResponse(404, false, 'Coupon not found or inactive'));
    }

    const partnerObjectId = new mongoose.Types.ObjectId(partnerId);
    if (coupon.couponUserIdUsed.some(id => id.equals(partnerObjectId))) {
      return res.status(400).json(apiResponse(400, false, 'Coupon already used by partner'));
    }

    if (new Date(coupon.expirationDate) < new Date()) {
      return res.status(400).json(apiResponse(400, false, 'Coupon has expired'));
    }

    if (coupon.maxUses !== null && coupon.couponUserIdUsed.length >= coupon.maxUses) {
      return res.status(400).json(apiResponse(400, false, 'Coupon has reached its maximum usage limit'));
    }

    const partnerUses = coupon.couponUserIdUsed.filter(id => id.equals(partnerObjectId)).length;
    if (partnerUses >= coupon.usesPerUser) {
      return res.status(400).json(apiResponse(400, false, 'You have exceeded the maximum uses per partner'));
    }

    if (totalAmount < coupon.minimumPurchase) {
      return res.status(400).json(apiResponse(400, false, `Minimum purchase of ₹${coupon.minimumPurchase} required`));
    }

    if (coupon.applicableCategories.length > 0 && !categories) {
      return res.status(400).json(apiResponse(400, false, 'Applicable categories are required for this coupon'));
    }
    if (categories && !coupon.applicableCategories.some(cat => categories.includes(cat))) {
      return res.status(400).json(apiResponse(400, false, 'Coupon not applicable to selected categories'));
    }

    const { discountValue, discountType } = coupon;
    let calculatedDiscount = discountValue;
    if (discountType === 'Percentage') {
      calculatedDiscount = (totalAmount * discountValue) / 100;
    } else if (discountType === 'FreeShipping') {
      calculatedDiscount = 0; // No discount for free shipping, handled separately in business logic
    }
    if (calculatedDiscount > totalAmount && discountType !== 'FreeShipping') {
      return res.status(400).json(apiResponse(400, false, 'Discount value is greater than total amount'));
    }

    coupon.couponUserIdUsed.push(partnerObjectId);
    await coupon.save();

    return res.status(200).json(apiResponse(200, true, 'Coupon applied successfully', {
      couponCode,
      discountType,
      discountValue,
      calculatedDiscount,
    }));
  } catch (error) {
    return res.status(500).json(apiResponse(500, false, error.message || 'Internal server error'));
  }
};

exports.applyCouponByUser = async (req, res) => {
  try {
    const { couponCode, totalAmount, categories } = req.body;
    const { userId } = req.user;

    if (!couponCode || typeof couponCode !== 'string' || couponCode.trim() === '') {
      return res.status(400).json(apiResponse(400, false, 'Coupon code is required'));
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json(apiResponse(400, false, 'Invalid user ID'));
    }
    if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
      return res.status(400).json(apiResponse(400, false, 'Invalid total amount'));
    }
    if (categories && !Array.isArray(categories)) {
      return res.status(400).json(apiResponse(400, false, 'Categories must be an array'));
    }

    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase(), isActive: true });

    if (!coupon) {
      return res.status(404).json(apiResponse(404, false, 'Coupon not found or inactive'));
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (coupon.couponUserIdUsed.some(id => id.equals(userObjectId))) {
      return res.status(400).json(apiResponse(400, false, 'Coupon already used by user'));
    }

    if (new Date(coupon.expirationDate) < new Date()) {
      return res.status(400).json(apiResponse(400, false, 'Coupon has expired'));
    }

    if (coupon.maxUses !== null && coupon.couponUserIdUsed.length >= coupon.maxUses) {
      return res.status(400).json(apiResponse(400, false, 'Coupon has reached its maximum usage limit'));
    }

    const userUses = coupon.couponUserIdUsed.filter(id => id.equals(userObjectId)).length;
    if (userUses >= coupon.usesPerUser) {
      return res.status(400).json(apiResponse(400, false, 'You have exceeded the maximum uses per user'));
    }

    if (totalAmount < coupon.minimumPurchase) {
      return res.status(400).json(apiResponse(400, false, `Minimum purchase of ₹${coupon.minimumPurchase} required`));
    }

    if (coupon.applicableCategories.length > 0 && !categories) {
      return res.status(400).json(apiResponse(400, false, 'Applicable categories are required for this coupon'));
    }
    if (categories && !coupon.applicableCategories.some(cat => categories.includes(cat))) {
      return res.status(400).json(apiResponse(400, false, 'Coupon not applicable to selected categories'));
    }

    const { discountValue, discountType } = coupon;
    let calculatedDiscount = discountValue;
    if (discountType === 'Percentage') {
      calculatedDiscount = (totalAmount * discountValue) / 100;
    } else if (discountType === 'FreeShipping') {
      calculatedDiscount = 0; // No discount for free shipping, handled separately in business logic
    }
    if (calculatedDiscount > totalAmount && discountType !== 'FreeShipping') {
      return res.status(400).json(apiResponse(400, false, 'Discount value is greater than total amount'));
    }

    coupon.couponUserIdUsed.push(userObjectId);
    await coupon.save();

    return res.status(200).json(apiResponse(200, true, 'Coupon applied successfully', {
      couponCode,
      discountType,
      discountValue,
      calculatedDiscount,
    }));
  } catch (error) {
    return res.status(500).json(apiResponse(500, false, error.message || 'Internal server error'));
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { couponCode, discountType, discountValue, minimumPurchase, expirationDate, isActive, maxUses, maxDiscount, usesPerUser, applicableCategories, description } = req.body;

    if (!couponCode) {
      return res.status(400).json(apiResponse(400, false, 'Coupon code is required'));
    }

    const coupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });

    if (!coupon) {
      return res.status(404).json(apiResponse(404, false, 'Coupon not found'));
    }

    // Update only provided fields
    if (discountType && ['Percentage', 'Flat', 'FreeShipping'].includes(discountType)) {
      coupon.discountType = discountType;
    } else if (discountType) {
      return res.status(400).json(apiResponse(400, false, 'Invalid discount type. Must be "Percentage", "Flat", or "FreeShipping"'));
    }

    if (discountValue !== undefined) {
      if (coupon.discountType === 'Percentage' && (discountValue > 100 || discountValue <= 0)) {
        return res.status(400).json(apiResponse(400, false, 'Percentage discount must be between 0 and 100'));
      }
      if (coupon.discountType === 'Flat' && discountValue <= 0) {
        return res.status(400).json(apiResponse(400, false, 'Flat discount must be greater than 0'));
      }
      if (coupon.discountType === 'FreeShipping' && discountValue !== 0) {
        return res.status(400).json(apiResponse(400, false, 'Free shipping discount value must be 0'));
      }
      coupon.discountValue = discountValue;
    }

    if (minimumPurchase !== undefined) {
      if (minimumPurchase < 0) {
        return res.status(400).json(apiResponse(400, false, 'Minimum purchase cannot be negative'));
      }
      coupon.minimumPurchase = minimumPurchase;
    }

    if (expirationDate) {
      const expiration = new Date(expirationDate);
      if (isNaN(expiration.getTime()) || expiration <= new Date()) {
        return res.status(400).json(apiResponse(400, false, 'Expiration date must be a valid date in the future'));
      }
      coupon.expirationDate = expiration;
    }

    if (isActive !== undefined) {
      coupon.isActive = isActive;
    }

    if (maxUses !== undefined) {
      if (maxUses < 0 || (maxUses === 0 && maxUses !== null)) {
        return res.status(400).json(apiResponse(400, false, 'Max uses cannot be negative or zero unless unlimited (null)'));
      }
      coupon.maxUses = maxUses;
    }

    if (usesPerUser !== undefined) {
      if (usesPerUser < 1 || !Number.isInteger(usesPerUser)) {
        return res.status(400).json(apiResponse(400, false, 'Uses per user must be a positive integer'));
      }
      coupon.usesPerUser = usesPerUser;
    }

    if (maxDiscount !== undefined) {
      if (maxDiscount < 0 || (maxDiscount === 0 && maxDiscount !== null)) {
        return res.status(400).json(apiResponse(400, false, 'Max discount cannot be negative or zero unless unlimited (null)'));
      }
      coupon.maxDiscount = maxDiscount;
    }

    if (applicableCategories !== undefined) {
      if (!Array.isArray(applicableCategories)) {
        return res.status(400).json(apiResponse(400, false, 'Applicable categories must be an array'));
      }
      coupon.applicableCategories = applicableCategories;
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json(apiResponse(400, false, 'Description must be a string'));
      }
      coupon.description = description;
    }

    await coupon.save();

    return res.status(200).json(apiResponse(200, true, 'Coupon updated successfully', coupon));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json(apiResponse(400, false, 'Coupon code already exists'));
    }
    return res.status(500).json(apiResponse(500, false, error.message || 'Internal server error'));
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode || typeof couponCode !== 'string' || couponCode.trim() === '') {
      return res.status(400).json(apiResponse(400, false, 'Coupon code is required'));
    }

    const deletedCoupon = await Coupon.findOneAndDelete({ couponCode: couponCode.toUpperCase() });

    if (!deletedCoupon) {
      return res.status(404).json(apiResponse(404, false, 'Coupon not found'));
    }

    return res.status(200).json(apiResponse(200, true, 'Coupon deleted successfully', {
      couponCode: deletedCoupon.couponCode,
    }));
  } catch (error) {
    return res.status(500).json(apiResponse(500, false, error.message || 'Internal server error'));
  }
};

exports.getAllCoupons = async (req, res) => {
  try {
    // Extract pagination and filtering parameters
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'all', // all, active, inactive, expired
      discountType = 'all', // all, Percentage, Flat, FreeShipping
      minValue = '',
      maxValue = ''
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Validate sort parameters
    const validSortFields = ['createdAt', 'updatedAt', 'couponCode', 'discountValue', 'expirationDate', 'isActive'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Build filter query
    let filterQuery = {};

    // Search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filterQuery.$or = [
        { couponCode: searchRegex },
        { description: searchRegex },
        { discountType: searchRegex }
      ];
    }

    // Status filter
    if (status !== 'all') {
      const currentDate = new Date();
      switch (status) {
        case 'active':
          filterQuery.isActive = true;
          filterQuery.expirationDate = { $gt: currentDate };
          break;
        case 'inactive':
          filterQuery.isActive = false;
          break;
        case 'expired':
          filterQuery.expirationDate = { $lte: currentDate };
          break;
      }
    }

    // Discount type filter
    if (discountType !== 'all') {
      filterQuery.discountType = discountType;
    }

    // Value range filter
    if (minValue !== '' || maxValue !== '') {
      filterQuery.discountValue = {};
      if (minValue !== '') {
        filterQuery.discountValue.$gte = parseFloat(minValue);
      }
      if (maxValue !== '') {
        filterQuery.discountValue.$lte = parseFloat(maxValue);
      }
    }

    console.log('🔍 [GET ALL COUPONS] Filter Query:', JSON.stringify(filterQuery, null, 2));
    console.log('📊 [GET ALL COUPONS] Pagination:', { page: pageNum, limit: limitNum, skip });

    // Get total count for pagination
    const totalCoupons = await Coupon.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalCoupons / limitNum);

    // Get coupons with pagination and sorting
    const coupons = await Coupon.find(filterQuery)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance

    // Calculate pagination info
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    const startIndex = skip + 1;
    const endIndex = Math.min(skip + limitNum, totalCoupons);

    // Prepare response data
    const responseData = {
      coupons,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCoupons,
        hasNextPage,
        hasPrevPage,
        limit: limitNum,
        startIndex,
        endIndex
      },
      filters: {
        search: search || '',
        status,
        discountType,
        minValue: minValue || '',
        maxValue: maxValue || '',
        sortBy: sortField,
        sortOrder: sortOrder
      }
    };

    console.log('✅ [GET ALL COUPONS] Success:', {
      totalCoupons,
      returnedCoupons: coupons.length,
      currentPage: pageNum,
      totalPages
    });

    return res.status(200).json(apiResponse(200, true, 'Coupons retrieved successfully', responseData));
  } catch (error) {
    console.error('❌ [GET ALL COUPONS] Error:', error);
    return res.status(500).json(apiResponse(500, false, error.message || 'Internal server error'));
  }
};