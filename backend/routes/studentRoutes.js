const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/attendance', studentController.getStudentAttendances);
router.post('/attendance', studentController.markStudentAttendance);
router.delete('/attendance/:id', studentController.deleteStudentAttendance);

// Student Tasks Routes
router.get('/tasks', studentController.getStudentTasks);
router.post('/tasks', studentController.createStudentTask);
router.put('/tasks/:id', studentController.updateStudentTask);
router.delete('/tasks/:id', studentController.deleteStudentTask);

router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
