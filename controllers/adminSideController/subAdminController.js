const mongoose = require('mongoose');
const User = require('../../models/User/User');
const AuditLog = require('../../models/AuditLog/AuditLog');
const { apiResponse } = require('../../utils/apiResponse');
const { auditLogger } = require('../../middlewares/auditLogger');

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
};

// Helper function to get user agent
const getUserAgent = (req) => {
  return req.get('User-Agent') || 'unknown';
};

// Helper function to get allowed resources based on SubAdmin permissions
const getAllowedResources = (permissions) => {
  const allowedResources = [];
  
  if (permissions && permissions.includes('read')) {
    if (permissions.includes('item')) {
      allowedResources.push('ITEM', 'ITEM_DETAIL');
    }
    if (permissions.includes('category')) {
      allowedResources.push('CATEGORY', 'SUBCATEGORY');
    }
    if (permissions.includes('order')) {
      allowedResources.push('ORDER');
    }
    if (permissions.includes('user')) {
      allowedResources.push('USER');
    }
    if (permissions.includes('partner')) {
      allowedResources.push('PARTNER');
    }
    if (permissions.includes('coupon')) {
      allowedResources.push('COUPON');
    }
    if (permissions.includes('banner')) {
      allowedResources.push('BANNER');
    }
    if (permissions.includes('filter')) {
      allowedResources.push('FILTER');
    }
  }
  
  return allowedResources;
};

// Create SubAdmin
exports.createSubAdmin = async (req, res) => {
  try {
    const { name, phoneNumber, email, permissions = ['read', 'create', 'update', 'delete'] } = req.body;
    const adminId = req.user.adminId;

    // Validate required fields
    if (!name || !phoneNumber || !email) {
      return res.status(400).json(apiResponse(400, false, "Name, phone number, and email are required"));
    }

    // Check if phone number already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json(apiResponse(400, false, "Phone number already exists"));
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json(apiResponse(400, false, "Email already exists"));
    }

    // Create SubAdmin
    const subAdmin = new User({
      name,
      phoneNumber,
      email,
      role: 'SubAdmin',
      isPhoneVerified: false,
      isEmailVerified: false,
      isActive: true,
      isSubAdminActive: true,
      assignedBy: adminId,
      permissions
    });

    await subAdmin.save();

    // Log the creation
    await AuditLog.createLog({
      userId: req.user.adminId,
      userRole: 'Admin',
      userName: req.user.name,
      userPhoneNumber: req.user.adminPhoneNumber,
      action: 'CREATE',
      resource: 'SUBADMIN',
      resourceId: subAdmin._id,
      changes: { name, phoneNumber, email, permissions },
      previousValues: null,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      description: `Admin created SubAdmin: ${name} (${phoneNumber})`,
      status: 'SUCCESS',
      requestData: req.body,
      responseData: { success: true, subAdminId: subAdmin._id }
    });

    return res.status(201).json(apiResponse(201, true, "SubAdmin created successfully", {
      subAdminId: subAdmin._id,
      name: subAdmin.name,
      phoneNumber: subAdmin.phoneNumber,
      email: subAdmin.email,
      permissions: subAdmin.permissions,
      isSubAdminActive: subAdmin.isSubAdminActive
    }));

  } catch (error) {
    console.error('Create SubAdmin error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Get All SubAdmins
exports.getAllSubAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let searchQuery = { role: 'SubAdmin' };
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [subAdmins, total] = await Promise.all([
      User.find(searchQuery)
        .populate('assignedBy', 'name phoneNumber email')
        .select('-firebaseUid -TBYB')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(searchQuery)
    ]);

    return res.status(200).json(apiResponse(200, true, "SubAdmins retrieved successfully", {
      subAdmins,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalSubAdmins: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }));

  } catch (error) {
    console.error('Get SubAdmins error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Get SubAdmin by ID
exports.getSubAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const subAdmin = await User.findOne({ _id: id, role: 'SubAdmin' })
      .populate('assignedBy', 'name phoneNumber email')
      .select('-firebaseUid -TBYB');

    if (!subAdmin) {
      return res.status(404).json(apiResponse(404, false, "SubAdmin not found"));
    }

    return res.status(200).json(apiResponse(200, true, "SubAdmin retrieved successfully", subAdmin));

  } catch (error) {
    console.error('Get SubAdmin by ID error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Update SubAdmin
exports.updateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, permissions, isSubAdminActive } = req.body;
    const adminId = req.user.adminId;

    const subAdmin = await User.findOne({ _id: id, role: 'SubAdmin' });
    if (!subAdmin) {
      return res.status(404).json(apiResponse(404, false, "SubAdmin not found"));
    }

    // Store previous values for audit
    const previousValues = {
      name: subAdmin.name,
      email: subAdmin.email,
      permissions: subAdmin.permissions,
      isSubAdminActive: subAdmin.isSubAdminActive
    };

    // Update fields
    if (name) subAdmin.name = name;
    if (email) subAdmin.email = email;
    if (permissions) subAdmin.permissions = permissions;
    if (typeof isSubAdminActive === 'boolean') subAdmin.isSubAdminActive = isSubAdminActive;

    await subAdmin.save();

    // Log the update
    await AuditLog.createLog({
      userId: req.user.adminId,
      userRole: 'Admin',
      userName: req.user.name,
      userPhoneNumber: req.user.adminPhoneNumber,
      action: 'UPDATE',
      resource: 'SUBADMIN',
      resourceId: subAdmin._id,
      changes: { name, email, permissions, isSubAdminActive },
      previousValues,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      description: `Admin updated SubAdmin: ${subAdmin.name} (${subAdmin.phoneNumber})`,
      status: 'SUCCESS',
      requestData: req.body,
      responseData: { success: true }
    });

    return res.status(200).json(apiResponse(200, true, "SubAdmin updated successfully", {
      subAdminId: subAdmin._id,
      name: subAdmin.name,
      phoneNumber: subAdmin.phoneNumber,
      email: subAdmin.email,
      permissions: subAdmin.permissions,
      isSubAdminActive: subAdmin.isSubAdminActive
    }));

  } catch (error) {
    console.error('Update SubAdmin error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Deactivate SubAdmin
exports.deactivateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.adminId;

    const subAdmin = await User.findOne({ _id: id, role: 'SubAdmin' });
    if (!subAdmin) {
      return res.status(404).json(apiResponse(404, false, "SubAdmin not found"));
    }

    subAdmin.isSubAdminActive = false;
    await subAdmin.save();

    // Log the deactivation
    await AuditLog.createLog({
      userId: req.user.adminId,
      userRole: 'Admin',
      userName: req.user.name,
      userPhoneNumber: req.user.adminPhoneNumber,
      action: 'UPDATE',
      resource: 'SUBADMIN',
      resourceId: subAdmin._id,
      changes: { isSubAdminActive: false },
      previousValues: { isSubAdminActive: true },
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      description: `Admin deactivated SubAdmin: ${subAdmin.name} (${subAdmin.phoneNumber})`,
      status: 'SUCCESS',
      requestData: { action: 'deactivate' },
      responseData: { success: true }
    });

    return res.status(200).json(apiResponse(200, true, "SubAdmin deactivated successfully"));

  } catch (error) {
    console.error('Deactivate SubAdmin error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Activate SubAdmin
exports.activateSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.adminId;

    const subAdmin = await User.findOne({ _id: id, role: 'SubAdmin' });
    if (!subAdmin) {
      return res.status(404).json(apiResponse(404, false, "SubAdmin not found"));
    }

    subAdmin.isSubAdminActive = true;
    await subAdmin.save();

    // Log the activation
    await AuditLog.createLog({
      userId: req.user.adminId,
      userRole: 'Admin',
      userName: req.user.name,
      userPhoneNumber: req.user.adminPhoneNumber,
      action: 'UPDATE',
      resource: 'SUBADMIN',
      resourceId: subAdmin._id,
      changes: { isSubAdminActive: true },
      previousValues: { isSubAdminActive: false },
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      description: `Admin activated SubAdmin: ${subAdmin.name} (${subAdmin.phoneNumber})`,
      status: 'SUCCESS',
      requestData: { action: 'activate' },
      responseData: { success: true }
    });

    return res.status(200).json(apiResponse(200, true, "SubAdmin activated successfully"));

  } catch (error) {
    console.error('Activate SubAdmin error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Get Audit Logs with role-based filtering
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userRole, action, resource, startDate, endDate } = req.query;
    const currentUser = req.user;

    // Build filters with role-based restrictions
    const filters = {};
    
    // Role-based data access control
    if (currentUser.role === 'Admin') {
      // Admins can see all audit logs
      if (userRole) filters.userRole = userRole;
    } else if (currentUser.role === 'SubAdmin') {
      // SubAdmins can only see their own logs and logs for resources they have permission to manage
      const allowedResources = getAllowedResources(currentUser.permissions);
      
      // SubAdmins can see their own audit logs
      filters.$or = [
        { userId: currentUser.subAdminId || currentUser._id },
        { userRole: 'SYSTEM' }, // System logs are generally safe to show
        ...(allowedResources.length > 0 ? [{ resource: { $in: allowedResources } }] : [])
      ];
      
      // If userRole filter is provided, ensure it's within allowed scope
      if (userRole) {
        if (userRole === 'SubAdmin' && currentUser.subAdminId) {
          filters.userId = currentUser.subAdminId;
        } else if (userRole === 'SYSTEM') {
          filters.userRole = 'SYSTEM';
        } else {
          // For other roles, only show if user has permission for that resource type
          const resourceMap = {
            'User': 'USER',
            'Admin': 'ADMIN', 
            'SubAdmin': 'SUBADMIN',
            'Partner': 'PARTNER'
          };
          if (resourceMap[userRole] && allowedResources.includes(resourceMap[userRole])) {
            filters.userRole = userRole;
          } else {
            return res.status(403).json(apiResponse(403, false, "Insufficient permissions to view logs for this user role"));
          }
        }
      }
    } else {
      return res.status(403).json(apiResponse(403, false, "Admin or SubAdmin access required"));
    }

    // Apply additional filters
    if (action) filters.action = action;
    if (resource) {
      // For SubAdmins, ensure they have permission for this resource
      if (currentUser.role === 'SubAdmin') {
        const allowedResources = getAllowedResources(currentUser.permissions);
        
        if (!allowedResources.includes(resource)) {
          return res.status(403).json(apiResponse(403, false, "Insufficient permissions to view logs for this resource"));
        }
      }
      filters.resource = resource;
    }
    
    if (startDate && endDate) {
      filters.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const result = await AuditLog.getAuditLogs(filters, parseInt(page), parseInt(limit));

    return res.status(200).json(apiResponse(200, true, "Audit logs retrieved successfully", result));

  } catch (error) {
    console.error('Get Audit Logs error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Get SubAdmin Dashboard Stats
exports.getSubAdminStats = async (req, res) => {
  try {
    const subAdminId = req.user.subAdminId;

    // Get counts for various entities
    const [
      totalItems,
      totalCategories,
      totalSubCategories,
      totalOrders,
      totalUsers,
      totalPartners
    ] = await Promise.all([
      mongoose.model('Item').countDocuments(),
      mongoose.model('Category').countDocuments(),
      mongoose.model('SubCategory').countDocuments(),
      mongoose.model('UserOrder').countDocuments(),
      mongoose.model('User').countDocuments({ role: 'User' }),
      mongoose.model('Partner').countDocuments()
    ]);

    return res.status(200).json(apiResponse(200, true, "SubAdmin stats retrieved successfully", {
      totalItems,
      totalCategories,
      totalSubCategories,
      totalOrders,
      totalUsers,
      totalPartners
    }));

  } catch (error) {
    console.error('Get SubAdmin Stats error:', error);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};
