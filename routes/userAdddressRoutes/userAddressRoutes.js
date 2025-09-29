const express = require('express');
const router = express.Router();
const { createAddress, editAddress, deleteAddress,fetchAddress } = require('../../controllers/userAddressController/userAddressController');

const {verifyTokenAndRole}=require("../../middlewares/verifyToken")

// Create a new address
router.post('/create', ...verifyTokenAndRole(['User']), createAddress);

// Edit an existing address
router.put('/:addressId', ...verifyTokenAndRole(['User']), editAddress);

// Delete an address
router.delete('/:addressId', ...verifyTokenAndRole(['User']), deleteAddress);

//Fetch address details
router.get('/', ...verifyTokenAndRole(['User']), fetchAddress);

module.exports = router;