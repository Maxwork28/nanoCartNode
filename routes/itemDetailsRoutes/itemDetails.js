const express = require("express");
const router = express.Router();
const multer = require("multer");

// Configure multer for file uploads
const upload = multer({ limits: { files: 20 } });

// Import controllers
const {
  createItemDetail,
  updateItemDetail,
  deleteItemDetail,
  getItemDetailsByItemId,
  getItemDetailById,
  bulkUploadItemDetailsFromFile,
  bulkUploadItemDetailImages,
  updateStock,
  getStockDetails,
  updateTbybStatus,
  downloadItemDetailsCSVTemplate,
} = require("../../controllers/itemDetailsController/itemDetails");

// Import middleware
const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');

// Create a new ItemDetail (Admin and SubAdmin only, supports multiple image uploads)
router.post(
  "/create",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  upload.any(), // Supports multiple color image uploads (e.g., red, blue)
  createItemDetail
);

// Update an existing ItemDetail by ID (Admin and SubAdmin only, supports multiple image uploads)
router.put(
  "/:itemDetailsId",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  upload.any(), // Supports image updates along with other data
  updateItemDetail
);

// Delete an ItemDetail by ID (Admin and SubAdmin only)
router.delete(
  "/:itemDetailsId",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  deleteItemDetail
);

// Get all ItemDetails for a specific itemId (Public access)
router.get(
  "/item/:itemId",
  getItemDetailsByItemId
);

// Get a single ItemDetail by itemDetailsId (Public access)
router.get(
  "/:itemDetailsId",
  getItemDetailById
);

// Download CSV template for item details (Admin and SubAdmin only)
router.get(
  "/csv-template",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  downloadItemDetailsCSVTemplate
);

// Bulk upload ItemDetails from a JSON or CSV file (Admin and SubAdmin only)
router.post(
  "/bulk-upload",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  upload.single("file"), // Single file upload for JSON
  bulkUploadItemDetailsFromFile
);

// Bulk upload images for automatic matching by filename (Admin and SubAdmin only) - no itemDetailId required
router.post(
  "/bulk-upload-images",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  upload.any(), // Supports multiple image uploads
  bulkUploadItemDetailImages
);

// Bulk upload images for an ItemDetail (Admin and SubAdmin only) - with specific itemDetailId
router.post(
  "/:itemDetailId/bulk-upload-images",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  upload.any(), // Supports multiple image uploads
  bulkUploadItemDetailImages
);

// Update stock for a specific itemDetailId and skuId (Admin and SubAdmin only)
router.put(
  "/stock/:itemDetailId",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  updateStock
);

// Get stock details for a specific itemDetailId and skuId (Admin and SubAdmin only)
router.get(
  "/stock/:itemDetailId/:skuId",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  getStockDetails
);

// Update isTbyb status for a specific image in an ItemDetail (Admin and SubAdmin only)
router.put(
  "/tbyb/:itemDetailId",
  ...verifyTokenAndRole(['Admin', 'SubAdmin']),
  auditLogger(),
  updateTbybStatus 
);

module.exports = router;