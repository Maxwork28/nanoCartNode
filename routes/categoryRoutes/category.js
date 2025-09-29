const express = require("express");
const multer = require("multer");
const { auditLogger } = require('../../middlewares/auditLogger');
const {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  searchCategories,
} = require("../../controllers/categoryController/category");

const router = express.Router();

// Configure Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken");

// Define the route for creating a category (Admin and SubAdmin can create)
router.post(
  "/create",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),

  upload.single("image"),
  createCategory
);

// Define the route for updating a category (Admin and SubAdmin can update)
router.put(
  "/:categoryId",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),

  upload.single("image"),
  updateCategory
);

// Define the route for Delete a category (Admin and SubAdmin can delete)
router.delete("/:categoryId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteCategory);

// Define the route for searching categories with pagination
router.get("/search", searchCategories);

// Define the route for get All  category
router.get("/", getAllCategories);

// Define the route for get a category
router.get("/:categoryId", getCategoryById);

module.exports = router;
