
const mongoose = require('mongoose');
const User = require('./models/User');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/merndb').then(async () => {
    try {
        const empUser = await User.findOne({ email: 'subramanidev2003@gmail.com' });
        const employee = await Employee.findOne({ userId: empUser._id });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let attendance = await Attendance.findOne({ tenantId: empUser.tenantId, employeeId: employee._id, date: today });
        
        // Reset checkout time so we can test the API
        attendance.checkOutTime = undefined;
        attendance.notes = undefined;
        attendance.totalWorkingMinutes = 0;
        await attendance.save();

        console.log('Reset successful, ready to test API');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
});

