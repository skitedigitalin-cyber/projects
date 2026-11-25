const express = require('express');
const router = express.Router();
const { getHRDashboardStats, getHRWorkspace } = require('../controllers/hrDashboardController');
const { getEmployees, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController');
const { getTodayStatus, checkIn, checkOut, startBreak, endBreak, getAllAttendance, getMyAttendanceRecords, deleteAttendance, bulkDeleteAttendance } = require('../controllers/attendanceController');
const { getAllLeaves, updateLeaveStatus, applyLeave, getMyLeaves } = require('../controllers/leaveController');
const { createTask, getAllTasks, getMyTasks, updateTaskStatus } = require('../controllers/taskController');
const { getPayroll, updateEmployeeSalary, getMyPayroll } = require('../controllers/payrollController');
const { applyPermission, getMyPermissions, getAllPermissions, updatePermissionStatus, deletePermission } = require('../controllers/permissionController');
const auth = require('../middleware/authMiddleware');
const { tenantId: robotriqTenantId, requireRobotriqRole } = require('../middleware/robotriqStaff');

const robotriqAdmin = requireRobotriqRole('Admin');
const robotriqStaff = requireRobotriqRole('Admin', 'Employee', 'Manager', 'Sales');
const requireAdminForRobotriq = (req, res, next) => req.user.tenantId === robotriqTenantId ? robotriqAdmin(req, res, next) : next();
const requireStaffForRobotriq = (req, res, next) => req.user.tenantId === robotriqTenantId ? robotriqStaff(req, res, next) : next();

router.use(auth);

// Dashboard Route
router.get('/dashboard', getHRDashboardStats);
router.get('/workspace', getHRWorkspace);

// Employee routes
router.route('/employees').get(getEmployees).post(createEmployee);
router.route('/employees/:id').put(updateEmployee).delete(deleteEmployee);

// Attendance routes
router.get('/attendance', requireAdminForRobotriq, getAllAttendance);
router.get('/attendance/my-records', requireStaffForRobotriq, getMyAttendanceRecords);
router.get('/attendance/today', requireStaffForRobotriq, getTodayStatus);
router.post('/attendance/check-in', requireStaffForRobotriq, checkIn);
router.post('/attendance/check-out', requireStaffForRobotriq, checkOut);
router.post('/attendance/break-start', requireStaffForRobotriq, startBreak);
router.post('/attendance/break-end', requireStaffForRobotriq, endBreak);
router.delete('/attendance/:id', requireAdminForRobotriq, deleteAttendance);
router.post('/attendance/bulk-delete', requireAdminForRobotriq, bulkDeleteAttendance);

// Leave routes (HR)
router.get('/leaves', getAllLeaves);
router.put('/leaves/:id/status', updateLeaveStatus);
// Leave routes (Employee)
router.post('/leaves/apply', applyLeave);
router.get('/leaves/my-leaves', getMyLeaves);

// Permission routes (HR & Employee)
router.get('/permissions', getAllPermissions); // HR
router.put('/permissions/:id/status', updatePermissionStatus); // HR
router.delete('/permissions/:id', deletePermission); // HR
router.post('/permissions/apply', applyPermission); // Employee
router.get('/permissions/my-permissions', getMyPermissions); // Employee

// Task routes (HR)
router.post('/tasks', requireAdminForRobotriq, createTask);
router.get('/tasks', requireAdminForRobotriq, getAllTasks);
// Task routes (Employee)
router.get('/tasks/my-tasks', requireStaffForRobotriq, getMyTasks);
router.put('/tasks/:id/status', requireStaffForRobotriq, updateTaskStatus);

// Payroll routes (HR & Employee)
router.get('/payroll', getPayroll);
router.get('/payroll/my-payroll', getMyPayroll);
router.put('/payroll/salary/:employeeId', updateEmployeeSalary);

module.exports = router;
