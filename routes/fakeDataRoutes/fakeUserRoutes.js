const express = require('express');
const router = express.Router();
const { generateFakeUsers, deleteFakeUsers, getAllFakeUsers, deleteOneFakeUser } = require("../../controllers/fakeDataController/fakeUserController");
const { verifyTokenAndRole } = require("../../middlewares/verifyToken");
const { auditLogger } = require('../../middlewares/auditLogger');

// Generate Fake User
router.post('/generate', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), generateFakeUsers);

// Delete Fake User
router.delete("/", ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteFakeUsers);

// Route to get all fake users
router.get('/', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), getAllFakeUsers);

// Route to delete a single fake user
router.delete('/delete-one-fake-user', ...verifyTokenAndRole(['Admin', 'SubAdmin']),auditLogger(), deleteOneFakeUser);

module.exports = router;