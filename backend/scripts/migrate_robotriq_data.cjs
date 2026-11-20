const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
  const robotriqUri = 'mongodb://Robotriq:QgjF1DCUZAJ9owAV@ac-5zmtf2v-shard-00-00.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-01.x6mep0y.mongodb.net:27017,ac-5zmtf2v-shard-00-02.x6mep0y.mongodb.net:27017/Robotriq?ssl=true&replicaSet=atlas-p9xla4-shard-0&authSource=admin&retryWrites=true&w=majority';
  const skiteUri = process.env.MONGO_URI;

  console.log('Connecting to Robotriq DB (READ ONLY)...');
  const robotriqConn = await mongoose.createConnection(robotriqUri).asPromise();
  console.log('Connected to Robotriq DB.');

  console.log('Connecting to Skite Prime DB...');
  const skiteConn = await mongoose.createConnection(skiteUri).asPromise();
  console.log('Connected to Skite Prime DB.');

  const targetTenantId = new mongoose.Types.ObjectId('6afd35731172da4b0de9a48e');

  // Source models (strictly read-only)
  const RobotriqUser = robotriqConn.model('User', new mongoose.Schema({}, { strict: false }));

  // Target models
  const Student = skiteConn.model('Student', require('../models/Student').schema);
  const Employee = skiteConn.model('Employee', require('../models/Employee').schema);
  const User = skiteConn.model('User', require('../models/User').schema);
  const Tenant = skiteConn.model('Tenant', require('../models/Tenant').schema);

  // 1. Verify tenant exists
  const tenant = await Tenant.findById(targetTenantId);
  if (!tenant) {
    console.error('Target Tenant not found!');
    process.exit(1);
  }
  console.log(`Target Tenant: ${tenant.companyName} (${tenant._id})`);

  // Ensure 'students' is in activeModules
  if (!tenant.activeModules.includes('students')) {
    tenant.activeModules.push('students');
    await tenant.save();
    console.log('Added students module to Robotriq tenant.');
  }

  // 2. Migrate Students (READ ONLY from Robotriq)
  const sourceStudents = await RobotriqUser.find({ role: 'student' }).lean();
  console.log(`Found ${sourceStudents.length} students in Robotriq.`);

  let studentMigratedCount = 0;
  for (const stu of sourceStudents) {
    const studentId = (stu.studentId || stu.email || '').trim();
    if (!studentId) continue;

    const fees = Number(stu.fees) || 0;
    const paidAmount = Number(stu.paidAmount) || 0;
    const pendingAmount = Math.max(0, fees - paidAmount);

    let email = (stu.email && stu.email.includes('@')) 
      ? stu.email.trim().toLowerCase() 
      : `${studentId.toLowerCase().replace(/[^a-z0-9]/g, '')}@robotriq.com`;

    const studentDoc = {
      tenantId: targetTenantId,
      studentId: studentId,
      fullName: (stu.fullName || 'Student').trim(),
      email: email,
      phone: (stu.phone || '').trim(),
      course: (stu.course || 'DELTA INDUSTRIAL AUTOMATION').trim(),
      selectedCourses: stu.course ? [stu.course.trim()] : [],
      fees: fees,
      paidAmount: paidAmount,
      pendingAmount: pendingAmount,
      orderId: (stu.orderId || '').trim(),
      address: (stu.address || '').trim(),
      dob: stu.dob || '',
      password: stu.password || '',
      collegeOrCompany: stu.collegeOrCompany || '',
      level: stu.level || 'Standard',
      preferredType: stu.preferredType || 'Offline',
      joiningDate: stu.joiningDate || stu.courseJoiningDate || '',
      endingDate: stu.endingDate || stu.courseEndDate || '',
      status: (fees > 0 && paidAmount >= fees) ? 'Completed' : 'Enrolled',
      createdAt: stu.createdAt || new Date(),
      updatedAt: stu.updatedAt || new Date()
    };

    await Student.findOneAndUpdate(
      { tenantId: targetTenantId, studentId: studentId },
      { $set: studentDoc },
      { upsert: true, new: true }
    );
    studentMigratedCount++;
  }
  console.log(`Successfully migrated ${studentMigratedCount} students to Skite Prime!`);

  // 3. Migrate Employees (READ ONLY from Robotriq)
  const sourceEmployees = await RobotriqUser.find({ 
    role: { $in: ['employee', 'manager', 'sales', 'Employee', 'Manager', 'Sales'] } 
  }).lean();
  console.log(`Found ${sourceEmployees.length} employees/staff in Robotriq.`);

  let employeeMigratedCount = 0;
  for (const emp of sourceEmployees) {
    const empId = (emp.empId || emp.email || emp._id.toString()).trim();
    const fullName = (emp.fullName || 'Employee').trim();
    const parts = fullName.split(' ');
    const firstName = parts[0] || 'Employee';
    const lastName = parts.slice(1).join(' ') || '';

    let email = (emp.email && emp.email.includes('@'))
      ? emp.email.trim().toLowerCase()
      : `${empId.toLowerCase().replace(/[^a-z0-9]/g, '')}@robotriq.com`;

    const role = (emp.role || 'employee').toLowerCase();
    const mappedRole = role === 'manager' ? 'Manager' : (role === 'sales' ? 'Sales' : 'Employee');

    // Upsert User login account
    const userDoc = {
      tenantId: targetTenantId,
      name: fullName,
      email: email,
      password: emp.password || '$2b$10$ZZ9qO453MmXsm.SL34dE0eAFpf/YBYHRR/Ch9OEWQn78kbHsW0w.S',
      role: mappedRole,
      activeModules: ['dashboard', 'hr', 'sales', 'calendar'],
      isActive: true
    };

    let user = await User.findOne({ email: email });
    if (!user) {
      user = await User.create(userDoc);
    } else {
      user.tenantId = targetTenantId;
      user.name = fullName;
      user.role = mappedRole;
      await user.save();
    }

    // Upsert Employee profile
    const empDoc = {
      tenantId: targetTenantId,
      userId: user._id,
      employeeId: empId,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: emp.phone || '',
      dob: emp.dob || '',
      designation: emp.designation || (mappedRole === 'Manager' ? 'Manager' : 'Staff'),
      role: mappedRole,
      perDaySalary: Number(emp.salary) || 0,
      panNumber: (emp.panNumber || '').trim().toUpperCase(),
      aadharNumber: (emp.aadharNumber || '').trim(),
      bankName: (emp.bankName || '').trim(),
      accountNumber: (emp.accNumber || emp.accountNumber || '').trim(),
      ifscCode: (emp.ifscCode || '').trim().toUpperCase(),
      dateOfJoining: emp.joiningDate || emp.createdAt || new Date(),
      status: 'Active',
      shift: 'General'
    };

    await Employee.findOneAndUpdate(
      { tenantId: targetTenantId, employeeId: empId },
      { $set: empDoc },
      { upsert: true, new: true }
    );
    employeeMigratedCount++;
  }
  console.log(`Successfully migrated ${employeeMigratedCount} employees to Skite Prime!`);

  await robotriqConn.close();
  await skiteConn.close();
  console.log('Migration completed safely without any changes to Robotriq DB.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
