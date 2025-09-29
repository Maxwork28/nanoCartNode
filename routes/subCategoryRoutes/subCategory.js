const express = require("express");
const multer = require("multer");
const { createSubCategory, updateSubCategory, deleteSubCategory, getAllSubCategories, getSubCategoryById, getSubCategoryByCategoryId, getTrendySubCategories, searchSubcategories } = require("../../controllers/subCategoryController/subCategory");

const router = express.Router();

// Configure Multer for handling file uploads
const storage = multer.memoryStorage();   
const upload = multer({ storage });

const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');

// Define the route for creating a Subcategory
router.post("/create", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("image"), createSubCategory);

// Define the route for updating a Subcategory
router.put("/:subcategoryId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("image"), updateSubCategory);

// Define the route for Delete a Subcategory
router.delete("/:subcategoryId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteSubCategory);

// Define the route for searching subcategories with pagination
router.get("/search", searchSubcategories);

// Define the route for get All Subcategory
router.get("/", getAllSubCategories);

// Define the route for get All Trendy Subcategory
router.get("/trendy", getTrendySubCategories);

// Define the route for get a subCategory By Id
router.get("/:subcategoryId", getSubCategoryById);

// Define the route for get a subCategory based on category
router.get("/categories/:categoryId", getSubCategoryByCategoryId);

module.exports = router;