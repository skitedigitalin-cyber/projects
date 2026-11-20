const express = require('express');
const router = express.Router();
const { getVendors, createVendor, updateVendor, deleteVendor } = require('../controllers/vendorController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.route('/')
    .get(getVendors)
    .post(createVendor);

router.route('/:id')
    .put(updateVendor)
    .delete(deleteVendor);

module.exports = router;
