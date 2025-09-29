const express = require("express");
const router = express.Router();
const filterController = require("../../controllers/filterController/filterController");
const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');

// Routes to create filter
router.post("/create", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), filterController.createFilter);

// Routes to update filter
router.put("/:id", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), filterController.updateFilter);

// Routes to delete filter
router.delete("/:id", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), filterController.deleteFilter);

// Routes to get all filters
router.get("/", filterController.getAllFilters);

// Routes to search filters
router.get("/search", filterController.searchFilters);

// Routes to get filter by id
router.get("/:id", filterController.getFilterById);

module.exports = router;