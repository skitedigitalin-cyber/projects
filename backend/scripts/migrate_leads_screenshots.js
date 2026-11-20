const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: 'backend/.env' });
const path = require('path');
const fs = require('fs');
const { cloudinary } = require('../utils/cloudinary');

async function migrateLeadsScreenshots() {
    await mongoose.connect(process.env.MONGO_URI);
    const Lead = require('../models/Lead');
    const leads = await Lead.find({ paymentScreenshot: { $regex: '^/uploads/' } });
    console.log(`Found ${leads.length} leads with local uploads path.`);

    for (const lead of leads) {
        const localPath = path.join(__dirname, '..', lead.paymentScreenshot);
        if (fs.existsSync(localPath)) {
            const res = await cloudinary.uploader.upload(localPath, {
                folder: `skite_prime/tenants/${lead.tenantId || 'general'}/payment_screenshots`
            });
            lead.paymentScreenshot = res.secure_url;
            await lead.save();
            console.log(`Migrated lead ${lead.leadName} (${lead._id}) -> ${res.secure_url}`);
        } else {
            console.log(`File not found on disk: ${localPath}`);
        }
    }

    console.log('Finished migrating leads screenshots!');
    process.exit(0);
}

migrateLeadsScreenshots().catch(console.error);
