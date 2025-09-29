const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  createRatingReview,
  deleteRatingReview,
  getRatingsAndReviewsByItemDetailId,
} = require("../../controllers/partnerController/partnerRatingReviewController"); // Adjust path
const { auditLogger } = require('../../middlewares/auditLogger');
const { verifyToken, verifyTokenAndRole } = require("../../middlewares/verifyToken"); // Adjust path

// Configure Multer for multiple file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
});


// Create a review (Authenticated, supports multiple image uploads)
router.post(
  "/create",
  ...verifyTokenAndRole(['Partner']),
  upload.array("customerProductImage", 5), // Match schema field, max 5 images
  createRatingReview
);

// Delete a review (Authenticated)
router.delete("/:reviewId", ...verifyTokenAndRole(['Partner']), deleteRatingReview);

// Get all reviews and ratings And Customer pic of patricular itemDetailId
router.get("/:itemDetailId", getRatingsAndReviewsByItemDetailId);

module.exports = router;
