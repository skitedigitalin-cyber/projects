const mongoose = require('mongoose');

async function checkUser() {
  // Target DB
  await mongoose.connect('mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm');
  const dbTarget = mongoose.connection.db;

  const empByUserId = await dbTarget.collection('employees').findOne({ userId: new mongoose.Types.ObjectId('6af29c0a7f15581e0bb12c9c') });
  console.log('Employee in Target DB by userId 6af29c0a7f15581e0bb12c9c:', empByUserId);

  const userTarget = await dbTarget.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6af29c0a7f15581e0bb12c9c') });
  console.log('User in Target DB:', userTarget);

  await mongoose.disconnect();

  // Old DB
  await mongoose.connect('mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM');
  const dbOld = mongoose.connection.db;

  const userOld = await dbOld.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6af29c0a7f15581e0bb12c9c') });
  console.log('User in Old DB:', userOld);

  await mongoose.disconnect();
}

checkUser().catch(console.error);
