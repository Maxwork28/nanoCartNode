const express = require('express');
const router = express.Router();
const { generatePositiveFakeReviewsForItem, deleteFakeReviewsForItem, getAllFakeRatingsForItem } = require("../../controllers/fakeDataController/fakeReviewRatingController");
const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');
// Route to generate positive fake reviews
router.post('/generate-positive-fake-reviews', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), generatePositiveFakeReviewsForItem);

// Route to delete fake reviews for an item
router.delete('/delete-fake-reviews', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteFakeReviewsForItem);

// Route to get fake rating and review for an item
router.get("/all-rating", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllFakeRatingsForItem);

module.exports = router;