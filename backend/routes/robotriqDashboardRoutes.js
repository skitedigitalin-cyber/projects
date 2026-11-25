const express = require('express');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const { Leave } = require('../models/RobotriqLeave');
const Booking = require('../models/RobotriqBooking');
const protect = require('../middleware/authMiddleware');
const { tenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const router = express.Router();
router.use(protect, requireRobotriqRole('Admin'));

router.get('/', async (req, res) => {
    const [students, employees, pendingLeave, pendingBookings] = await Promise.all([
        Student.countDocuments({ tenantId }),
        Employee.countDocuments({ tenantId, status: 'Active' }),
        Leave.countDocuments({ tenantId, status: 'Pending' }),
        Booking.countDocuments({ tenantId, status: 'Pending' })
    ]);
    res.json({ students, employees, pendingLeave, pendingBookings });
});

module.exports = router;
