const Student = require('../models/Student');
const StudentAttendance = require('../models/StudentAttendance');
const StudentTask = require('../models/StudentTask');

// @desc    Get all students for tenant with summary
// @route   GET /api/students
exports.getStudents = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { search, course, status } = req.query;

        let query = { tenantId };

        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { fullName: regex },
                { studentId: regex },
                { course: regex },
                { email: regex },
                { phone: regex },
                { orderId: regex }
            ];
        }

        if (course && course !== 'All') {
            query.course = course;
        }

        if (status && status !== 'All') {
            query.status = status;
        }

        const students = await Student.find(query).sort({ createdAt: -1 });

        // Calculate summary metrics across all students of this tenant
        const allStudents = await Student.find({ tenantId });
        const summary = allStudents.reduce((acc, s) => {
            acc.totalStudents += 1;
            acc.totalFees += Number(s.fees) || 0;
            acc.totalPaid += Number(s.paidAmount) || 0;
            acc.totalPending += Number(s.pendingAmount) || 0;
            return acc;
        }, { totalStudents: 0, totalFees: 0, totalPaid: 0, totalPending: 0 });

        // Extract unique courses for filtering dropdown
        const courses = [...new Set(allStudents.map(s => s.course).filter(Boolean))];

        res.json({
            success: true,
            count: students.length,
            summary,
            courses,
            students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Server error fetching students', error: error.message });
    }
};

// @desc    Get single student by ID
// @route   GET /api/students/:id
exports.getStudentById = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const student = await Student.findOne({ _id: req.params.id, tenantId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student', error: error.message });
    }
};

// @desc    Create new student
// @route   POST /api/students
exports.createStudent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const {
            studentId,
            fullName,
            email,
            password,
            dob,
            photo,
            selectedCourses,
            phone,
            course,
            fees,
            paidAmount,
            orderId,
            address,
            collegeOrCompany,
            level,
            preferredType,
            joiningDate,
            endingDate,
            status
        } = req.body;

        if (!fullName || (!course && (!selectedCourses || selectedCourses.length === 0))) {
            return res.status(400).json({ message: 'Student name and course are required' });
        }

        // Auto-generate student ID if not provided
        let generatedStudentId = (studentId || '').trim();
        if (!generatedStudentId) {
            const count = await Student.countDocuments({ tenantId });
            generatedStudentId = `RQ/STU/${String(count + 1).padStart(3, '0')}`;
        }

        const resolvedCourse = course || (Array.isArray(selectedCourses) ? selectedCourses.join(', ') : '');
        const totalFees = parseFloat(fees) || 0;
        const totalPaid = parseFloat(paidAmount) || 0;
        const pendingAmount = Math.max(0, totalFees - totalPaid);

        const newStudent = new Student({
            tenantId,
            studentId: generatedStudentId,
            fullName,
            email: email || `${generatedStudentId.toLowerCase().replace(/[^a-z0-9]/g, '')}@robotriq.com`,
            password: password || '',
            dob: dob || '',
            photo: photo || '',
            selectedCourses: Array.isArray(selectedCourses) ? selectedCourses : (course ? [course] : []),
            phone: phone || '',
            course: resolvedCourse,
            fees: totalFees,
            paidAmount: totalPaid,
            pendingAmount,
            orderId: orderId || '',
            address: address || '',
            collegeOrCompany: collegeOrCompany || '',
            level: level || 'Beginner',
            preferredType: preferredType || 'Offline',
            joiningDate: joiningDate || '',
            endingDate: endingDate || '',
            status: status || (pendingAmount === 0 && totalPaid > 0 ? 'Completed' : 'Enrolled')
        });

        await newStudent.save();
        res.status(201).json({ success: true, message: 'Student created successfully', student: newStudent });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ message: 'Error creating student', error: error.message });
    }
};

// @desc    Update student details / payments
// @route   PUT /api/students/:id
exports.updateStudent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updateData = { ...req.body };

        if (updateData.fees !== undefined || updateData.paidAmount !== undefined) {
            const fees = updateData.fees !== undefined ? parseFloat(updateData.fees) : undefined;
            const paid = updateData.paidAmount !== undefined ? parseFloat(updateData.paidAmount) : undefined;

            const existing = await Student.findOne({ _id: req.params.id, tenantId });
            if (!existing) {
                return res.status(404).json({ message: 'Student not found' });
            }

            const currentFees = fees !== undefined ? fees : existing.fees;
            const currentPaid = paid !== undefined ? paid : existing.paidAmount;
            updateData.pendingAmount = Math.max(0, currentFees - currentPaid);
        }

        const updatedStudent = await Student.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            updateData,
            { new: true }
        );

        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json({ success: true, message: 'Student updated successfully', student: updatedStudent });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ message: 'Error updating student', error: error.message });
    }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const deleted = await Student.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!deleted) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ message: 'Error deleting student', error: error.message });
    }
};

// @desc    Get all student attendances
// @route   GET /api/students/attendance
exports.getStudentAttendances = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { search, fromDate, toDate, status } = req.query;

        let query = { tenantId };

        if (status && status !== 'All') {
            query.status = status;
        }

        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { studentName: regex },
                { studentCode: regex },
                { course: regex },
                { workSummary: regex }
            ];
        }

        let records = await StudentAttendance.find(query).sort({ dateObj: -1, createdAt: -1 });

        // Date range filtering
        if (fromDate || toDate) {
            const start = fromDate ? new Date(fromDate) : null;
            const end = toDate ? new Date(toDate) : null;
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);

            records = records.filter(r => {
                let d = r.dateObj;
                if (!d && r.date) {
                    if (r.date.includes('/')) {
                        const parts = r.date.split('/');
                        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    } else {
                        d = new Date(r.date);
                    }
                }
                if (!d || isNaN(d.getTime())) return true;
                return (!start || d >= start) && (!end || d <= end);
            });
        }

        const totalRecords = records.length;
        const presentCount = records.filter(r => r.status === 'Present').length;
        const absentCount = records.filter(r => r.status === 'Absent').length;

        res.json({
            success: true,
            records,
            summary: {
                totalRecords,
                presentCount,
                absentCount
            }
        });
    } catch (error) {
        console.error('Error fetching student attendances:', error);
        res.status(500).json({ message: 'Error fetching student attendances', error: error.message });
    }
};

// @desc    Mark student attendance
// @route   POST /api/students/attendance
exports.markStudentAttendance = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const {
            studentId,
            studentCode,
            studentName,
            course,
            date,
            checkIn,
            checkOut,
            duration,
            status,
            workSummary
        } = req.body;

        if (!studentName || !date) {
            return res.status(400).json({ message: 'Student name and date are required' });
        }

        let dateObj = new Date();
        if (date) {
            if (date.includes('/')) {
                const parts = date.split('/');
                dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
                dateObj = new Date(date);
            }
        }

        const attendance = new StudentAttendance({
            tenantId,
            studentId: studentId || undefined,
            studentCode: studentCode || '',
            studentName,
            course: course || '',
            date: date || new Date().toLocaleDateString('en-GB'),
            dateObj,
            checkIn: checkIn || '--',
            checkOut: checkOut || '--',
            duration: duration || '0h 0m',
            status: status || 'Present',
            workSummary: workSummary || ''
        });

        await attendance.save();
        res.status(201).json({ success: true, message: 'Student attendance logged successfully', attendance });
    } catch (error) {
        console.error('Error logging student attendance:', error);
        res.status(500).json({ message: 'Error logging student attendance', error: error.message });
    }
};

// @desc    Delete student attendance
// @route   DELETE /api/students/attendance/:id
exports.deleteStudentAttendance = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const deleted = await StudentAttendance.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!deleted) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }
        res.json({ success: true, message: 'Attendance record deleted successfully' });
    } catch (error) {
        console.error('Error deleting student attendance:', error);
        res.status(500).json({ message: 'Error deleting student attendance', error: error.message });
    }
};

// ==========================================
// STUDENT TASKS CONTROLLER METHODS
// ==========================================

// @desc    Get all student tasks for tenant
// @route   GET /api/students/tasks
exports.getStudentTasks = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { search, status, priority, studentId } = req.query;

        let query = { tenantId };

        if (status && status !== 'All') {
            query.status = status;
        }

        if (priority && priority !== 'All') {
            query.priority = priority;
        }

        if (studentId && studentId !== 'All') {
            query.studentId = studentId;
        }

        let tasks = await StudentTask.find(query)
            .populate('studentId', 'fullName studentId course email phone photo level')
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });

        if (search) {
            const regex = new RegExp(search, 'i');
            tasks = tasks.filter(t => {
                const titleMatch = t.title && regex.test(t.title);
                const descMatch = t.description && regex.test(t.description);
                const studNameMatch = t.studentId?.fullName && regex.test(t.studentId.fullName);
                const studIdMatch = t.studentId?.studentId && regex.test(t.studentId.studentId);
                const courseMatch = t.studentId?.course && regex.test(t.studentId.course);
                return titleMatch || descMatch || studNameMatch || studIdMatch || courseMatch;
            });
        }

        // Summary metrics across all tasks of this tenant
        const allTasks = await StudentTask.find({ tenantId });
        const todayStr = new Date().toISOString().split('T')[0];
        const summary = allTasks.reduce((acc, t) => {
            acc.totalTasks += 1;
            if (t.status === 'Pending') acc.pendingTasks += 1;
            else if (t.status === 'In Progress') acc.inProgressTasks += 1;
            else if (t.status === 'Completed') acc.completedTasks += 1;

            if (t.dueDate && t.dueDate < todayStr && t.status !== 'Completed') {
                acc.overdueTasks += 1;
            }
            return acc;
        }, { totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0, overdueTasks: 0 });

        res.json({
            success: true,
            count: tasks.length,
            summary,
            tasks
        });
    } catch (error) {
        console.error('Error fetching student tasks:', error);
        res.status(500).json({ message: 'Error fetching student tasks', error: error.message });
    }
};

// @desc    Create / Assign a new student task
// @route   POST /api/students/tasks
exports.createStudentTask = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { studentId, title, description, dueDate, priority, status } = req.body;

        if (!studentId || !title) {
            return res.status(400).json({ message: 'Student and Task Title are required' });
        }

        const student = await Student.findOne({ _id: studentId, tenantId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const task = new StudentTask({
            tenantId,
            studentId,
            assignedBy: req.user?.userId,
            title,
            description: description || '',
            dueDate: dueDate || '',
            priority: priority || 'Medium',
            status: status || 'Pending'
        });

        await task.save();
        await task.populate('studentId', 'fullName studentId course email phone photo level');

        res.status(201).json({
            success: true,
            message: 'Task assigned to student successfully',
            task
        });
    } catch (error) {
        console.error('Error assigning student task:', error);
        res.status(500).json({ message: 'Error assigning student task', error: error.message });
    }
};

// @desc    Update a student task
// @route   PUT /api/students/tasks/:id
exports.updateStudentTask = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const updateData = { ...req.body };

        if (updateData.status === 'Completed') {
            updateData.completedAt = new Date();
        }

        const task = await StudentTask.findOneAndUpdate(
            { _id: req.params.id, tenantId },
            updateData,
            { new: true }
        ).populate('studentId', 'fullName studentId course email phone photo level');

        if (!task) {
            return res.status(404).json({ message: 'Student task not found' });
        }

        res.json({
            success: true,
            message: 'Task updated successfully',
            task
        });
    } catch (error) {
        console.error('Error updating student task:', error);
        res.status(500).json({ message: 'Error updating student task', error: error.message });
    }
};

// @desc    Delete a student task
// @route   DELETE /api/students/tasks/:id
exports.deleteStudentTask = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const deleted = await StudentTask.findOneAndDelete({ _id: req.params.id, tenantId });
        if (!deleted) {
            return res.status(404).json({ message: 'Student task not found' });
        }
        res.json({ success: true, message: 'Student task deleted successfully' });
    } catch (error) {
        console.error('Error deleting student task:', error);
        res.status(500).json({ message: 'Error deleting student task', error: error.message });
    }
};
