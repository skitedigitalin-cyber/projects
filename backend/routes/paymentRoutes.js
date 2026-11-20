const express = require('express');
const router = express.Router();
const { 
    getPayments, 
    getPaymentById,
    createPayment, 
    updatePaymentDate, 
    deletePayment 
} = require('../controllers/paymentController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.route('/')
    .get(getPayments)
    .post(createPayment);

router.get('/:id', getPaymentById);
router.put('/:id/date', updatePaymentDate);
router.delete('/:id', deletePayment);

module.exports = router;
