const express = require('express');
const router = express.Router();
const { getCustomers, createCustomer, updateCustomer, deleteCustomer } = require('../controllers/customerController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.route('/')
    .get(getCustomers)
    .post(createCustomer);

router.route('/:id')
    .put(updateCustomer)
    .delete(deleteCustomer);

module.exports = router;
