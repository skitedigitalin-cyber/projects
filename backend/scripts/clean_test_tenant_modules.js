const mongoose = require('../node_modules/mongoose');
require('../node_modules/dotenv').config({ path: 'backend/.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const Tenant = require('../models/Tenant');
    const User = require('../models/User');

    await Tenant.updateOne({ _id: '6af80382cd05a7684be1c190' }, { $pull: { activeModules: 'projects' } });
    await User.updateOne({ email: 'sasi@gmail.com' }, { $pull: { activeModules: 'projects' } });

    const tenant = await Tenant.findById('6af80382cd05a7684be1c190');
    console.log('Updated minepower activeModules:', tenant.activeModules);
    process.exit(0);
}

run().catch(console.error);
