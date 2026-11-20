const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { cloudinary } = require('../utils/cloudinary');
const Tenant = require('../models/Tenant');

// Extract base64 strings from robotriqImages.js
const robotriqImagesPath = path.join(__dirname, '../../frontend/src/assets/robotriqImages.js');
const fileContent = fs.readFileSync(robotriqImagesPath, 'utf8');

function extractBase64(varName) {
    const regex = new RegExp(`export const ${varName} = ['"]([^'"]+)['"]`);
    const match = fileContent.match(regex);
    return match ? match[1] : null;
}

const topImageBase64 = extractBase64('topImage');
const bottomImageBase64 = extractBase64('bottomImage');
const sealImageBase64 = extractBase64('sealImage');
const signImageBase64 = extractBase64('signImage');

// Save physical PNG files to frontend/public/letterhead/
const letterheadDir = path.join(__dirname, '../../frontend/public/letterhead');
if (!fs.existsSync(letterheadDir)) {
    fs.mkdirSync(letterheadDir, { recursive: true });
}

function saveBase64ToFile(base64Data, filename) {
    if (!base64Data) return;
    const base64Image = base64Data.split(';base64,').pop();
    const filePath = path.join(letterheadDir, filename);
    fs.writeFileSync(filePath, base64Image, { encoding: 'base64' });
    console.log(`Saved physical file: ${filePath}`);
}

saveBase64ToFile(topImageBase64, 'robotriq_header.png');
saveBase64ToFile(bottomImageBase64, 'robotriq_footer.png');
saveBase64ToFile(sealImageBase64, 'robotriq_seal.png');
saveBase64ToFile(signImageBase64, 'robotriq_sign.png');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/skite_prime_db');
    console.log('Connected to MongoDB');

    const tenant = await Tenant.findOne({ 
        $or: [
            { _id: '6afd35731172da4b0de9a48e' },
            { subDomain: 'robotriq' }
        ]
    });

    if (!tenant) {
        console.error('Robotriq tenant not found in MongoDB!');
        process.exit(1);
    }

    console.log(`Found Robotriq tenant: ${tenant._id} (${tenant.companyName})`);
    console.log('Uploading letterhead assets to Cloudinary...');

    const folder = `skite_prime/tenants/${tenant._id}/quotations`;

    let headerUrl = tenant.quotationHeaderImage;
    if (topImageBase64 && (!headerUrl || !headerUrl.includes('cloudinary'))) {
        const res = await cloudinary.uploader.upload(topImageBase64, { folder });
        headerUrl = res.secure_url;
        console.log('Uploaded Header to Cloudinary:', headerUrl);
    }

    let footerUrl = tenant.quotationFooterImage;
    if (bottomImageBase64 && (!footerUrl || !footerUrl.includes('cloudinary'))) {
        const res = await cloudinary.uploader.upload(bottomImageBase64, { folder });
        footerUrl = res.secure_url;
        console.log('Uploaded Footer to Cloudinary:', footerUrl);
    }

    let sealUrl = tenant.quotationSeal;
    if (sealImageBase64 && (!sealUrl || !sealUrl.includes('cloudinary'))) {
        const res = await cloudinary.uploader.upload(sealImageBase64, { folder });
        sealUrl = res.secure_url;
        console.log('Uploaded Seal to Cloudinary:', sealUrl);
    }

    let signUrl = tenant.quotationSign;
    if (signImageBase64 && (!signUrl || !signUrl.includes('cloudinary'))) {
        const res = await cloudinary.uploader.upload(signImageBase64, { folder });
        signUrl = res.secure_url;
        console.log('Uploaded Sign to Cloudinary:', signUrl);
    }

    tenant.quotationHeaderImage = headerUrl;
    tenant.quotationFooterImage = footerUrl;
    tenant.quotationSeal = sealUrl;
    tenant.quotationSign = signUrl;

    if (!tenant.quotationBankDetails || Object.keys(tenant.quotationBankDetails).length === 0) {
        tenant.quotationBankDetails = {
            bankName: 'ACC NAME : ROBOTRIQ AUTOMATION PRIVATE LIMITED',
            branch: 'BRANCH : UNION BANK,SUNDHARAPURAM,COIMBATORE.',
            bobAc: 'ACC NO : 252511010000242',
            ifsc: 'IFSC CODE : UBIN0825255',
            sigThanks: 'Thanking you,',
            sigFor: 'For ROBOTRIQ AUTOMATION PRIVATE LIMITED',
            sigName: 'Authorised Signatory'
        };
    }

    await tenant.save();
    console.log('Successfully saved Cloudinary URLs to Robotriq Tenant in MongoDB:');
    console.log({
        quotationHeaderImage: tenant.quotationHeaderImage,
        quotationFooterImage: tenant.quotationFooterImage,
        quotationSeal: tenant.quotationSeal,
        quotationSign: tenant.quotationSign
    });

    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
