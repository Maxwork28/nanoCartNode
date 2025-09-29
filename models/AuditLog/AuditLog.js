const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.userRole !== 'SYSTEM' && this.userRole !== 'UNKNOWN';
    }
  },
  userRole: {
    type: String,
    enum: ['Admin', 'SubAdmin', 'User', 'Partner', 'SYSTEM', 'UNKNOWN'],
    required: true
  },
  userName: {
    type: String,
    required: function() {
      return this.userRole !== 'SYSTEM' && this.userRole !== 'UNKNOWN';
    }
  },
  userPhoneNumber: {
    type: String,
    required: function() {
      return this.userRole !== 'SYSTEM' && this.userRole !== 'UNKNOWN';
    }
  },
  
  // What action was performed
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'PERMISSION_DENIED', 'ACCESS_DENIED'
    ]
  },
  
  // Which resource was affected
  resource: {
    type: String,
    required: true,
    enum: [
      'USER', 'ADMIN', 'SUBADMIN', 'PARTNER',
      'ITEM', 'ITEM_DETAIL', 'CATEGORY', 'SUBCATEGORY',
      'ORDER', 'CART', 'WISHLIST', 'COUPON',
      'BANNER', 'FILTER', 'AUDIT_LOG'
    ]
  },
  
  // Resource details
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return ['CREATE', 'UPDATE', 'DELETE'].includes(this.action);
    }
  },
  
  // What changed (for UPDATE actions)
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Previous values (for UPDATE actions)
  previousValues: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Request details
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  
  // Additional context
  description: {
    type: String,
    required: true
  },
  
  // Status of the action
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS'
  },
  
  // Error details (if action failed)
  errorMessage: {
    type: String,
    default: null
  },
  
  // Request/Response details
  requestData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  responseData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true,
  // Index for performance
  indexes: [
    { userId: 1, createdAt: -1 },
    { userRole: 1, createdAt: -1 },
    { action: 1, createdAt: -1 },
    { resource: 1, createdAt: -1 },
    { createdAt: -1 }
  ]
});

// Static method to create audit log
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const auditLog = new this(logData);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

// Static method to get audit logs with pagination
auditLogSchema.statics.getAuditLogs = async function(filters = {}, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  const query = this.find(filters)
    .populate('userId', 'name phoneNumber email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  
  const [logs, total] = await Promise.all([
    query.exec(),
    this.countDocuments(filters)
  ]);
  
  return {
    logs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLogs: total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
