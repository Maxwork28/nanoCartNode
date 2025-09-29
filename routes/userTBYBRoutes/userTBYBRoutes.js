const express = require('express');
const router = express.Router();

const {createTBYBEntry, getTBYBByUserId}=require("../../controllers/userTBYBController/userTBYBController")
const {verifyToken, verifyTokenAndRole}=require("../../middlewares/verifyToken")

// POST /api/tbyb — create TBYB entry
router.post("/", ...verifyTokenAndRole(['User']), createTBYBEntry);

// GET /api/tbyb — get all TBYB entries by user ID
router.get("/", ...verifyTokenAndRole(['User']), getTBYBByUserId);

module.exports = router