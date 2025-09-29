const express = require('express');
const router = express.Router();
const { verifyToken, verifyTokenAndRole, isAdmin, isSubAdmin } = require('../../middlewares/verifyToken');
const { auditLogger } = require('../../middlewares/auditLogger');

// Import SubAdmin controller
const {
  createSubAdmin,
  getAllSubAdmins,
  getSubAdminById,
  updateSubAdmin,
  deactivateSubAdmin,
  activateSubAdmin,
  getAuditLogs,
  getSubAdminStats
} = require('../../controllers/adminSideController/subAdminController');

// Admin-only routes for SubAdmin management
router.post('/create', ...verifyTokenAndRole(['Admin']), auditLogger(), createSubAdmin);
router.get('/list', ...verifyTokenAndRole(['Admin']), getAllSubAdmins);
router.get('/:id', ...verifyTokenAndRole(['Admin']), getSubAdminById);
router.put('/:id', ...verifyTokenAndRole(['Admin']), auditLogger(), updateSubAdmin);
router.put('/:id/deactivate', ...verifyTokenAndRole(['Admin']), auditLogger(), deactivateSubAdmin);
router.put('/:id/activate', ...verifyTokenAndRole(['Admin']), auditLogger(), activateSubAdmin);

// Audit logs (Admin only)
router.get('/audit/logs', ...verifyTokenAndRole(['Admin']), getAuditLogs);

// SubAdmin dashboard routes
router.get('/dashboard/stats', ...verifyTokenAndRole(['SubAdmin']), getSubAdminStats);

module.exports = router;
