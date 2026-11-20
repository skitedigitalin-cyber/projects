const express = require('express');
const router = express.Router();
const quoteCtrl = require('../controllers/quoteController');

router.route('/')
    .get(quoteCtrl.getQuotes)
    .post(quoteCtrl.createQuote);

router.route('/:id')
    .get(quoteCtrl.getQuoteById)
    .put(quoteCtrl.updateQuote)
    .delete(quoteCtrl.deleteQuote);

module.exports = router;
