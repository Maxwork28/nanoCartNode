const express = require('express');
const router = express.Router();
const { createAddress, editAddress, deleteAddress,fetchAddress } = require("../../controllers/partnerController/partnerAddress");

const {verifyToken, verifyTokenAndRole}=require("../../middlewares/verifyToken")

// Create a new address
router.post('/create', ...verifyTokenAndRole(['Partner']), createAddress);

// Edit an existing address
router.put('/:addressId', ...verifyTokenAndRole(['Partner']), editAddress);

// Delete an address
router.delete('/:addressId', ...verifyTokenAndRole(['Partner']), deleteAddress);

//Fetch address details
router.get('/', ...verifyTokenAndRole(['Partner']), fetchAddress);

module.exports = router;