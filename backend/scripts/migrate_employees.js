const mongoose = require('mongoose');
require('dotenv').config();

const SOURCE_URI = 'mongodb+srv://admin:admin123@cluster0.jnb1iha.mongodb.net/CRM?retryWrites=true&w=majority';
const TARGET_URI = process.env.MONGO_URI;

// Schemas
const User = require('../models/User');
const Employee = require('../models/Employee');
const Tenant = require('../models/Tenant');

function mapRoleAndDept(user) {
  const roleRaw = (user.role || '').toLowerCase();
  const desigRaw = (user.designation || '').toLowerCase();

  let role = 'Employee';
  let dept = 'General';
  let activeModules = ['dashboard', 'calendar', 'projects', 'hr'];

  if (roleRaw === 'sales' || desigRaw.includes('sales')) {
    role = 'Sales';
    dept = 'Sales & Business Development';
    activeModules = ['sales', 'dashboard', 'calendar'];
  } else if (roleRaw === 'accountant' || desigRaw.includes('account')) {
    role = 'Finance';
    dept = 'Finance & Accounts';
    activeModules = ['finance', 'dashboard', 'calendar'];
  } else if (roleRaw === 'manager' || desigRaw.includes('manager') || desigRaw.includes('team lead')) {
    role = 'Manager';
    dept = 'Operations & Management';
    activeModules = ['dashboard', 'calendar', 'sales', 'finance', 'hr', 'projects'];
  } else if (roleRaw === 'officer' || desigRaw.includes('officer')) {
    role = 'HR';
    dept = 'Human Resources & Admin';
    activeModules = ['hr', 'dashboard', 'calendar'];
  } else if (desigRaw.includes('seo')) {
    role = 'SEO Analyst';
    dept = 'Digital Marketing & SEO';
    activeModules = ['dashboard', 'calendar', 'projects'];
  } else if (desigRaw.includes('content') || desigRaw.includes('script') || desigRaw.includes('writter') || desigRaw.includes('writer')) {
    role = 'Content Writer';
    dept = 'Content Creation & Copywriting';
    activeModules = ['dashboard', 'calendar', 'projects'];
  } else if (desigRaw.includes('video') || desigRaw.includes('editor')) {
    role = 'Video Editor';
    dept = 'Media & Video Production';
    activeModules = ['dashboard', 'calendar', 'projects'];
  } else if (desigRaw.includes('web') || desigRaw.includes('developer')) {
    role = 'Web Developer';
    dept = 'Web & Tech Development';
    activeModules = ['dashboard', 'calendar', 'projects'];
  } else if (desigRaw.includes('design') || desigRaw.includes('graphic') || desigRaw.includes('ui')) {
    role = 'Designer';
    dept = 'Creative & UI Design';
    activeModules = ['dashboard', 'calendar', 'projects'];
  }

  return { role, dept, activeModules };
}

async function migrate() {
  console.log('========================================================');
  console.log('🚀 STARTING SAFE MIGRATION: EMPLOYEES FROM SOURCE CRM');
  console.log('========================================================');

  // 1. Connect to Source
  console.log('Connecting to Source MongoDB Atlas (cluster0)...');
  const sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();
  console.log('Connected to Source CRM Database!');

  // 2. Connect to Target
  console.log('Connecting to Target MongoDB Atlas (skitecrm)...');
  await mongoose.connect(TARGET_URI);
  console.log('Connected to Target Database!');

  // 3. Find Tenant
  let tenant = await Tenant.findOne({ companyName: 'Skite Digital Agency' });
  if (!tenant) {
    tenant = await Tenant.findOne({});
  }
  if (!tenant) {
    throw new Error('Tenant not found in target database!');
  }
  console.log(`Target Tenant: "${tenant.companyName || 'Skite Digital Agency'}" (${tenant._id})`);

  // Ensure tenant has maxEmployees set high
  tenant.maxEmployees = 9999;
  tenant.status = 'active';
  await tenant.save();

  // 4. Fetch Users from Source CRM
  const sourceUsers = await sourceConn.db.collection('users').find({}).toArray();
  console.log(`Found ${sourceUsers.length} total user records in Source CRM.`);

  // Filter out Admins
  const employeesToMigrate = sourceUsers.filter(u => (u.role || '').toLowerCase() !== 'admin');
  const adminsSkipped = sourceUsers.filter(u => (u.role || '').toLowerCase() === 'admin');

  console.log(`Filtered out ${adminsSkipped.length} Admin users (SKIPPED).`);
  console.log(`Prepared ${employeesToMigrate.length} Employee records to inject.`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < employeesToMigrate.length; i++) {
    const src = employeesToMigrate[i];
    const email = (src.email || '').trim().toLowerCase();
    const rawName = (src.name || '').trim();

    if (!email) {
      console.log(`⚠️ Skipping record index ${i}: No email address.`);
      skippedCount++;
      continue;
    }

    // Name splitting
    const nameParts = rawName.split(/\s+/);
    const firstName = nameParts[0] || 'Employee';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Generate unique employee ID: SKT-001, SKT-002, etc.
    const employeeId = 'SKT-' + String(i + 1).padStart(3, '0');

    // Role & Dept mapping
    const { role, dept, activeModules } = mapRoleAndDept(src);

    const isActive = src.isActive !== false;
    const status = isActive ? 'Active' : 'Inactive';

    // Parse joining date
    let dateOfJoining = new Date('2025-10-01');
    if (src.joiningDate) {
      const parsed = new Date(src.joiningDate);
      if (!isNaN(parsed.getTime())) dateOfJoining = parsed;
    } else if (src.createdAt) {
      const parsed = new Date(src.createdAt);
      if (!isNaN(parsed.getTime())) dateOfJoining = parsed;
    }

    const perDaySalary = Number(src.salaryPerDay) || 0;
    const panNumber = src.panNumber ? src.panNumber.trim().toUpperCase() : '';
    const aadharNumber = src.aadharNumber ? src.aadharNumber.trim() : '';
    const bankName = src.bankDetails?.bankName ? src.bankDetails.bankName.trim() : '';
    const accountNumber = src.bankDetails?.accountNumber ? src.bankDetails.accountNumber.trim() : '';
    const ifscCode = src.bankDetails?.ifscCode ? src.bankDetails.ifscCode.trim().toUpperCase() : '';

    // 1. Find or Create User
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        tenantId: tenant._id,
        name: rawName,
        email: email,
        password: src.password, // Retains existing bcrypt password hash!
        role: role,
        activeModules: activeModules,
        isActive: isActive
      });
      await user.save();
    } else {
      user.name = rawName;
      user.role = role;
      user.activeModules = activeModules;
      user.isActive = isActive;
      user.password = src.password;
      await user.save();
    }

    // 2. Find or Create Employee Profile
    let employee = await Employee.findOne({ email });
    if (!employee) {
      employee = new Employee({
        tenantId: tenant._id,
        userId: user._id,
        employeeId: employeeId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: src.phone || '',
        department: dept,
        designation: src.designation || 'Staff',
        role: role,
        shift: 'General',
        workLocation: 'Office',
        employmentType: 'Full-Time',
        dateOfJoining: dateOfJoining,
        salaryBasic: 0,
        perDaySalary: perDaySalary,
        panNumber: panNumber,
        aadharNumber: aadharNumber,
        bankName: bankName,
        accountNumber: accountNumber,
        ifscCode: ifscCode,
        status: status
      });
      await employee.save();
      createdCount++;
      console.log(`✅ [${i + 1}/${employeesToMigrate.length}] ADDED: ${employeeId} - ${rawName} (${role}) | Dept: ${dept} | Status: ${status}`);
    } else {
      employee.tenantId = tenant._id;
      employee.userId = user._id;
      employee.employeeId = employeeId;
      employee.firstName = firstName;
      employee.lastName = lastName;
      employee.department = dept;
      employee.designation = src.designation || 'Staff';
      employee.role = role;
      employee.dateOfJoining = dateOfJoining;
      employee.perDaySalary = perDaySalary;
      employee.panNumber = panNumber;
      employee.aadharNumber = aadharNumber;
      employee.bankName = bankName;
      employee.accountNumber = accountNumber;
      employee.ifscCode = ifscCode;
      employee.status = status;
      await employee.save();
      updatedCount++;
      console.log(`🔄 [${i + 1}/${employeesToMigrate.length}] UPDATED: ${employeeId} - ${rawName} (${role})`);
    }
  }

  console.log('\n========================================================');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log(`- Total Employees Processed: ${employeesToMigrate.length}`);
  console.log(`- New Employees Created: ${createdCount}`);
  console.log(`- Existing Employees Updated: ${updatedCount}`);
  console.log(`- Admins Skipped: ${adminsSkipped.length}`);
  console.log('========================================================');

  await sourceConn.close();
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
