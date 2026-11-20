
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skiteprime').then(async () => {
    const ceo = await User.findOne({ email: 'ceo@skiteprime.com' });
    const isMatch = await bcrypt.compare('ceo123', ceo.password);
    console.log('Password Match:', isMatch);
    process.exit(0);
});

