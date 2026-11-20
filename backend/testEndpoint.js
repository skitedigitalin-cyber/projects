
const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/merndb').then(async () => {
    try {
        const empUser = await User.findOne({ email: 'subramanidev2003@gmail.com' });
        
        const token = jwt.sign(
            { userId: empUser._id, tenantId: empUser.tenantId, role: empUser.role },
            process.env.JWT_SECRET || 'skite_secret_key',
            { expiresIn: '1d' }
        );

        const res = await axios.post('http://localhost:5000/api/hr/attendance/check-out', {
            notes: 'Test notes via API'
        }, {
            headers: { Authorization: \Bearer \\ }
        });

        console.log('API Response:', res.data);
    } catch (e) {
        console.error('API Error:', e.response ? e.response.data : e.message);
    }
    process.exit(0);
});

