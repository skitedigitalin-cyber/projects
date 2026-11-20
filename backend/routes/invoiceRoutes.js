const express = require('express');
const router = express.Router();
const { 
    getInvoices, createInvoice, updateInvoice, deleteInvoice,
    updatePayment, updateLastPaymentDate, updateInvoicePaymentDate, deleteInvoicePayment 
} = require('../controllers/invoiceController');
const auth = require('../middleware/authMiddleware');

router.use(auth);

router.put('/update-payment/:id', updatePayment);
router.put('/update-last-payment-date/:id', updateLastPaymentDate);
router.put('/:id/payment/:paymentIndex/date', updateInvoicePaymentDate);
router.delete('/:id/payment/:paymentIndex', deleteInvoicePayment);

router.route('/')
    .get(getInvoices)
    .post(createInvoice);

router.route('/:id')
    .put(updateInvoice)
    .delete(deleteInvoice);

module.exports = router;
