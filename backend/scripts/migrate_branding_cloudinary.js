const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: 'backend/.env' });
const { cloudinary } = require('../utils/cloudinary');

async function migrateSkiteBranding() {
    await mongoose.connect(process.env.MONGO_URI);
    const Tenant = require('../models/Tenant');
    const tenant = await Tenant.findById('6af2c94a9d29730751ed2d01');

    if (!tenant) {
        console.log('Skite tenant not found');
        process.exit(1);
    }

    console.log('Migrating Skite branding assets to Cloudinary...');

    if (tenant.invoiceLogo && tenant.invoiceLogo.startsWith('data:image')) {
        const res = await cloudinary.uploader.upload(tenant.invoiceLogo, {
            folder: 'skite_prime/tenants/6af2c94a9d29730751ed2d01/branding'
        });
        tenant.invoiceLogo = res.secure_url;
        console.log('Migrated Logo to Cloudinary:', res.secure_url);
    }

    if (tenant.invoiceSign && tenant.invoiceSign.startsWith('data:image')) {
        const res = await cloudinary.uploader.upload(tenant.invoiceSign, {
            folder: 'skite_prime/tenants/6af2c94a9d29730751ed2d01/branding'
        });
        tenant.invoiceSign = res.secure_url;
        console.log('Migrated Sign to Cloudinary:', res.secure_url);
    }

    if (tenant.invoiceSeal && tenant.invoiceSeal.startsWith('data:image')) {
        const res = await cloudinary.uploader.upload(tenant.invoiceSeal, {
            folder: 'skite_prime/tenants/6af2c94a9d29730751ed2d01/branding'
        });
        tenant.invoiceSeal = res.secure_url;
        console.log('Migrated Seal to Cloudinary:', res.secure_url);
    }

    await tenant.save();
    console.log('Skite Tenant successfully updated with Cloudinary URLs in DB!');
    process.exit(0);
}

migrateSkiteBranding().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
