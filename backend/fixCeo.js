
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Tenant = require('./models/Tenant');

mongoose.connect('mongodb://127.0.0.1:27017/skitecrm').then(async () => {
    await User.deleteMany({ role: 'CEO' });

    const hqTenant = new Tenant({
        companyName: 'Skite Prime HQ',
        subDomain: 'hq',
        subscriptionPlan: 'Enterprise'
    });
    await hqTenant.save();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('ceo123', salt);

    const ceo = new User({
        tenantId: hqTenant._id,
        name: 'CEO Admin',
        email: 'ceo@skiteprime.com',
        password: hashedPassword,
        role: 'CEO'
    });
    await ceo.save();

    console.log('CEO Fixed: ceo@skiteprime.com / ceo123');
    process.exit(0);
});

