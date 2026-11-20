const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Tenant = require('./models/Tenant');
const User = require('./models/User');
require('dotenv').config();

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skitecrm');
        console.log('MongoDB connected for seeding...');

        // Check if admin user already exists
        const existingUser = await User.findOne({ email: 'admin@acme.com' });
        if (existingUser) {
            console.log('Admin user already exists. Skipping seed.');
            console.log('-----------------------------------');
            console.log('Login Email:', 'admin@acme.com');
            console.log('Password:', 'admin123');
            console.log('-----------------------------------');
            process.exit();
            return;
        }

        // Create a Tenant (only if no admin exists)
        const tenant = new Tenant({
            companyName: 'Acme Corp',
            subDomain: 'acme'
        });
        await tenant.save();

        // Create Admin User
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const adminUser = new User({
            tenantId: tenant._id,
            name: 'Admin User',
            email: 'admin@acme.com',
            password: hashedPassword,
            role: 'Admin'
        });
        await adminUser.save();

        console.log('Seed data created successfully!');
        console.log('-----------------------------------');
        console.log('Login Email:', 'admin@acme.com');
        console.log('Password:', 'admin123');
        console.log('-----------------------------------');

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedData();
