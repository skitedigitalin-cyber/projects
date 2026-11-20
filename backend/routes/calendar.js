const express = require('express');
const router = express.Router();
const { getEvents, createEvent, deleteEvent } = require('../controllers/calendarController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', getEvents);
router.post('/', createEvent);
router.delete('/:id', deleteEvent);

module.exports = router;
