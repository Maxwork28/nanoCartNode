const express = require("express");
const router = express.Router();
const {
  getWalletDetails,
} = require("../../controllers/partnerController/partnerWalletController");
const {verifyToken, verifyTokenAndRole} = require("../../middlewares/verifyToken"); 


// Get partner's wallet details (INR)
router.get("/", ...verifyTokenAndRole(['Partner']), getWalletDetails);


module.exports = router;