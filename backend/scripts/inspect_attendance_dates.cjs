const mongoose = require('mongoose');

async function inspectDates() {
  const robotriqUri = 'mongodb://Robotriq:QgjF1DCUZAJ9owAV@ac-5zmtf2v-shard-00-00.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-01.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-02.x6mep0y.mongodb.net:27017/Robotriq?ssl=true&replicaSet=atlas-p9xla4-shard-0&authSource=admin&retryWrites=true&w=majority';
  const conn = await mongoose.createConnection(robotriqUri).asPromise();
  const Attendance = conn.model('Attendance', new mongoose.Schema({}, { strict: false }));
  
  const empAtts = await Attendance.find({ role: { $ne: 'student' } }).sort({ createdAt: -1 }).lean();
  console.log('Total employee attendances in Robotriq:', empAtts.length);
  if (empAtts.length > 0) {
    console.log('Latest employee attendance: Date:', empAtts[0].date, 'CreatedAt:', empAtts[0].createdAt, 'User:', empAtts[0].userName);
    console.log('Earliest employee attendance: Date:', empAtts[empAtts.length - 1].date, 'CreatedAt:', empAtts[empAtts.length - 1].createdAt);
  }
  
  const stuAtts = await Attendance.find({ role: 'student' }).sort({ createdAt: -1 }).lean();
  console.log('Total student attendances in Robotriq:', stuAtts.length);
  if (stuAtts.length > 0) {
    console.log('Latest student attendance: Date:', stuAtts[0].date, 'CreatedAt:', stuAtts[0].createdAt, 'User:', stuAtts[0].userName);
    console.log('Earliest student attendance: Date:', stuAtts[stuAtts.length - 1].date, 'CreatedAt:', stuAtts[stuAtts.length - 1].createdAt);
  }
  
  await conn.close();
  process.exit(0);
}
inspectDates().catch(err => {
  console.error(err);
  process.exit(1);
});
