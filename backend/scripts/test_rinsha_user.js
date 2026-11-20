const mongoose = require('mongoose');
const axios = require('axios');

async function testRinshaLogin() {
  await mongoose.connect('mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm');
  const db = mongoose.connection.db;

  const rinshaUser = await db.collection('users').findOne({ email: /rinsha/i });
  console.log('Rinsha user in target DB:', {
    _id: rinshaUser?._id,
    name: rinshaUser?.name,
    email: rinshaUser?.email,
    role: rinshaUser?.role
  });

  const rinshaEmp = await db.collection('employees').findOne({ email: /rinsha/i });
  console.log('Rinsha employee:', {
    _id: rinshaEmp?._id,
    firstName: rinshaEmp?.firstName,
    userId: rinshaEmp?.userId,
    status: rinshaEmp?.status
  });

  // What happened if Rinsha calls /api/hr/attendance/today-status?
  // Let's test with employee's token!
  // To get employee's token, let's login with employee email or generate token if we know the secret
  await mongoose.disconnect();
}

testRinshaLogin().catch(console.error);
