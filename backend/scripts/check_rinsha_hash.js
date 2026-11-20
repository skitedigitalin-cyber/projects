const mongoose = require('mongoose');

async function checkHash() {
  await mongoose.connect('mongodb+srv://skitedigitalin_db_user:Sxc9tiVk6ZpH8ljY@skitecrm.y65c2mh.mongodb.net/skitecrm');
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'rinshaskite@gmail.com' });
  console.log('Target DB password hash:', user?.password);
  await mongoose.disconnect();

  await mongoose.connect('mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM');
  const oldUser = await mongoose.connection.db.collection('users').findOne({ email: 'rinshaskite@gmail.com' });
  console.log('Old DB password hash:', oldUser?.password);
  await mongoose.disconnect();
}

checkHash().catch(console.error);
