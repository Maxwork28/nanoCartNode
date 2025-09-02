const mongoose = require("mongoose");
const User = require("../../models/User/User");
const Partner = require("../../models/Partner/Partner");
const Item = require("../../models/Items/Item");
const Category = require("../../models/Category/Category");
const SubCategory = require("../../models/SubCategory/SubCategory");
const UserOrder = require("../../models/User/UserOrder");
const { apiResponse } = require("../../utils/apiResponse");

// Helper function to get monthly trends data with date range filtering
const getMonthlyTrends = async (Model, matchQuery = {}, dateField = 'createdAt', startDate = null, endDate = null) => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  
  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure startDate is before endDate
    if (startDateObj > endDateObj) {
      throw new Error('Start date must be before end date');
    }
    
    dateFilter = {
      [dateField]: {
        $gte: startDateObj,
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };
  } else {
    dateFilter = {
      [dateField]: {
        $gte: startOfYear,
        $lte: endOfYear
      }
    };
  }

  const monthlyTrends = await Model.aggregate([
    {
      $match: {
        ...matchQuery,
        ...dateFilter
      }
    },
    {
      $group: {
        _id: {
          year: { $year: `$${dateField}` },
          month: { $month: `$${dateField}` }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: { $month: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 } } } },
            "/",
            { $toString: "$_id.year" }
          ]
        },
        value: "$count"
      }
    }
  ]);

  // Fill in missing months with 0 values
  const months = [];
  const startMonth = startDate ? new Date(startDate).getMonth() + 1 : 1;
  const endMonth = endDate ? new Date(endDate).getMonth() + 1 : 12;
  const year = startDate ? new Date(startDate).getFullYear() : currentYear;

  for (let month = startMonth; month <= endMonth; month++) {
    const monthStr = `${month}/${year}`;
    const existingMonth = monthlyTrends.find(trend => trend.month === monthStr);
    months.push({
      month: monthStr,
      value: existingMonth ? existingMonth.value : 0
    });
  }

  return months;
};

// Helper function to get monthly trends for inventory (items, categories, subcategories)
const getInventoryMonthlyTrends = async (startDate = null, endDate = null) => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  
  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure startDate is before endDate
    if (startDateObj > endDateObj) {
      throw new Error('Start date must be before end date');
    }
    
    dateFilter = {
      createdAt: {
        $gte: startDateObj,
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };
  } else {
    dateFilter = {
      createdAt: {
        $gte: startOfYear,
        $lte: endOfYear
      }
    };
  }

  const [itemsTrends, categoriesTrends, subcategoriesTrends] = await Promise.all([
    Item.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    Category.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]),
    SubCategory.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ])
  ]);

  // Combine and format the data
  const months = [];
  const startMonth = startDate ? new Date(startDate).getMonth() + 1 : 1;
  const endMonth = endDate ? new Date(endDate).getMonth() + 1 : 12;
  const year = startDate ? new Date(startDate).getFullYear() : currentYear;

  for (let month = startMonth; month <= endMonth; month++) {
    const monthStr = `${month}/${year}`;
    
    const itemsCount = itemsTrends.find(trend => 
      trend._id.month === month && trend._id.year === year
    )?.count || 0;
    
    const categoriesCount = categoriesTrends.find(trend => 
      trend._id.month === month && trend._id.year === year
    )?.count || 0;
    
    const subcategoriesCount = subcategoriesTrends.find(trend => 
      trend._id.month === month && trend._id.year === year
    )?.count || 0;

    months.push({
      month: monthStr,
      items: itemsCount,
      categories: categoriesCount,
      subcategories: subcategoriesCount
    });
  }

  return months;
};

// Helper function to get monthly trends for partners and their orders
const getPartnerMonthlyTrends = async (startDate = null, endDate = null) => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  
  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure startDate is before endDate
    if (startDateObj > endDateObj) {
      throw new Error('Start date must be before end date');
    }
    
    dateFilter = {
      createdAt: {
        $gte: startDateObj,
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };
  } else {
    dateFilter = {
      createdAt: {
        $gte: startOfYear,
        $lte: endOfYear
      }
    };
  }

  // Get partners trends
  const partnersTrends = await Partner.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);

  // Get partner orders trends (you'll need to import PartnerOrder model)
  // For now, we'll use a placeholder
  const partnerOrdersTrends = [];

  // Combine and format the data
  const months = [];
  const startMonth = startDate ? new Date(startDate).getMonth() + 1 : 1;
  const endMonth = endDate ? new Date(endDate).getMonth() + 1 : 12;
  const year = startDate ? new Date(startDate).getFullYear() : currentYear;

  for (let month = startMonth; month <= endMonth; month++) {
    const monthStr = `${month}/${year}`;
    
    const partnersCount = partnersTrends.find(trend => 
      trend._id.month === month && trend._id.year === year
    )?.count || 0;
    
    const partnerOrdersCount = partnerOrdersTrends.find(trend => 
      trend._id.month === month && trend._id.year === year
    )?.count || 0;

    months.push({
      month: monthStr,
      partners: partnersCount,
      partnerOrders: partnerOrdersCount
    });
  }

  return months;
};

// Helper function to get revenue monthly trends
const getRevenueMonthlyTrends = async (startDate = null, endDate = null) => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  
  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure startDate is before endDate
    if (startDateObj > endDateObj) {
      throw new Error('Start date must be before end date');
    }
    
    dateFilter = {
      createdAt: {
        $gte: startDateObj,
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };
  } else {
    dateFilter = {
      createdAt: {
        $gte: startOfYear,
        $lte: endOfYear
      }
    };
  }

  // This would typically aggregate from orders or revenue collection
  // For now, returning sample data structure
  const months = [];
  const startMonth = startDate ? new Date(startDate).getMonth() + 1 : 1;
  const endMonth = endDate ? new Date(endDate).getMonth() + 1 : 12;
  const year = startDate ? new Date(startDate).getFullYear() : currentYear;

  for (let month = startMonth; month <= endMonth; month++) {
    const monthStr = `${month}/${year}`;
    months.push({
      month: monthStr,
      value: Math.floor(Math.random() * 10000) + 1000 // Placeholder
    });
  }

  return months;
};

// Helper function to get orders monthly trends
const getOrdersMonthlyTrends = async (startDate = null, endDate = null) => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  
  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    // Validate date format
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure startDate is before endDate
    if (startDateObj > endDateObj) {
      throw new Error('Start date must be before end date');
    }
    
    dateFilter = {
      createdAt: {
        $gte: startDateObj,
        $lte: new Date(endDate + 'T23:59:59.999Z')
      }
    };
  } else {
    dateFilter = {
      createdAt: {
        $gte: startOfYear,
        $lte: endOfYear
      }
    };
  }

  // Aggregate from UserOrder collection
  const monthlyTrends = await UserOrder.aggregate([
    {
      $match: dateFilter
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 }
    },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: { $month: { $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 } } } },
            "/",
            { $toString: "$_id.year" }
          ]
        },
        value: "$count"
      }
    }
  ]);

  // Fill in missing months with 0 values
  const months = [];
  const startMonth = startDate ? new Date(startDate).getMonth() + 1 : 1;
  const endMonth = endDate ? new Date(endDate).getMonth() + 1 : 12;
  const year = startDate ? new Date(startDate).getFullYear() : currentYear;

  for (let month = startMonth; month <= endMonth; month++) {
    const monthStr = `${month}/${year}`;
    const existingMonth = monthlyTrends.find(trend => trend.month === monthStr);
    months.push({
      month: monthStr,
      value: existingMonth ? existingMonth.value : 0
    });
  }

  return months;
};

// 1) Total Users
exports.getAllUsers = async (req, res) => {
  console.log("[GET ALL USERS] Request received");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log("📦 Fetching Users...");
    const users = await User.find({ role: "User" })
      .select("name phoneNumber email isPhoneVerified isEmailVerified isActive isAddress")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments({ role: "User" });

    console.log("🔢 Total Users:", totalUsers);
    return res.status(200).json(apiResponse(200, true, "Users retrieved successfully", { users, totalUsers, page, limit }));
  } catch (error) {
    console.error("[GET ALL USERS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching users", { error: error.message }));
  }
};

// Get All Partners
exports.getAllPartners = async (req, res) => {
  console.log("[GET ALL PARTNERS] Request received");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log("🚚 Fetching Partners...");
    const partners = await Partner.find({})
      .select("name phoneNumber email isVerified isPhoneVerified isEmailVerified isActive isProfile isWalletCreated isAddress imageShop")
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPartners = await Partner.countDocuments({});

    console.log("🔢 Total Partners:", totalPartners);
    return res.status(200).json(apiResponse(200, true, "Partners retrieved successfully", { partners, totalPartners, page, limit }));
  } catch (error) {
    console.error("[GET ALL PARTNERS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching partners", { error: error.message }));
  }
};
exports.getTotalUsers = async (req, res) => {
  console.log("[GET TOTAL USERS] Request received");
  try {
    const totalUsers = await User.countDocuments({ role: "User" });
    console.log("[GET TOTAL USERS] Total:", totalUsers);
    return res.status(200).json(apiResponse(200, true, "Total Users retrieved successfully", { totalUsers }));
  } catch (error) {
    console.error("[GET TOTAL USERS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching total users", { error: error.message }));
  }
};

// 1) Total Partners
exports.getTotalPartners = async (req, res) => {
  console.log("[GET TOTAL PARTNERS] Request received");
  try {
    const totalPartners = await Partner.countDocuments({});
    console.log("[GET TOTAL PARTNERS] Total:", totalPartners);
    return res.status(200).json(apiResponse(200, true, "Total Partners retrieved successfully", { totalPartners }));
  } catch (error) {
    console.error("[GET TOTAL PARTNERS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching total partners", { error: error.message }));
  }
};

// 1) Total Categories
exports.getTotalCategories = async (req, res) => {
  console.log("[GET TOTAL CATEGORIES] Request received");
  try {
    const totalCategories = await Category.countDocuments({});
    console.log("[GET TOTAL CATEGORIES] Total:", totalCategories);
    return res.status(200).json(apiResponse(200, true, "Total Categories retrieved successfully", { totalCategories }));
  } catch (error) {
    console.error("[GET TOTAL CATEGORIES] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching total categories", { error: error.message }));
  }
};

// 1) Total Subcategories
exports.getTotalSubcategories = async (req, res) => {
  console.log("[GET TOTAL SUBCATEGORIES] Request received");
  try {
    const totalSubcategories = await SubCategory.countDocuments({});
    console.log("[GET TOTAL SUBCATEGORIES] Total:", totalSubcategories);
    return res.status(200).json(apiResponse(200, true, "Total Subcategories retrieved successfully", { totalSubcategories }));
  } catch (error) {
    console.error("[GET TOTAL SUBCATEGORIES] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching total subcategories", { error: error.message }));
  }
};

// 1) Total Items
exports.getTotalItems = async (req, res) => {
  console.log("[GET TOTAL ITEMS] Request received");
  try {
    const totalItems = await Item.countDocuments({});
    console.log("[GET TOTAL ITEMS] Total:", totalItems);
    return res.status(200).json(apiResponse(200, true, "Total Items retrieved successfully", { totalItems }));
  } catch (error) {
    console.error("[GET TOTAL ITEMS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching total items", { error: error.message }));
  }
};

// Monthly trends for Users
exports.getUsersMonthlyTrends = async (req, res) => {
  console.log("[GET USERS MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getMonthlyTrends(User, { role: "User" }, 'createdAt', startDate, endDate);
    console.log("[GET USERS MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Users monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET USERS MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching users monthly trends", { error: error.message }));
  }
};

// Monthly trends for Partners
exports.getPartnersMonthlyTrends = async (req, res) => {
  console.log("[GET PARTNERS MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getPartnerMonthlyTrends(startDate, endDate);
    console.log("[GET PARTNERS MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Partners monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET PARTNERS MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching partners monthly trends", { error: error.message }));
  }
};

// Monthly trends for Items
exports.getItemsMonthlyTrends = async (req, res) => {
  console.log("[GET ITEMS MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getMonthlyTrends(Item, {}, 'createdAt', startDate, endDate);
    console.log("[GET ITEMS MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Items monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET ITEMS MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching items monthly trends", { error: error.message }));
  }
};

// Monthly trends for Categories
exports.getCategoriesMonthlyTrends = async (req, res) => {
  console.log("[GET CATEGORIES MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getMonthlyTrends(Category, {}, 'createdAt', startDate, endDate);
    console.log("[GET CATEGORIES MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Categories monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET CATEGORIES MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching categories monthly trends", { error: error.message }));
  }
};

// Monthly trends for Subcategories
exports.getSubcategoriesMonthlyTrends = async (req, res) => {
  console.log("[GET SUBCATEGORIES MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getMonthlyTrends(SubCategory, {}, 'createdAt', startDate, endDate);
    console.log("[GET SUBCATEGORIES MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Subcategories monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET SUBCATEGORIES MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching subcategories monthly trends", { error: error.message }));
  }
};

// Monthly trends for Inventory (combined)
exports.getInventoryMonthlyTrends = async (req, res) => {
  console.log("[GET INVENTORY MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getInventoryMonthlyTrends(startDate, endDate);
    console.log("[GET INVENTORY MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Inventory monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET INVENTORY MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching inventory monthly trends", { error: error.message }));
  }
};

// Monthly trends for Revenue
exports.getRevenueMonthlyTrends = async (req, res) => {
  console.log("[GET REVENUE MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getRevenueMonthlyTrends(startDate, endDate);
    console.log("[GET REVENUE MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Revenue monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET REVENUE MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching revenue monthly trends", { error: error.message }));
  }
};

// Monthly trends for Orders
exports.getOrdersMonthlyTrends = async (req, res) => {
  console.log("[GET ORDERS MONTHLY TRENDS] Request received");
  try {
    const { startDate, endDate } = req.query;
    const trends = await getOrdersMonthlyTrends(startDate, endDate);
    console.log("[GET ORDERS MONTHLY TRENDS] Trends:", trends);
    return res.status(200).json(apiResponse(200, true, "Orders monthly trends retrieved successfully", { trends }));
  } catch (error) {
    console.error("[GET ORDERS MONTHLY TRENDS] Error:", error);
    return res.status(500).json(apiResponse(500, false, "An error occurred while fetching orders monthly trends", { error: error.message }));
  }
};

