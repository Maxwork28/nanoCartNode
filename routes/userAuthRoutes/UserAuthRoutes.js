

/**
 * User Authentication Routes
 * Handles user registration, login, profile management, and OTP operations
 */

const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middlewares/verifyToken");
const { isUser } = require("../../middlewares/isUser");

// Import the required controllers
const {
  signup,
  login,
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  sendPhoneOtp,
  loginWithOTP,
  phoneOtpVerification,
  signupWithOTP,
  resendOTPVoice,
  resendOTPText
} = require("../../controllers/userAuthControllers/UserAuthController");

// ========================================
// FIREBASE AUTHENTICATION ROUTES
// ========================================

/**
 * @route   POST /auth/signup
 * @desc    User registration with Firebase authentication
 * @access  Public
 * @body    { name, phoneNumber, email, idToken }
 */
router.post("/signup", signup);

/**
 * @route   POST /auth/login
 * @desc    User login with Firebase authentication
 * @access  Public
 * @body    { phoneNumber, idToken }
 */
router.post("/login", login);

// ========================================
// OTP-BASED AUTHENTICATION ROUTES
// ========================================

/**
 * @route   POST /auth/signup/otp
 * @desc    User registration with OTP verification
 * @access  Public
 * @body    { name, phoneNumber, email }
 */
router.post("/signup/otp", signupWithOTP);

/**
 * @route   POST /auth/login/otp
 * @desc    User login with OTP verification
 * @access  Public
 * @body    { phoneNumber, otp }
 */
router.post("/login/otp", loginWithOTP);

// ========================================
// OTP MANAGEMENT ROUTES
// ========================================

/**
 * @route   POST /auth/otp
 * @desc    Send OTP to phone number
 * @access  Public
 * @body    { phoneNumber }
 */
router.post("/otp", sendPhoneOtp);

/**
 * @route   POST /auth/otp/verify
 * @desc    Verify OTP for phone number
 * @access  Public
 * @body    { phoneNumber, otp }
 */
router.post("/otp/verify", phoneOtpVerification);

/**
 * @route   POST /auth/otp/resend/voice
 * @desc    Resend OTP via voice call
 * @access  Public
 * @body    { phoneNumber }
 */
router.post("/otp/resend/voice", resendOTPVoice);

/**
 * @route   POST /auth/otp/resend/text
 * @desc    Resend OTP via SMS
 * @access  Public
 * @body    { phoneNumber }
 */
router.post("/otp/resend/text", resendOTPText);

// ========================================
// PROTECTED USER ROUTES
// ========================================

/**
 * @route   GET /auth/profile
 * @desc    Get user profile
 * @access  Private (requires authentication)
 */
router.get("/profile", verifyToken, isUser, getUserProfile);

/**
 * @route   PUT /auth/profile
 * @desc    Update user profile
 * @access  Private (requires authentication)
 * @body    { name, email }
 */
router.put("/profile", verifyToken, isUser, updateUserProfile);

/**
 * @route   DELETE /auth/
 * @desc    Delete user account
 * @access  Private (requires authentication)
 */
router.delete("/", verifyToken, isUser, deleteUserAccount);




// Export the router
module.exports = router;