
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skiteprime').then(async () => {
    const ceo = await User.findOne({ email: 'ceo@skiteprime.com' });
    console.log(ceo ? 'Found CEO: ' + ceo.email + ' | Role: ' + ceo.role : 'CEO not found');
    process.exit(0);
});

