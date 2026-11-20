const mongoose = require('mongoose');

async function analyzeUsers() {
  try {
    const conn = await mongoose.createConnection('mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM?retryWrites=true&w=majority').asPromise();
    const users = await conn.db.collection('users').find({}).toArray();

    console.log('Total users in source CRM:', users.length);

    const admins = users.filter(u => (u.role || '').toLowerCase() === 'admin');
    const nonAdmins = users.filter(u => (u.role || '').toLowerCase() !== 'admin');

    console.log('\n--- ADMINS (Will be SKIPPED) --- (' + admins.length + ')');
    admins.forEach(a => console.log(`- ${a.name} (${a.email}) [Role: ${a.role}]`));

    console.log('\n--- EMPLOYEES TO MIGRATE --- (' + nonAdmins.length + ')');
    nonAdmins.forEach((u, i) => {
      console.log(`${i+1}. ${u.name} | ${u.email} | Role: ${u.role || 'employee'} | Desig: ${u.designation || 'N/A'} | Status: ${u.isActive !== false ? 'Active' : 'Inactive'} | PAN: ${u.panNumber || 'N/A'} | Bank: ${u.bankDetails?.bankName || 'N/A'}`);
    });

    await conn.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

analyzeUsers();
