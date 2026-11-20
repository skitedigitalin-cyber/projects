
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Tenant = require('./models/Tenant');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skitecrm').then(async () => {
    console.log('DB Connected');
    
    // Check if CEO exists
    let ceo = await User.findOne({ role: 'CEO' });
    if (ceo) {
        console.log('CEO already exists:', ceo.email);
        process.exit(0);
    }

    // Create HQ Tenant
    const hqTenant = new Tenant({
        companyName: 'Skite Prime HQ',
        subDomain: 'hq',
        subscriptionPlan: 'Enterprise'
    });
    await hqTenant.save();

    // Create CEO
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('ceo123', salt);

    ceo = new User({
        tenantId: hqTenant._id,
        name: 'CEO Admin',
        email: 'ceo@skitecrm.com',
        password: hashedPassword,
        role: 'CEO'
    });
    await ceo.save();

    console.log('CEO Created: ceo@skitecrm.com / ceo123');
    process.exit(0);
});

