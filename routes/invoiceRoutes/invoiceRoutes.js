const express = require("express");
const router = express.Router();
const {
  createInvoice,
  updateSpecificInvoice,
  deleteAllInvoice,
  deleteSpecificInvoice,
  getAllInvoices,
  createSpecificInvoice
} = require("../../controllers/invoiceController/invoiceController");
const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');

// Create a new invoice
router.post("/create", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), createInvoice);

// Create a specific invoice entry in an existing invoice
router.post("/:id/entry", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), createSpecificInvoice);

// Update a specific invoice entry
router.put("/:id/entry/:entryId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), updateSpecificInvoice);

// Delete an entire invoice
router.delete("/:id", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteAllInvoice);

// Delete a specific invoice entry
router.delete("/:id/entry/:entryId", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(),   deleteSpecificInvoice);

// Get all invoices
router.get("/", getAllInvoices);

module.exports = router;