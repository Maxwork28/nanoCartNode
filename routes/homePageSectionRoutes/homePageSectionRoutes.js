const express = require("express");
const router = express.Router();
const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require("../../middlewares/auditLogger");

const {
  createHomePageSection,
  getAllHomePageSections,
  getHomePageSectionByName,
  updateHomePageSection,
  deleteHomePageSection,
  getSectionItems,
  toggleSectionStatus,
  updateSectionOrder,
  removeItemsFromAllSections,
  removeCategoriesFromAllSections,
  removeSubCategoriesFromAllSections,
  clearAllItemsFromSections,
  clearAllCategoriesFromSections,
  clearAllSubCategoriesFromSections
} = require("../../controllers/homePageController/homePageSectionController");

// ========================================
// PUBLIC ROUTES (No authentication required)
// ========================================

/**
 * @route   GET /homepage-sections
 * @desc    Get all active homepage sections
 * @access  Public
 */
router.get("/", getAllHomePageSections);

/**
 * @route   GET /homepage-sections/:sectionName
 * @desc    Get homepage section by name
 * @access  Public
 */
router.get("/:sectionName", getHomePageSectionByName);

/**
 * @route   GET /homepage-sections/:sectionName/items
 * @desc    Get items for a specific homepage section
 * @access  Public
 */
router.get("/:sectionName/items", getSectionItems);

// ========================================
// ADMIN ROUTES (Authentication required)
// ========================================

/**
 * @route   POST /homepage-sections/create
 * @desc    Create a new homepage section
 * @access  Private (Admin/SubAdmin only)
 * @body    { sectionName, title, subtitle, description, dataConfig, theme, campaign }
 */
router.post("/create", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  createHomePageSection
);

/**
 * @route   PUT /homepage-sections/order
 * @desc    Update section display order
 * @access  Private (Admin/SubAdmin only)
 * @body    { sections: [{sectionId, displayOrder}] }
 */
router.put("/order", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  updateSectionOrder
);

/**
 * @route   PUT /homepage-sections/:sectionId
 * @desc    Update homepage section
 * @access  Private (Admin/SubAdmin only)
 * @body    { title, subtitle, description, dataConfig, theme, campaign, isActive }
 */
router.put("/:sectionId", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  updateHomePageSection
);

/**
 * @route   DELETE /homepage-sections/:sectionId
 * @desc    Delete homepage section
 * @access  Private (Admin/SubAdmin only)
 */
router.delete("/:sectionId", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  deleteHomePageSection
);

/**
 * @route   PATCH /homepage-sections/:sectionId/toggle
 * @desc    Toggle section active status
 * @access  Private (Admin/SubAdmin only)
 */
router.patch("/:sectionId/toggle", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  toggleSectionStatus
);

// ========================================
// BULK MANAGEMENT ROUTES (HomePageSection specific)
// ========================================

/**
 * @route   DELETE /homepage-sections/bulk/clear-items
 * @desc    Clear all items from all homepage sections (keep items in database)
 * @access  Private (Admin/SubAdmin only)
 */
router.delete("/bulk/clear-items", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  clearAllItemsFromSections
);

/**
 * @route   DELETE /homepage-sections/bulk/clear-categories
 * @desc    Clear all categories from all homepage sections (keep categories in database)
 * @access  Private (Admin/SubAdmin only)
 */
router.delete("/bulk/clear-categories", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  clearAllCategoriesFromSections
);

/**
 * @route   DELETE /homepage-sections/bulk/clear-subcategories
 * @desc    Clear all subcategories from all homepage sections (keep subcategories in database)
 * @access  Private (Admin/SubAdmin only)
 */
router.delete("/bulk/clear-subcategories", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  clearAllSubCategoriesFromSections
);

/**
 * @route   POST /homepage-sections/bulk/remove-items
 * @desc    Remove specific items from all homepage sections (keep items in database)
 * @access  Private (Admin/SubAdmin only)
 * @body    { itemIds: [string] }
 */
router.post("/bulk/remove-items", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  removeItemsFromAllSections
);

/**
 * @route   POST /homepage-sections/bulk/remove-categories
 * @desc    Remove specific categories from all homepage sections (keep categories in database)
 * @access  Private (Admin/SubAdmin only)
 * @body    { categoryIds: [string] }
 */
router.post("/bulk/remove-categories", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  removeCategoriesFromAllSections
);

/**
 * @route   POST /homepage-sections/bulk/remove-subcategories
 * @desc    Remove specific subcategories from all homepage sections (keep subcategories in database)
 * @access  Private (Admin/SubAdmin only)
 * @body    { subcategoryIds: [string] }
 */
router.post("/bulk/remove-subcategories", 
  ...verifyTokenAndRole(['Admin', 'SubAdmin']), 
  auditLogger(), 
  removeSubCategoriesFromAllSections
);

module.exports = router;
