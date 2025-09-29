const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const apiResponse = require('../utils/apiResponse');

// Generate PDF Invoice
const generateInvoicePDF = async (req, res) => {
  try {
    const { orderId, orderType = 'user' } = req.params;
    const currentUser = req.user;

    // Validate orderId
    if (!orderId) {
      return res.status(400).json(apiResponse(400, false, "Order ID is required"));
    }

    // Get order data based on type
    let order;
    if (orderType === 'partner') {
      // Fetch partner order
      const PartnerOrder = require('../models/Partner/PartnerOrder');
      order = await PartnerOrder.findOne({ orderId }).populate('orderProductDetails.itemId');
    } else {
      // Fetch user order
      const UserOrder = require('../models/User/UserOrder');
      order = await UserOrder.findOne({ orderId }).populate('orderDetails.itemId');
    }

    if (!order) {
      return res.status(404).json(apiResponse(404, false, "Order not found"));
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Invoice Header
    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(12).text(`Invoice #: ${orderId}`, 50, 80);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 100);
    
    if (orderType === 'partner') {
      doc.text(`Partner: ${order.partnerName || 'N/A'}`, 50, 120);
    } else {
      doc.text(`Customer: ${order.userName || 'N/A'}`, 50, 120);
    }

    // Company Information
    doc.text('NanoCart', 400, 50);
    doc.fontSize(10).text('123 Business Street', 400, 70);
    doc.text('City, State 12345', 400, 85);
    doc.text('Phone: (555) 123-4567', 400, 100);
    doc.text('Email: info@nanocart.com', 400, 115);

    // Line separator
    doc.moveTo(50, 150).lineTo(550, 150).stroke();

    // Order Details Table Header
    let yPosition = 170;
    doc.fontSize(10);
    doc.text('Item', 50, yPosition);
    doc.text('Quantity', 200, yPosition);
    doc.text('Size', 280, yPosition);
    doc.text('Color', 320, yPosition);
    doc.text('Price', 400, yPosition);
    doc.text('Total', 480, yPosition);

    // Line under header
    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    // Order Items
    let totalAmount = 0;
    const items = orderType === 'partner' ? order.orderProductDetails : order.orderDetails;

    items.forEach((item, index) => {
      const itemName = orderType === 'partner' 
        ? item.itemId?.name || 'Unknown Item'
        : item.itemId?.name || 'Unknown Item';
      
      const quantity = orderType === 'partner' 
        ? item.orderDetails?.reduce((sum, od) => sum + od.sizeAndQuantity?.reduce((s, sq) => s + sq.quantity, 0), 0) || 0
        : item.quantity || 0;
      
      const size = orderType === 'partner' 
        ? item.orderDetails?.map(od => od.sizeAndQuantity?.map(sq => sq.size).join(', ')).join(', ') || 'N/A'
        : item.size || 'N/A';
      
      const color = orderType === 'partner' 
        ? item.orderDetails?.map(od => od.color).join(', ') || 'N/A'
        : item.color || 'N/A';
      
      const price = item.price || 0;
      const itemTotal = price * quantity;
      totalAmount += itemTotal;

      doc.text(itemName.substring(0, 30), 50, yPosition);
      doc.text(quantity.toString(), 200, yPosition);
      doc.text(size.substring(0, 15), 280, yPosition);
      doc.text(color.substring(0, 15), 320, yPosition);
      doc.text(`₹${price.toFixed(2)}`, 400, yPosition);
      doc.text(`₹${itemTotal.toFixed(2)}`, 480, yPosition);

      yPosition += 20;

      // Add new page if needed
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    });

    // Line separator
    yPosition += 10;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 20;

    // Invoice Summary
    doc.fontSize(12);
    doc.text('Subtotal:', 400, yPosition);
    doc.text(`₹${totalAmount.toFixed(2)}`, 480, yPosition);
    yPosition += 20;

    // Calculate taxes and fees from invoice breakdown
    if (order.invoice && order.invoice.length > 0) {
      order.invoice.forEach(item => {
        if (item.key.toLowerCase().includes('tax') || item.key.toLowerCase().includes('gst')) {
          doc.text(`${item.key}:`, 400, yPosition);
          doc.text(`₹${item.value.toFixed(2)}`, 480, yPosition);
          yPosition += 20;
        }
      });
    }

    // Delivery charges
    if (order.deliveryCharges) {
      doc.text('Delivery Charges:', 400, yPosition);
      doc.text(`₹${order.deliveryCharges.toFixed(2)}`, 480, yPosition);
      yPosition += 20;
    }

    // Total
    doc.fontSize(14).font('Helvetica-Bold');
    doc.text('Total Amount:', 400, yPosition);
    doc.text(`₹${order.totalAmount.toFixed(2)}`, 480, yPosition);
    yPosition += 30;

    // Payment Information
    doc.fontSize(10).font('Helvetica');
    doc.text('Payment Method:', 50, yPosition);
    doc.text(order.paymentMethod || 'N/A', 150, yPosition);
    yPosition += 15;

    doc.text('Payment Status:', 50, yPosition);
    doc.text(order.paymentStatus || 'N/A', 150, yPosition);
    yPosition += 15;

    doc.text('Order Status:', 50, yPosition);
    doc.text(order.orderStatus || 'N/A', 150, yPosition);
    yPosition += 15;

    if (order.deliveryDate) {
      doc.text('Delivery Date:', 50, yPosition);
      doc.text(new Date(order.deliveryDate).toLocaleDateString(), 150, yPosition);
    }

    // Footer
    yPosition = 750;
    doc.fontSize(8).text('Thank you for your business!', 50, yPosition);
    doc.text('For any queries, contact us at support@nanocart.com', 50, yPosition + 15);

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('Invoice generation error:', error);
    return res.status(500).json(apiResponse(500, false, "Failed to generate invoice"));
  }
};

// Get invoice data (for preview)
const getInvoiceData = async (req, res) => {
  try {
    const { orderId, orderType = 'user' } = req.params;
    const currentUser = req.user;

    if (!orderId) {
      return res.status(400).json(apiResponse(400, false, "Order ID is required"));
    }

    // Get order data based on type
    let order;
    if (orderType === 'partner') {
      const PartnerOrder = require('../models/Partner/PartnerOrder');
      order = await PartnerOrder.findOne({ orderId }).populate('orderProductDetails.itemId');
    } else {
      const UserOrder = require('../models/User/UserOrder');
      order = await UserOrder.findOne({ orderId }).populate('orderDetails.itemId');
    }

    if (!order) {
      return res.status(404).json(apiResponse(404, false, "Order not found"));
    }

    // Format invoice data
    const invoiceData = {
      orderId: order.orderId,
      orderType,
      createdAt: order.createdAt,
      customerName: orderType === 'partner' ? order.partnerName : order.userName,
      items: orderType === 'partner' ? order.orderProductDetails : order.orderDetails,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      deliveryDate: order.deliveryDate,
      invoice: order.invoice || []
    };

    return res.status(200).json(apiResponse(200, true, "Invoice data retrieved successfully", invoiceData));

  } catch (error) {
    console.error('Get invoice data error:', error);
    return res.status(500).json(apiResponse(500, false, "Failed to get invoice data"));
  }
};

module.exports = {
  generateInvoicePDF,
  getInvoiceData
};
