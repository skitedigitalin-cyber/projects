const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/merndb').then(async () => {
    try {
        const empUser = await User.findOne({ email: 'subramanidev2003@gmail.com' });
        
        const token = jwt.sign(
            { userId: empUser._id, tenantId: empUser.tenantId, role: empUser.role },
            process.env.JWT_SECRET || 'skite_secret_key',
            { expiresIn: '1d' }
        );

        const response = await fetch('http://localhost:5000/api/hr/attendance/check-out', {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: 'Test notes via API' })
        });
        
        const data = await response.json();
        console.log('API Response:', data);
    } catch (e) {
        console.error('API Error:', e);
    }
    process.exit(0);
});
