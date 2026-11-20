const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const auth = require('../middleware/authMiddleware');

router.get('/dashboard', auth, financeController.getDashboardStats);

module.exports = router;
