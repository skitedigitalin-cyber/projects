const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function linkUma() {
  const robotriqUri = 'mongodb://Robotriq:QgjF1DCUZAJ9owAV@ac-5zmtf2v-shard-00-00.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-01.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-02.x6mep0y.mongodb.net:27017/Robotriq?ssl=true&replicaSet=atlas-p9xla4-shard-0&authSource=admin&retryWrites=true&w=majority';
  const skiteUri = process.env.MONGO_URI;

  const rConn = await mongoose.createConnection(robotriqUri).asPromise();
  const sConn = await mongoose.createConnection(skiteUri).asPromise();

  const targetTenantId = new mongoose.Types.ObjectId('6afd35731172da4b0de9a48e');

  const RAttendance = rConn.model('Attendance', new mongoose.Schema({}, { strict: false }));
  const SEmployee = sConn.model('Employee', require('../models/Employee').schema);
  const SAttendance = sConn.model('Attendance', require('../models/Attendance').schema);

  let umaEmp = await SEmployee.findOne({ tenantId: targetTenantId, employeeId: 'RQ/EMP/UMA' });
  if (!umaEmp) {
    umaEmp = await SEmployee.create({
      tenantId: targetTenantId,
      employeeId: 'RQ/EMP/UMA',
      firstName: 'P.',
      lastName: 'Umamaheswari',
      email: 'umamaheswari@robotriq.com',
      department: 'Telecalling & Admissions',
      designation: 'Counselor',
      status: 'Inactive',
      dateOfJoining: new Date('2026-04-01')
    });
    console.log('Created historical employee profile for P. Umamaheswari');
  }

  const umaAtts = await RAttendance.find({ userName: 'P.Umamaheswari ' }).lean();
  console.log('Uma attendances to link:', umaAtts.length);

  for (const att of umaAtts) {
    let dateObj = new Date();
    if (att.date && att.date.includes('/')) {
      const parts = att.date.split('/');
      dateObj = new Date(parts[2] + '-' + parts[1] + '-' + parts[0] + 'T00:00:00Z');
    }
    
    await SAttendance.findOneAndUpdate(
      { tenantId: targetTenantId, employeeId: umaEmp._id, date: dateObj },
      { 
        $set: {
          tenantId: targetTenantId,
          employeeId: umaEmp._id,
          date: dateObj,
          checkInTime: att.createdAt ? new Date(att.createdAt) : dateObj,
          status: 'Present',
          notes: att.workSummary || ''
        }
      },
      { upsert: true }
    );
  }

  const totalAtt = await SAttendance.countDocuments({ tenantId: targetTenantId });
  console.log('Total Employee Attendances in Skite Prime now:', totalAtt);

  await rConn.close();
  await sConn.close();
  process.exit(0);
}

linkUma().catch(console.error);
