
const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/merndb').then(async () => {
    try {
        const admin = await User.findOne({ email: 'ceo@skiteprime.com' }); // or any employee?
        // Wait, the user said 'employee dashboard'. Let's find an employee user.
        const empUser = await User.findOne({ role: 'Employee' });
        if (!empUser) {
            console.log('No employee user found');
            process.exit(0);
        }
        console.log('Found employee user:', empUser.email);
        
        const employee = await Employee.findOne({ userId: empUser._id });
        if (!employee) {
            console.log('Employee profile not found for user');
            process.exit(0);
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let att = await Attendance.findOne({ employeeId: employee._id, date: today });
        console.log('Attendance record:', att);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

