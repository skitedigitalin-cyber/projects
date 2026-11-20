const cron = require('node-cron');
const Attendance = require('../models/Attendance');
const CalendarEvent = require('../models/CalendarEvent');

const cleanOldCalendarEvents = async () => {
    try {
        console.log('Running Calendar 1-Year Retention Cleanup...');
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Delete events whose date is older than 1 year
        const result = await CalendarEvent.deleteMany({
            date: { $lt: oneYearAgo }
        });

        if (result.deletedCount > 0) {
            console.log(`Calendar Cleanup: Deleted ${result.deletedCount} events older than 1 year.`);
        } else {
            console.log('No calendar events older than 1 year found.');
        }
    } catch (error) {
        console.error('Error in cleanOldCalendarEvents:', error);
    }
};

const performAutoCheckout = async () => {
    console.log('Running Auto-Checkout Cleanup...');
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Find all attendance records from STRICTLY BEFORE today 
        // where checkOutTime is missing and status is 'Present'
        const incompleteRecords = await Attendance.find({
            date: { $lt: startOfToday },
            checkOutTime: { $exists: false },
            status: 'Present'
        });

        for (const record of incompleteRecords) {
            record.status = 'Absent';
            record.notes = 'System Auto-Generated: User forgot to check-out. Marked as Absent penalty.';
            record.totalWorkingMinutes = 0; 
            await record.save();
        }

        if (incompleteRecords.length > 0) {
            console.log(`Auto-Checkout Complete: ${incompleteRecords.length} records updated to Absent.`);
        } else {
            console.log('No pending auto-checkouts found.');
        }
    } catch (error) {
        console.error('Error in Auto-Checkout Cleanup:', error);
    }
};

const startCronJobs = () => {
    // Note: Automatic auto-checkout at midnight is disabled per business policy.
    // Shifts stay open until the employee manually completes next-day checkout with reason,
    // which then records them as Absent penalty.
    cleanOldCalendarEvents();

    // 2. Run every night at 11:59 PM (23:59) for retention cleanup
    cron.schedule('59 23 * * *', () => {
        cleanOldCalendarEvents();
    });
};

module.exports = startCronJobs;
