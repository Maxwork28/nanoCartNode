const express = require("express");
const multer = require("multer");
const {
  createItem,
  updateItem,
  deleteItem,
  getAllItem,
  getItemById,
  getItemByCategoryId,
  getItemBySubCategoryId,
  getItemsByFilters,
  getSortedItems,
  searchItems,
  bulkUploadItemsFromFile,
  bulkUploadItemImages,
  findItems,
  addExistingItemsToSection,
  downloadExistingItemsTemplate
} = require("../../controllers/itemController/item");
const { auditLogger } = require('../../middlewares/auditLogger');

const router = express.Router();

// Configure Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit per file

const { verifyTokenAndRole } = require("../../middlewares/verifyToken");

// Create an Item
router.post("/create", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("image"), createItem);
router.post("/add-existing-to-section/:sectionId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("file"), addExistingItemsToSection);

// Bulk upload items via JSON or CSV file
router.post("/bulk-upload", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("file"), bulkUploadItemsFromFile);

// Download CSV template for existing items
router.get("/existing-items-template", ...verifyTokenAndRole(['Admin', 'SubAdmin']), downloadExistingItemsTemplate);

// Bulk upload item images
router.post("/bulk-upload-images", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.array("images"), bulkUploadItemImages);

// Update Item
router.put("/:itemId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("image"), updateItem);

// Delete Item
router.delete("/:itemId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteItem);

// Get All Items
router.get("/", getAllItem);

// Filtered Items
router.get("/filter", getItemsByFilters);

// GET /items?sortBy=latest OR popularity OR priceLowToHigh OR priceHighToLow OR offer
router.get("/sort", getSortedItems);

// Search the item
router.get("/search", searchItems);

// Get Items by Category ID
router.get("/category/:categoryId", getItemByCategoryId);

// Get Items by SubCategory ID
router.get("/subcategory/:subcategoryId", getItemBySubCategoryId);

// Add existing items to section from CSV (by item names) - MUST be before /:itemId

// Get Single Item by ID (keep this at the end to avoid conflicts)
router.get("/:itemId", getItemById);

router.post('/filtering', findItems);

module.exports = router;