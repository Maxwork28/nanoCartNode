const AuditLog = require('../models/AuditLog/AuditLog');
const { apiResponse } = require('../utils/apiResponse');

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

// Helper function to determine resource type from route
const getResourceType = (req) => {
  const path = req.route?.path || req.path;
  const originalUrl = req.originalUrl;
  
  console.log('🔍 [AUDIT LOGGER] Path detection:', { path, originalUrl });
  
  // Check original URL first for more accurate detection
  if (originalUrl.includes('/subcategory')) return 'SUBCATEGORY';
  if (originalUrl.includes('/category')) return 'CATEGORY';
  if (originalUrl.includes('/items')) return 'ITEM';
  if (originalUrl.includes('/itemDetails')) return 'ITEM_DETAIL';
  if (originalUrl.includes('/admin')) return 'ADMIN';
  if (originalUrl.includes('/subadmin')) return 'SUBADMIN';
  if (originalUrl.includes('/partner')) return 'PARTNER';
  if (originalUrl.includes('/order')) return 'ORDER';
  if (originalUrl.includes('/cart')) return 'CART';
  if (originalUrl.includes('/wishlist')) return 'WISHLIST';
  if (originalUrl.includes('/coupon')) return 'COUPON';
  if (originalUrl.includes('/banner')) return 'BANNER';
  if (originalUrl.includes('/home-page-banner')) return 'HOME_PAGE_BANNER';
  if (originalUrl.includes('/filter')) return 'FILTER';
  if (originalUrl.includes('/audit')) return 'AUDIT_LOG';
  
  // Fallback to path checking
  if (path.includes('/subcategory')) return 'SUBCATEGORY';
  if (path.includes('/category')) return 'CATEGORY';
  if (path.includes('/items')) return 'ITEM';
  if (path.includes('/itemDetails')) return 'ITEM_DETAIL';
  if (path.includes('/admin')) return 'ADMIN';
  if (path.includes('/subadmin')) return 'SUBADMIN';
  if (path.includes('/partner')) return 'PARTNER';
  if (path.includes('/order')) return 'ORDER';
  if (path.includes('/cart')) return 'CART';
  if (path.includes('/wishlist')) return 'WISHLIST';
  if (path.includes('/coupon')) return 'COUPON';
  if (path.includes('/banner')) return 'BANNER';
  if (path.includes('/home-page-banner')) return 'HOME_PAGE_BANNER';
  if (path.includes('/filter')) return 'FILTER';
  if (path.includes('/audit')) return 'AUDIT_LOG';
  
  return 'USER';
};

// Helper function to determine action from HTTP method
const getAction = (req) => {
  const method = req.method.toUpperCase();
  
  switch (method) {
    case 'GET': return 'READ';
    case 'POST': return 'CREATE';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'READ';
  }
};

// Main audit logging middleware
exports.auditLogger = (options = {}) => {
  return async (req, res, next) => {
    // Skip audit logging for certain routes or methods
    const skipRoutes = options.skipRoutes || ['/api/auth/refresh', '/api/auth/logout'];
    const skipMethods = options.skipMethods || ['OPTIONS'];
    
    if (skipRoutes.some(route => req.path.startsWith(route)) || 
        skipMethods.includes(req.method)) {
      return next();
    }

    // Only log for SubAdmin actions (as per requirement)
    if (!req.user || req.user.role !== 'SubAdmin') {
      return next();
    }

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Capture response data
    let responseData = null;
    let statusCode = null;

    // Override res.send to capture response
    res.send = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalSend.call(this, data);
    };

    // Override res.json to capture response
    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Capture request data (excluding sensitive fields)
    const sensitiveFields = ['password', 'token', 'refreshToken', 'otp'];
    const requestData = { ...req.body };
    sensitiveFields.forEach(field => {
      if (requestData[field]) {
        requestData[field] = '[REDACTED]';
      }
    });

    // Store original values for UPDATE operations
    let previousValues = null;
    if (req.method === 'PUT' || req.method === 'PATCH') {
      // This would need to be implemented per controller
      // For now, we'll capture it as null
      previousValues = null;
    }

    // Continue with the request
    next();

    // Log after response is sent
    res.on('finish', async () => {
      try {
        // Debug logging
        console.log('🔍 [AUDIT LOGGER] User info:', {
          role: req.user?.role,
          subAdminId: req.user?.subAdminId,
          name: req.user?.name,
          subAdminPhoneNumber: req.user?.subAdminPhoneNumber,
          method: req.method,
          path: req.path
        });

        // Extract user information based on role and token structure
        let userId, userName, userPhoneNumber;
        
        if (req.user.role === 'SubAdmin') {
          userId = req.user.subAdminId;
          userName = req.user.name;
          userPhoneNumber = req.user.subAdminPhoneNumber;
        } else if (req.user.role === 'Admin') {
          userId = req.user.adminId;
          userName = req.user.name;
          userPhoneNumber = req.user.adminPhoneNumber;
        } else if (req.user.role === 'Partner') {
          userId = req.user.partnerId;
          userName = req.user.name;
          userPhoneNumber = req.user.partnerPhoneNumber;
        } else if (req.user.role === 'User') {
          userId = req.user.userId;
          userName = req.user.name;
          userPhoneNumber = req.user.phoneNumber;
        } else {
          // Fallback for unknown roles
          userId = req.user.userId || req.user.adminId || req.user.partnerId || req.user.subAdminId;
          userName = req.user.name || 'Unknown';
          userPhoneNumber = req.user.phoneNumber || req.user.adminPhoneNumber || req.user.partnerPhoneNumber || req.user.subAdminPhoneNumber || 'Unknown';
        }

        console.log('🔍 [AUDIT LOGGER] Extracted info:', { userId, userName, userPhoneNumber });

        const action = getAction(req);
        const resource = getResourceType(req);
        
        // Extract resourceId based on the resource type and URL parameters
        let resourceId = undefined;
        if (['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
          if (resource === 'SUBCATEGORY') {
            resourceId = req.params.subcategoryId || req.params.id;
          } else if (resource === 'CATEGORY') {
            resourceId = req.params.categoryId || req.params.id;
          } else if (resource === 'ITEM') {
            resourceId = req.params.itemId || req.params.id;
          } else if (resource === 'ITEM_DETAIL') {
            resourceId = req.params.itemDetailsId || req.params.itemDetailId || req.params.id;
          } else if (resource === 'FILTER') {
            resourceId = req.params.filterId || req.params.id;
          } else if (resource === 'HOME_PAGE_BANNER') {
            resourceId = req.params.bannerId || req.params.id;
          } else if (resource === 'COUPON') {
            resourceId = req.params.couponId || req.params.id;
          } else {
            resourceId = req.params.id;
          }
          
          // For CREATE operations, try to get resourceId from response data if not found in params
          if (action === 'CREATE' && !resourceId && responseData) {
            try {
              const responseObj = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
              if (responseObj?.data?._id) {
                resourceId = responseObj.data._id;
              }
            } catch (err) {
              console.log('🔍 [AUDIT LOGGER] Could not parse response data for resourceId:', err.message);
            }
          }
          
          // For UPDATE operations, try to get resourceId from response data if not found in params
          if (action === 'UPDATE' && !resourceId && responseData) {
            try {
              const responseObj = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
              if (responseObj?.data?._id) {
                resourceId = responseObj.data._id;
              }
            } catch (err) {
              console.log('🔍 [AUDIT LOGGER] Could not parse response data for resourceId:', err.message);
            }
          }
          
          // For COUPON updates, try to get resourceId from request body (couponCode)
          if (resource === 'COUPON' && !resourceId && requestData?.couponCode) {
            try {
              const Coupon = require('../models/Coupon/Coupon');
              const coupon = await Coupon.findOne({ couponCode: requestData.couponCode });
              if (coupon) {
                resourceId = coupon._id.toString();
                console.log('🔍 [AUDIT LOGGER] Found coupon resourceId:', resourceId);
              }
            } catch (err) {
              console.log('🔍 [AUDIT LOGGER] Could not find coupon by couponCode:', err.message);
            }
          }
        }
        
        console.log('🔍 [AUDIT LOGGER] Resource info:', { action, resource, resourceId, params: req.params });
        
        const auditData = {
          userId: userId,
          userRole: req.user.role,
          userName: userName,
          userPhoneNumber: userPhoneNumber,
          action: action,
          resource: resource,
          resourceId: resourceId,
          changes: req.method !== 'GET' ? requestData : null,
          previousValues: previousValues,
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          description: `${req.user.role} ${action.toLowerCase()}d ${resource.toLowerCase()}`,
          status: statusCode >= 200 && statusCode < 300 ? 'SUCCESS' : 'FAILED',
          errorMessage: statusCode >= 400 ? responseData?.message || 'Unknown error' : null,
          requestData: requestData,
          responseData: responseData
        };

        // Create audit log asynchronously
        console.log('🔍 [AUDIT LOGGER] Creating audit log with data:', auditData);
        await AuditLog.createLog(auditData);
        console.log('✅ [AUDIT LOGGER] Audit log created successfully');
      } catch (error) {
        console.error('❌ [AUDIT LOGGER] Audit logging error:', error);
        console.error('❌ [AUDIT LOGGER] Error details:', {
          message: error.message,
          errors: error.errors,
          auditData: auditData
        });
        // Don't throw error to avoid breaking the main operation
      }
    });
  };
};

// Middleware to log login attempts
exports.auditLogin = async (req, res, next) => {
  try {
    // Extract user information based on role and token structure
    let userId, userName, userPhoneNumber;
    
    if (req.user?.role === 'SubAdmin') {
      userId = req.user.subAdminId;
      userName = req.user.name;
      userPhoneNumber = req.user.subAdminPhoneNumber;
    } else if (req.user?.role === 'Admin') {
      userId = req.user.adminId;
      userName = req.user.name;
      userPhoneNumber = req.user.adminPhoneNumber;
    } else if (req.user?.role === 'Partner') {
      userId = req.user.partnerId;
      userName = req.user.name;
      userPhoneNumber = req.user.partnerPhoneNumber;
    } else if (req.user?.role === 'User') {
      userId = req.user.userId;
      userName = req.user.name;
      userPhoneNumber = req.user.phoneNumber;
    } else {
      // Fallback for unknown roles
      userId = req.user?.userId || req.user?.adminId || req.user?.partnerId || req.user?.subAdminId || null;
      userName = req.user?.name || 'Unknown';
      userPhoneNumber = req.user?.phoneNumber || req.user?.adminPhoneNumber || req.user?.partnerPhoneNumber || req.user?.subAdminPhoneNumber || 'Unknown';
    }

    const auditData = {
      userId: userId,
      userRole: req.user?.role || 'UNKNOWN',
      userName: userName,
      userPhoneNumber: userPhoneNumber,
      action: 'LOGIN',
      resource: 'USER',
      resourceId: null,
      changes: null,
      previousValues: null,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      description: `${req.user?.role || 'User'} logged in successfully`,
      status: 'SUCCESS',
      errorMessage: null,
      requestData: { phoneNumber: req.body.phoneNumber },
      responseData: { success: true }
    };

    await AuditLog.createLog(auditData);
    next();
  } catch (error) {
    console.error('Login audit logging error:', error);
    next();
  }
};

// Middleware to log failed login attempts
exports.auditLoginFailed = async (req, res, next) => {
  try {
    const auditData = {
      userId: null,
      userRole: 'UNKNOWN',
      userName: 'Unknown',
      userPhoneNumber: req.body.phoneNumber || 'Unknown',
      action: 'LOGIN_FAILED',
      resource: 'USER',
      resourceId: null,
      changes: null,
      previousValues: null,
      ipAddress: getClientIP(req),
      userAgent: getUserAgent(req),
      description: `Failed login attempt for phone number: ${req.body.phoneNumber}`,
      status: 'FAILED',
      errorMessage: res.locals.errorMessage || 'Invalid credentials',
      requestData: { phoneNumber: req.body.phoneNumber },
      responseData: { success: false }
    };

    await AuditLog.createLog(auditData);
    next();
  } catch (error) {
    console.error('Failed login audit logging error:', error);
    next();
  }
};
