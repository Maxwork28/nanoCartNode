const express = require('express');
const router = express.Router();
const { generateInvoicePDF, getInvoiceData } = require('../controllers/invoiceController');
const { verifyToken } = require('../middlewares/verifyToken');
const { isAdmin, isUser, isPartner } = require('../middlewares/isAdmin');

// Generate PDF Invoice
router.get('/pdf/:orderId/:orderType?', verifyToken, generateInvoicePDF);

// Get invoice data for preview
router.get('/data/:orderId/:orderType?', verifyToken, getInvoiceData);

module.exports = router;
