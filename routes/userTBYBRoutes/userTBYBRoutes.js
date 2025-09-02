const express = require('express');
const router = express.Router();

const {createTBYBEntry, getTBYBByUserId}=require("../../controllers/userTBYBController/userTBYBController")
const {verifyToken}=require("../../middlewares/verifyToken")
const {isUser}=require("../../middlewares/isUser")

// POST /api/tbyb — create TBYB entry
router.post("/", verifyToken,isUser, createTBYBEntry);

// GET /api/tbyb — get all TBYB entries by user ID
router.get("/", verifyToken,isUser, getTBYBByUserId);

module.exports = router