const mongoose = require("mongoose");
const User = require("../../models/User/User.js");
const Partner = require("../../models/Partner/Partner");
const UserOrder = require("../../models/User/UserOrder");
const UserAddress = require("../../models/User/UserAddress");
const UserCart = require("../../models/User/UserCart");
const UserRatingReview = require("../../models/User/UserRatingReview");
const UserTBYB = require("../../models/User/UserTBYB");
const UserWishlist = require("../../models/User/UserWishlist");
const { apiResponse } = require("../../utils/apiResponse");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const admin = require("firebase-admin");
const PhoneOTP = require("../../models/OTP/PhoneOTP.js");
const RefreshToken = require("../../models/Auth/RefreshToken");
const msg91Service = require("../../utils/msg91Service");

// Helper function to generate access token
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "2m", // Short-lived access token (2 minutes) - FOR TESTING
  });
};

// Helper function to generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Helper function to create token pair (access + refresh)
const createTokenPair = async (user, role) => {
  let payload;
  
  if (role === "Admin") {
    payload = {
      adminId: user._id,
      adminPhoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } else if (role === "SubAdmin") {
    payload = {
      subAdminId: user._id,
      subAdminPhoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || []
    };
  } else if (role === "Partner") {
    payload = {
      partnerId: user._id,
      partnerPhoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } else {
    payload = {
      userId: user._id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  }

  const accessToken = generateAccessToken(payload);
  const refreshTokenValue = generateRefreshToken();

  // Store refresh token in database
  await RefreshToken.create({
    userId: user._id,
    token: refreshTokenValue,
    role: user.role
  });

  return { accessToken, refreshToken: refreshTokenValue };
};

exports.signup = async (req, res) => {
  console.log('=== SIGNUP FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { name, phoneNumber, email, idToken } = req.body;

    // Validate input
    console.log('Validating input fields...');
    console.log('Name:', name);
    console.log('Phone Number:', phoneNumber);
    console.log('Email:', email);
    console.log('ID Token present:', !!idToken);
    
    if (!name || !phoneNumber || !email || !idToken) {
      console.log('❌ Validation failed: Missing required fields');
      return res
        .status(400)
        .json(apiResponse(400, false, "Name, phone number, email, and ID token are required"));
    }
    console.log('✅ Input validation passed');

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken.phone_number !== phoneNumber) {
        return res
          .status(401)
          .json(apiResponse(401, false, "Phone number does not match ID token"));
      }
    } catch (error) {
      console.error("Firebase token verification error:", error.message);
      return res.status(401).json(apiResponse(401, false, "Invalid or expired ID token"));
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ phoneNumber }, { email }],
    });
    if (existingUser) {
      return res
        .status(403)
        .json(apiResponse(403, false, "User already exists. Please log in"));
    }

    // Create user in MongoDB
    const user = await User.create({
      name,
      phoneNumber,
      email,
      isPhoneVerified: true,
      isActive: true,
      role: "User",
      isPartner: false,
      firebaseUid: decodedToken.uid, // Store Firebase UID for reference
    });

    // Generate JWT token
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not configured");
    const payload = {
      userId: user._id,
      role: user.role,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Set token in header
    res.setHeader("Authorization", `Bearer ${token}`);

    return res
      .status(200)
      .json(apiResponse(200, true, "User signed up successfully", { token }));
  } catch (error) {
    console.error("Signup Error:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.login = async (req, res) => {
  console.log('=== LOGIN FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { phoneNumber, idToken } = req.body;

    // Validate input
    console.log('Validating login input fields...');
    console.log('Phone Number:', phoneNumber);
    console.log('ID Token present:', !!idToken);
    
    if (!phoneNumber || !idToken) {
      console.log('❌ Login validation failed: Missing required fields');
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number and ID token are required"));
    }
    console.log('✅ Login input validation passed');

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      if (decodedToken.phone_number !== phoneNumber) {
        return res
          .status(401)
          .json(apiResponse(401, false, "Phone number does not match ID token"));
      }
    } catch (error) {
      console.error("Firebase token verification error:", error.message);
      return res.status(401).json(apiResponse(401, false, "Invalid or expired ID token"));
    }

    // Find user in MongoDB
    console.log('🔍 Searching for user in MongoDB...');
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.log('❌ User not found in MongoDB for phone:', phoneNumber);
      return res
        .status(404)
        .json(apiResponse(404, false, "User not found. Please sign up first"));
    }
    console.log('✅ User found in MongoDB:', {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isPartner: user.isPartner
    });

    // Ensure JWT_SECRET is configured
    console.log('🔑 Checking JWT_SECRET configuration...');
    if (!process.env.JWT_SECRET) {
      console.log('❌ JWT_SECRET not configured');
      throw new Error("JWT_SECRET not configured");
    }
    console.log('✅ JWT_SECRET is configured');

    let token;
    // Admin Flow
    console.log('🔄 Processing login flow for role:', user.role);
    if (user.role === "Admin") {
      console.log('👑 Processing Admin login flow...');
      
      const { accessToken, refreshToken } = await createTokenPair(user, user.role);
      console.log('✅ Token pair generated for admin');
      
      res.setHeader("Authorization", `Bearer ${accessToken}`);
      console.log('🚀 Admin login successful, returning response');
      return res
        .status(200)
        .json(apiResponse(200, true, "Admin logged in successfully", { 
          accessToken, 
          refreshToken,
          role: user.role 
        }));
    }

    // SubAdmin Flow
    if (user.role === "SubAdmin") {
      console.log('👨‍💼 Processing SubAdmin login flow...');
      
      // Check if subadmin is active
      if (!user.isSubAdminActive) {
        console.log('❌ SubAdmin account is deactivated');
        return res
          .status(403)
          .json(apiResponse(403, false, "SubAdmin account is deactivated"));
      }
      
      const { accessToken, refreshToken } = await createTokenPair(user, user.role);
      console.log('✅ Token pair generated for subadmin');
      
      res.setHeader("Authorization", `Bearer ${accessToken}`);
      console.log('🚀 SubAdmin login successful, returning response');
      return res
        .status(200)
        .json(apiResponse(200, true, "SubAdmin logged in successfully", { 
          accessToken, 
          refreshToken,
          role: user.role,
          permissions: user.permissions || []
        }));
    }

    // Partner Flow
    console.log('🤝 Checking Partner login flow...');
    if (user.isPartner === true && user.isActive === false) {
      console.log('🔍 Searching for partner record...');
      const partner = await Partner.findOne({ phoneNumber });
      if (!partner) {
        console.log('❌ Partner record not found for phone:', phoneNumber);
        return res
          .status(404)
          .json(apiResponse(404, false, "Partner record not found"));
      }
      console.log('✅ Partner record found:', {
        partnerId: partner._id,
        name: partner.name,
        isVerified: partner.isVerified,
        isActive: partner.isActive
      });
      
      if (!partner.isVerified) {
        console.log('❌ Partner is not verified');
        return res
          .status(403)
          .json(apiResponse(403, false, "Partner is not verified"));
      }
      if (!partner.isActive) {
        console.log('❌ Partner account is inactive');
        return res
          .status(403)
          .json(apiResponse(403, false, "Partner account is inactive"));
      }
      console.log('✅ Partner verification and status checks passed');

      const partnerPayload = {
        partnerId: partner._id,
        phoneNumber: partner.phoneNumber,
        email: partner.email,
        name: partner.name,
        role: "Partner",
        isActive: partner.isActive,
      };
      token = jwt.sign(partnerPayload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
      res.setHeader("Authorization", `Bearer ${token}`);
      return res
        .status(200)
        .json(apiResponse(200, true, "Partner logged in successfully", { token, role: user.role }));
    }

    // Normal User Flow
    if (!user.isActive) {
      return res
        .status(403)
        .json(apiResponse(403, false, "User account is inactive"));
    }

    const userPayload = {
      userId: user._id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
    token = jwt.sign(userPayload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    res.setHeader("Authorization", `Bearer ${token}`);
    return res
      .status(200)
      .json(apiResponse(200, true, "User logged in successfully", { token, role: user.role }));
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId).select("name email phoneNumber");
    if (!user) {
      return res.status(404).json(apiResponse(404, false, "User not found"));
    }

    const data = {
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
    };

    return res
      .status(200)
      .json(apiResponse(200, true, "User profile fetched successfully", data));
  } catch (error) {
    console.error("Get user profile error:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json(apiResponse(400, false, "Name and email are required"));
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email },
      { new: true, runValidators: true, select: "name email phoneNumber" }
    );

    if (!updatedUser) {
      return res.status(404).json(apiResponse(404, false, "User not found"));
    }

    const data = {
      name: updatedUser.name,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
    };

    return res
      .status(200)
      .json(apiResponse(200, true, "User profile updated successfully", data));
  } catch (error) {
    console.error("Update user profile error:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

exports.deleteUserAccount = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid userId"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json(apiResponse(404, false, "User not found"));
    }

    // Delete Firebase user (optional, if you want to remove from Firebase Auth)
    try {
      await admin.auth().deleteUser(user.firebaseUid);
    } catch (error) {
      console.warn("Firebase user deletion failed:", error.message);
      // Continue with MongoDB deletion even if Firebase deletion fails
    }

    const activeOrders = await UserOrder.find({
      userId,
      orderStatus: { $nin: ["Cancelled", "Delivered"] },
    });

    if (activeOrders.length > 0) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Cannot delete account with active orders"));
    }

    await UserOrder.deleteMany({ userId });
    await UserRatingReview.deleteMany({ userId });
    await UserAddress.deleteMany({ userId });
    await UserCart.deleteOne({ userId });
    await UserTBYB.deleteMany({ userId });
    await UserWishlist.deleteMany({ userId });
    await User.deleteOne({ _id: userId });

    return res
      .status(200)
      .json(apiResponse(200, true, "User account deleted successfully"));
  } catch (error) {
    console.error("Error deleting user account:", error.message);
    return res.status(500).json(apiResponse(500, false, "Server error while deleting account"));
  }
};


exports.sendPhoneOtp = async (req, res) => {
  console.log('=== SEND PHONE OTP FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Valid 10-digit phone number required"));
    }

    try {
      // Send OTP via MSG91 service (MSG91 generates its own OTP)
      console.log('📤 Sending OTP via MSG91 service...');
      const msg91Response = await msg91Service.sendOTP(phoneNumber);
      console.log('✅ MSG91 response:', msg91Response);
      
      // MSG91 generates its own OTP and doesn't return it for security
      // We only store a reference that OTP was sent, not the actual OTP
      console.log('💾 Storing OTP reference in database...');
    const phoneNumberExist = await PhoneOTP.findOne({ phoneNumber });
    if (!phoneNumberExist) {
        await PhoneOTP.create({ 
          phoneNumber, 
          otp: 'SENT_VIA_MSG91', // Placeholder since MSG91 handles the actual OTP
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          isVerified: false
        });
        console.log('✅ New OTP reference record created in database');
    } else {
        phoneNumberExist.otp = 'SENT_VIA_MSG91';
        phoneNumberExist.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        phoneNumberExist.isVerified = false;
      await phoneNumberExist.save();
        console.log('✅ Existing OTP reference record updated in database');
      }

      console.log('🚀 OTP sent successfully, returning response');
      return res.status(200).json(apiResponse(200, true, "OTP sent successfully"));
    } catch (msg91Error) {
      console.error("❌ MSG91 Error:", msg91Error.message);
      console.error("MSG91 Error stack:", msg91Error.stack);
      return res.status(500).json(apiResponse(500, false, "Failed to send OTP via SMS"));
    }
  } catch (error) {
    console.error("❌ Error in sendPhoneOtp:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json(apiResponse(500, false, "Failed to send OTP"));
  }
};

exports.phoneOtpVerification = async (req, res) => {
  console.log('=== PHONE OTP VERIFICATION FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { phoneNumber, otp } = req.body;
    console.log('📱 Verifying OTP for phone:', phoneNumber);
    console.log('🔢 OTP received:', otp);
    
    if (!phoneNumber || !otp) {
      console.log('❌ Missing required fields');
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number and OTP are required"));
    }
    
    console.log('🔍 Checking OTP record in database...');
    const dbOtpEntry = await PhoneOTP.findOne({ phoneNumber });
    if (!dbOtpEntry) {
      console.log('❌ OTP record not found in database');
      return res
        .status(404)
        .json(
          apiResponse(404, false, "OTP not found. Please request a new one.")
        );
    }
    console.log('✅ OTP record found in database:', {
      phoneNumber: dbOtpEntry.phoneNumber,
      otp: dbOtpEntry.otp,
      expiresAt: dbOtpEntry.expiresAt,
      isVerified: dbOtpEntry.isVerified
    });
    
    if (dbOtpEntry.expiresAt < new Date()) {
      console.log('❌ OTP has expired');
      return res.status(410).json(apiResponse(410, false, "OTP has expired"));
    }
    console.log('✅ OTP has not expired');
    
    // Use MSG91 to verify the OTP instead of comparing with stored value
    console.log('🔐 Verifying OTP with MSG91 service...');
    try {
      const verificationResult = await msg91Service.verifyOTP(phoneNumber, otp);
      console.log('✅ MSG91 verification result:', verificationResult);
      
      if (verificationResult.success) {
    dbOtpEntry.isVerified = true;
    await dbOtpEntry.save();
        console.log('✅ OTP verified successfully, database updated');
        
    return res
      .status(200)
      .json(apiResponse(200, true, "Phone verified successfully"));
      } else {
        console.log('❌ MSG91 verification failed');
        return res.status(401).json(apiResponse(401, false, "Invalid OTP"));
      }
    } catch (msg91Error) {
      console.error('❌ MSG91 verification error:', msg91Error.message);
      return res.status(500).json(apiResponse(500, false, "OTP verification service error"));
    }
  } catch (error) {
    console.error("❌ Error in phoneOtpVerification:", error.message);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Resend OTP via voice call
exports.resendOTPVoice = async (req, res) => {
  console.log('=== RESEND OTP VOICE FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Valid 10-digit phone number required"));
    }

    // Check if OTP exists and is not expired
    const existingOTP = await PhoneOTP.findOne({ phoneNumber });
    if (!existingOTP) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No OTP found. Please request a new one first."));
    }

    if (existingOTP.expiresAt < new Date()) {
      return res
        .status(410)
        .json(apiResponse(410, false, "OTP has expired. Please request a new one."));
    }

    // Resend OTP via voice call using MSG91
    await msg91Service.resendOTPVoice(phoneNumber);
    
    console.log('🚀 OTP resent via voice call successfully');
    return res
      .status(200)
      .json(apiResponse(200, true, "OTP resent via voice call successfully"));
  } catch (error) {
    console.error("❌ Error in resendOTPVoice:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json(apiResponse(500, false, "Failed to resend OTP via voice"));
  }
};

// Resend OTP via text message
exports.resendOTPText = async (req, res) => {
  console.log('=== RESEND OTP TEXT FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Valid 10-digit phone number required"));
    }

    // Check if OTP exists and is not expired
    const existingOTP = await PhoneOTP.findOne({ phoneNumber });
    if (!existingOTP) {
      return res
        .status(404)
        .json(apiResponse(404, false, "No OTP found. Please request a new one first."));
    }

    if (existingOTP.expiresAt < new Date()) {
      return res
        .status(410)
        .json(apiResponse(410, false, "OTP has expired. Please request a new one."));
    }

    // Resend OTP via text message using MSG91
    await msg91Service.resendOTPText(phoneNumber);
    
    console.log('🚀 OTP resent via SMS successfully');
    return res
      .status(200)
      .json(apiResponse(200, true, "OTP resent via SMS successfully"));
  } catch (error) {
    console.error("❌ Error in resendOTPText:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json(apiResponse(500, false, "Failed to resend OTP via SMS"));
  }
};

// Alternative signup method using OTP verification (without Firebase)
exports.signupWithOTP = async (req, res) => {
  console.log('=== SIGNUP WITH OTP FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { name, phoneNumber, email } = req.body;
    console.log('Validating signup input fields...');
    console.log('Name:', name);
    console.log('Phone Number:', phoneNumber);
    console.log('Email:', email);
    
    if (!name || !phoneNumber || !email) {
      console.log('❌ Signup validation failed: Missing required fields');
      return res
        .status(400)
        .json(
          apiResponse(400, false, "Name, phone number, and email are required")
        );
    }
    console.log('✅ Signup input validation passed');
    const existingUser = await User.findOne({
      $or: [{ phoneNumber }, { email }],
    });
    if (existingUser) {
      return res
        .status(403)
        .json(apiResponse(403, false, "User already exists. Please log in"));
    }
    console.log('🔍 Checking phone verification status...');
    const phoneDetails = await PhoneOTP.findOne({ phoneNumber });
    if (!phoneDetails || !phoneDetails.isVerified) {
      console.log('❌ Phone not verified:', {
        phoneDetails: phoneDetails,
        isVerified: phoneDetails?.isVerified
      });
      return res
        .status(403)
        .json(apiResponse(403, false, "Please verify your phone number first"));
    }
    console.log('✅ Phone number is verified');
    // Create user
    console.log('👤 Creating new user...');
    const user = await User.create({
      name,
      phoneNumber,
      email,
      isPhoneVerified: true,
      isActive: true,
      role: "User",
      isPartner: false,
    });
    console.log('✅ User created successfully:', {
      userId: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email
    });

    // Generate JWT token
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not configured");
    const payload = {
      userId: user._id,
      role: user.role,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    // Delete OTP
    console.log('🧹 Cleaning up OTP record...');
    await PhoneOTP.findOneAndDelete({ phoneNumber });

    // Set token in header
    res.setHeader("Authorization", `Bearer ${token}`);

    console.log('🚀 User signed up successfully with OTP, returning response');
    return res
      .status(200)
      .json(apiResponse(200, true, "User signed up successfully", { token }));
  } catch (error) {
    console.error("❌ SIGNUP WITH OTP ERROR:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};


// Alternative login method using OTP verification (without Firebase)
exports.loginWithOTP = async (req, res) => {
  console.log('=== LOGIN WITH OTP FUNCTION CALLED ===');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  
  try {
    const { phoneNumber, otp } = req.body;


    // Validate input
    console.log('Validating login input fields...');
    console.log('Phone Number:', phoneNumber);
    console.log('OTP received:', otp);
    
    if (!phoneNumber || !otp) {
      console.log('❌ Login validation failed: Missing required fields');
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number and OTP are required"));
    }
    console.log('✅ Login input validation passed');

    // Find user in User model
    console.log('🔍 Searching for user in MongoDB...');
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      console.log('❌ User not found in MongoDB for phone:', phoneNumber);
      return res
        .status(404)
        .json(
          apiResponse(404, false, "User not found please be first signup ")
        );
    }
    console.log('✅ User found in MongoDB:', {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isPartner: user.isPartner
    });
    
    // Verify OTP with MSG91
    console.log('🔍 Checking OTP record in database...');
    const phoneOTP = await PhoneOTP.findOne({ phoneNumber });
    if (!phoneOTP) {
      console.log('❌ OTP record not found in database');
      return res.status(404).json(apiResponse(404, false, "OTP not found"));
    }
    console.log('✅ OTP record found in database');
    
    if (phoneOTP.expiresAt < new Date()) {
      console.log('❌ OTP has expired');
      return res.status(410).json(apiResponse(410, false, "OTP has expired"));
    }
    console.log('✅ OTP has not expired');
    
    // Check if OTP is already verified in our database
    console.log('🔍 Checking if OTP is already verified in database...');
    if (!phoneOTP.isVerified) {
      console.log('❌ OTP is not verified in database');
      return res.status(401).json(apiResponse(401, false, "Please verify your OTP first"));
    }
    console.log('✅ OTP is already verified in database');

    // Delete OTP
    await PhoneOTP.findOneAndDelete({ phoneNumber });

    // Check phone verification
    if (!user.isPhoneVerified) {
      return res
        .status(403)
        .json(apiResponse(403, false, "Phone number is not verified"));
    }

    // Ensure JWT_SECRET is configured
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET not configured");

    let token;
    // Admin Flow:
    if (user.role === "Admin") {
      const adminPayload = {
        adminId: user._id,
        adminPhoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      token = jwt.sign(adminPayload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
      res.setHeader("Authorization", `Bearer ${token}`);
      return res
        .status(200)
        .json(apiResponse(200, true, "Admin logged in successfully", { token,role:user.role }));
    }

    // SubAdmin Flow:
    if (user.role === "SubAdmin") {
      // Check if subadmin is active
      if (!user.isSubAdminActive) {
        return res
          .status(403)
          .json(apiResponse(403, false, "SubAdmin account is deactivated"));
      }

      const subAdminPayload = {
        subAdminId: user._id,
        subAdminPhoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || []
      };

      token = jwt.sign(subAdminPayload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
      res.setHeader("Authorization", `Bearer ${token}`);
      return res
        .status(200)
        .json(apiResponse(200, true, "SubAdmin logged in successfully", { 
          token, 
          role: user.role,
          permissions: user.permissions || []
        }));
    }

    // Partner Flow:
    if (user.isPartner === true && user.isActive === false) {
      const partner = await Partner.findOne({ phoneNumber: phoneNumber });
      if (!partner) {
        return res
          .status(404)
          .json(apiResponse(404, false, "Partner record not found"));
      }
      if (!partner.isVerified) {
        return res
          .status(403)
          .json(apiResponse(403, false, "Partner is not verified"));
      }
      if (!partner.isActive) {
        return res
          .status(403)
          .json(apiResponse(403, false, "Partner account is inactive"));
      }

      // Generate token for partner
      console.log('🎫 Creating partner payload...');
      const partnerPayload = {
        partnerId: partner._id,
        phoneNumber: partner.phoneNumber,
        email: partner.email,
        name: partner.name,
        role: "Partner",
        isActive: partner.isActive,
      };
      console.log('Partner payload created:', partnerPayload);

      console.log('🔑 Generating JWT token for partner...');
      token = jwt.sign(partnerPayload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
      console.log('✅ JWT token generated for partner');
      console.log('Token length:', token.length);
      
      res.setHeader("Authorization", `Bearer ${token}`);
      console.log('🧹 Cleaning up OTP record...');
      await PhoneOTP.findOneAndDelete({ phoneNumber });
      console.log('🚀 Partner login successful, returning response');
      return res
        .status(200)
        .json(
          apiResponse(200, true, "Partner logged in successfully", { token,role:user.role })
        );
    }

    // Normal User Flow: If isPartner is false (before verification)
    else {
      console.log('👤 Processing Normal User login flow...');
      if (!user.isActive) {
        console.log('❌ User account is inactive');
        return res
          .status(403)
          .json(apiResponse(403, false, "User account is inactive"));
      }
      console.log('✅ User account is active');

      // Generate token for normal user
      console.log('🎫 Creating user payload...');
      const userPayload = {
        userId: user._id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      };
      console.log('User payload created:', userPayload);

      console.log('🔑 Generating JWT token for normal user...');
      token = jwt.sign(userPayload, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
      console.log('✅ JWT token generated for normal user');
      console.log('Token length:', token.length);
      
      res.setHeader("Authorization", `Bearer ${token}`);
      console.log('🧹 Cleaning up OTP record...');
      await PhoneOTP.findOneAndDelete({ phoneNumber });
      console.log('🚀 Normal user login successful, returning response');
      return res
        .status(200)
        .json(apiResponse(200, true, "User logged in successfully", { token ,role:user.role }));
    }
  } catch (error) {
    console.error("❌ LOGIN WITH OTP ERROR:", error.message);
    console.error("Error stack:", error.stack);
    return res.status(500).json(apiResponse(500, false, error.message));
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  console.log('=== REFRESH TOKEN FUNCTION CALLED ===');
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json(apiResponse(400, false, "Refresh token is required"));
    }

    // Find the refresh token in database
    const storedToken = await RefreshToken.findOne({ 
      token: refreshToken,
      isActive: true 
    }).populate('userId');

    if (!storedToken) {
      return res.status(401).json(apiResponse(401, false, "Invalid refresh token"));
    }

    // Check if refresh token is expired
    if (!storedToken.isValid()) {
      await RefreshToken.findByIdAndUpdate(storedToken._id, { isActive: false });
      return res.status(401).json(apiResponse(401, false, "Refresh token has expired"));
    }

    // Check if user still exists and is active
    const user = storedToken.userId;
    if (!user || !user.isActive) {
      await RefreshToken.findByIdAndUpdate(storedToken._id, { isActive: false });
      return res.status(401).json(apiResponse(401, false, "User account is inactive"));
    }

    // Generate new token pair
    const { accessToken, refreshToken: newRefreshToken } = await createTokenPair(user, user.role);

    // Deactivate old refresh token
    await RefreshToken.findByIdAndUpdate(storedToken._id, { 
      isActive: false,
      lastUsed: new Date()
    });

    res.setHeader("Authorization", `Bearer ${accessToken}`);
    
    return res.status(200).json(apiResponse(200, true, "Tokens refreshed successfully", {
      accessToken,
      refreshToken: newRefreshToken,
      role: user.role
    }));

  } catch (error) {
    console.error("❌ REFRESH TOKEN ERROR:", error.message);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};

// Logout endpoint to invalidate refresh token
exports.logout = async (req, res) => {
  console.log('=== LOGOUT FUNCTION CALLED ===');
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Deactivate the refresh token
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { isActive: false }
      );
    }

    return res.status(200).json(apiResponse(200, true, "Logged out successfully"));
  } catch (error) {
    console.error("❌ LOGOUT ERROR:", error.message);
    return res.status(500).json(apiResponse(500, false, "Internal server error"));
  }
};
