const mongoose = require('mongoose');

async function inspectCRM() {
  try {
    const conn = await mongoose.createConnection('mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM?retryWrites=true&w=majority').asPromise();
    console.log('Connected to CRM database on source cluster!');

    const collections = await conn.db.listCollections().toArray();
    console.log('Found ' + collections.length + ' collections.');
    for (const c of collections) {
      const count = await conn.db.collection(c.name).countDocuments();
      console.log('Collection: ' + c.name + ' (' + count + ' docs)');
    }

    // Inspect sample documents from 'users'
    if (collections.some(c => c.name === 'users')) {
      const users = await conn.db.collection('users').find({}).toArray();
      console.log('\n--- ALL USERS IN SOURCE CRM --- (Total: ' + users.length + ')');
      for (const u of users) {
        console.log(JSON.stringify(u, null, 2));
      }
    }

    // Inspect if there is an 'employees' collection as well
    if (collections.some(c => c.name === 'employees')) {
      const emps = await conn.db.collection('employees').find({}).toArray();
      console.log('\n--- ALL EMPLOYEES IN SOURCE CRM --- (Total: ' + emps.length + ')');
      for (const e of emps) {
        console.log(JSON.stringify(e, null, 2));
      }
    }

    await conn.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspectCRM();
