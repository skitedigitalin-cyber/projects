const mongoose = require('mongoose');

async function inspect() {
  const robotriqUri = 'mongodb://Robotriq:QgjF1DCUZAJ9owAV@ac-5zmtf2v-shard-00-00.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-01.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-02.x6mep0y.mongodb.net:27017/Robotriq?ssl=true&replicaSet=atlas-p9xla4-shard-0&authSource=admin&retryWrites=true&w=majority';
  
  const conn = await mongoose.createConnection(robotriqUri).asPromise();
  console.log('Connected to Robotriq DB (READ-ONLY)');
  
  const User = conn.model('User', new mongoose.Schema({}, { strict: false }));
  
  const students = await User.find({ role: 'student' }).lean();
  console.log('Total students in Robotriq:', students.length);
  if (students.length > 0) {
    console.log('Sample student keys:', Object.keys(students[0]));
    console.log('Sample student:', JSON.stringify(students[0], null, 2));
  }
  
  const employees = await User.find({ role: { $ne: 'student' } }).lean();
  console.log('Total non-student users in Robotriq:', employees.length);
  const roles = {};
  employees.forEach(e => {
    roles[e.role] = (roles[e.role] || 0) + 1;
  });
  console.log('Roles breakdown:', roles);
  
  const empList = employees.filter(e => e.role === 'employee' || e.role === 'manager' || e.role === 'sales');
  if (empList.length > 0) {
    console.log('Sample employee keys:', Object.keys(empList[0]));
    console.log('Sample employee:', JSON.stringify(empList[0], null, 2));
  }
  
  await conn.close();
  process.exit(0);
}
inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
