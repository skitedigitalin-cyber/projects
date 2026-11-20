const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');

router.get('/', receiptController.getReceipts);
router.get('/:id', receiptController.getReceiptById);
router.post('/', receiptController.createReceipt);
router.delete('/:id', receiptController.deleteReceipt);

module.exports = router;
