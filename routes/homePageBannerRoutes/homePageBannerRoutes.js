const express = require("express");
const multer = require("multer");
const router = express.Router();
const {
  uploadBanner,
  deleteBanner,
  updateBanner,
  getAllBanners,
  getBannerById,
} = require("../../controllers/homePageBannerController/homePageBanner");
const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');
// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.split(".").pop().toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
  },
});

// Routes
router.post("/upload", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("bannerImage"), uploadBanner);
router.delete("/:id", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteBanner);
router.put("/:id", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), upload.single("bannerImage"), updateBanner);
router.get("/", getAllBanners);
router.get("/:id", getBannerById);

module.exports = router;