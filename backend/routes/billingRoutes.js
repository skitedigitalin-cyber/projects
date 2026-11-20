const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { createOrder, verifyPayment, createRegistrationOrder, getBillingOverview } = require('../controllers/billingController');

// Public route for new workspace registration order
router.post('/create-registration-order', createRegistrationOrder);

router.use(auth);

router.get('/overview', getBillingOverview);
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;
