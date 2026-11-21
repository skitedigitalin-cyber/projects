import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    GraduationCap, Plus, Search, Filter, IndianRupee, CheckCircle, 
    Clock, AlertCircle, Edit, Trash2, X, Phone, Mail, MapPin, 
    Calendar, Building, BookOpen, CreditCard, ChevronDown, Check, User,
    Camera, Upload, Hash, Lock, Award, Loader2, Save
} from 'lucide-react';

const COURSE_OPTIONS = [
    "ABB PROCESS AUTOMATION", 
    "INDUSTRIAL AUTOMATION 4.0", 
    "ALLEN BRADLEY – ROCKWELL AUTOMATION", 
    "SCHNEIDER ELECTRIC INDUSTRIAL AUTOMATION", 
    "SIEMENS INDUSTRIAL AUTOMATION", 
    "DELTA INDUSTRIAL AUTOMATION", 
    "MITSUBISHI ELECTRIC FACTORY AUTOMATION"
];

const LEVEL_LIMITS = {
    "Beginner": 1,
    "Intermediate": 2,
    "Advance": 3,
    "Master": 4,
    "Certified Process Automation": COURSE_OPTIONS.length
};

export default function StudentManagement() {
    const [students, setStudents] = useState([]);
    const [summary, setSummary] = useState({ totalStudents: 0, totalFees: 0, totalPaid: 0, totalPending: 0 });
    const [courses, setCourses] = useState(COURSE_OPTIONS);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [saving, setSaving] = useState(false);

    // Photo input & dropdown ref
    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [photoPreview, setPhotoPreview] = useState('');

    // Form state matching Robotriq AddStudent
    const [formData, setFormData] = useState({
        studentId: '',
        orderId: '',
        fullName: '',
        password: '',
        email: '',
        phone: '',
        dob: '',
        address: '',
        level: 'Beginner',
        selectedCourses: [],
        course: '',
        collegeOrCompany: '',
        preferredType: 'Offline',
        joiningDate: '',
        endingDate: '',
        fees: '',
        paidAmount: '',
        photo: '',
        status: 'Enrolled'
    });

    // Payment Form State
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    useEffect(() => {
        fetchStudents();
    }, [searchTerm, selectedCourse, selectedStatus]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowCourseDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/students', {
                params: {
                    search: searchTerm || undefined,
                    course: selectedCourse !== 'All' ? selectedCourse : undefined,
                    status: selectedStatus !== 'All' ? selectedStatus : undefined
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setStudents(res.data.students || []);
                setSummary(res.data.summary || { totalStudents: 0, totalFees: 0, totalPaid: 0, totalPending: 0 });
                if (res.data.courses && res.data.courses.length > 0) {
                    const combined = Array.from(new Set([...COURSE_OPTIONS, ...res.data.courses]));
                    setCourses(combined);
                }
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setFormData({
            studentId: '',
            orderId: '',
            fullName: '',
            password: '',
            email: '',
            phone: '',
            dob: '',
            address: '',
            level: 'Beginner',
            selectedCourses: [],
            course: '',
            collegeOrCompany: '',
            preferredType: 'Offline',
            joiningDate: new Date().toISOString().split('T')[0],
            endingDate: '',
            fees: '',
            paidAmount: '',
            photo: '',
            status: 'Enrolled'
        });
        setPhotoPreview('');
        setShowCourseDropdown(false);
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (student) => {
        setSelectedStudent(student);
        const selCourses = Array.isArray(student.selectedCourses) && student.selectedCourses.length > 0
            ? student.selectedCourses
            : (student.course ? student.course.split(',').map(s => s.trim()).filter(Boolean) : []);

        setFormData({
            studentId: student.studentId || '',
            orderId: student.orderId || '',
            fullName: student.fullName || '',
            password: '', // Leave blank unless updating
            email: student.email || '',
            phone: student.phone || '',
            dob: student.dob || '',
            address: student.address || '',
            level: student.level || 'Beginner',
            selectedCourses: selCourses,
            course: student.course || '',
            collegeOrCompany: student.collegeOrCompany || '',
            preferredType: student.preferredType || 'Offline',
            joiningDate: student.joiningDate || '',
            endingDate: student.endingDate || '',
            fees: student.fees !== undefined ? student.fees : '',
            paidAmount: student.paidAmount !== undefined ? student.paidAmount : '',
            photo: student.photo || '',
            status: student.status || 'Enrolled'
        });
        setPhotoPreview(student.photo || '');
        setShowCourseDropdown(false);
        setIsEditModalOpen(true);
    };

    const handleLevelChange = (newLevel) => {
        if (newLevel === 'Certified Process Automation') {
            setFormData(prev => ({
                ...prev,
                level: newLevel,
                selectedCourses: [...COURSE_OPTIONS],
                course: COURSE_OPTIONS.join(', ')
            }));
            setShowCourseDropdown(false);
        } else {
            setFormData(prev => ({
                ...prev,
                level: newLevel,
                selectedCourses: [],
                course: ''
            }));
        }
    };

    const toggleCourse = (courseName) => {
        if (!formData.level) {
            alert('Please select a Training Level first!');
            return;
        }
        if (formData.level === 'Certified Process Automation') {
            return; // locked
        }

        const limit = LEVEL_LIMITS[formData.level] || 1;
        const isSelected = formData.selectedCourses.includes(courseName);

        let updated = [];
        if (isSelected) {
            updated = formData.selectedCourses.filter(c => c !== courseName);
        } else {
            if (formData.selectedCourses.length >= limit) {
                if (limit === 1) {
                    updated = [courseName];
                } else {
                    alert(`You can only select up to ${limit} course(s) for ${formData.level} level!`);
                    return;
                }
            } else {
                updated = [...formData.selectedCourses, courseName];
            }
        }

        setFormData(prev => ({
            ...prev,
            selectedCourses: updated,
            course: updated.join(', ')
        }));
    };

    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            alert('Photo size must be less than 3MB!');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            setPhotoPreview(base64);
            setFormData(prev => ({ ...prev, photo: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleOpenPayment = (student) => {
        setSelectedStudent(student);
        setPaymentAmount('');
        setPaymentNotes('');
        setIsPaymentModalOpen(true);
    };

    const handleSaveStudent = async (e) => {
        e.preventDefault();
        if (!formData.fullName.trim()) {
            alert('Please enter student full name');
            return;
        }
        if (!formData.studentId.trim()) {
            alert('Please enter student ID');
            return;
        }
        if (!formData.orderId.trim()) {
            alert('Please enter order / registration ID');
            return;
        }
        if (isAddModalOpen && !formData.password.trim()) {
            alert('Please create a password for the student account');
            return;
        }
        if (formData.selectedCourses.length === 0 && !formData.course.trim()) {
            alert('Please select at least one course');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                course: formData.course || formData.selectedCourses.join(', ')
            };

            if (isEditModalOpen && selectedStudent) {
                if (!payload.password) delete payload.password;
                await axios.put(`http://localhost:5000/api/students/${selectedStudent._id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/students', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            fetchStudents();
        } catch (error) {
            console.error('Error saving student:', error);
            alert(error.response?.data?.message || 'Error saving student');
        } finally {
            setSaving(false);
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        const amt = parseFloat(paymentAmount);
        if (!amt || amt <= 0) {
            alert('Please enter a valid payment amount');
            return;
        }
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const newPaid = (selectedStudent.paidAmount || 0) + amt;
            await axios.put(`http://localhost:5000/api/students/${selectedStudent._id}`, {
                paidAmount: newPaid
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsPaymentModalOpen(false);
            fetchStudents();
        } catch (error) {
            console.error('Error recording payment:', error);
            alert(error.response?.data?.message || 'Error recording payment');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm('Are you sure you want to remove this student record?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/students/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchStudents();
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    };

    const calculatedPending = Math.max(0, (Number(formData.fees) || 0) - (Number(formData.paidAmount) || 0));

    return (
        <div className="student-directory space-y-6">
            {/* Page Header */}
            <div className="student-directory-top flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-2xl font-black text-[#111111] tracking-tight flex items-center gap-2.5">
                        <GraduationCap size={28} className="text-teal-600" />
                        <span>Directory &amp; admissions</span>
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Robotriq Student Admissions, Course Tracking, Fee Collections & Balance Sheets.
                    </p>
                </div>

                <button 
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer self-start sm:self-auto"
                >
                    <Plus size={16} />
                    <span>Add Student</span>
                </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="student-directory-kpis grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
                        <h3 className="text-2xl font-black text-[#111111]">{summary.totalStudents}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center shrink-0">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Course Fees</span>
                        <h3 className="text-2xl font-black text-[#111111]">₹{summary.totalFees.toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Fees Collected</span>
                        <h3 className="text-2xl font-black text-emerald-600">₹{summary.totalPaid.toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Clock size={24} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Fees Pending</span>
                        <h3 className="text-2xl font-black text-rose-600">₹{summary.totalPending.toLocaleString('en-IN')}</h3>
                    </div>
                </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="student-directory-filters flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        aria-label="Search students" placeholder="Search student ID, name, mobile, or order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Course Filter */}
                    <div className="relative">
                        <select
                            aria-label="Filter by course" value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="px-3 py-2 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer max-w-xs truncate"
                        >
                            <option value="All">All Courses ({courses.length})</option>
                            {courses.map((c, i) => (
                                <option key={i} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center bg-[#f0f0ee] p-1 rounded-xl">
                        {['All', 'Enrolled', 'Completed'].map(s => (
                            <button
                                key={s}
                                onClick={() => setSelectedStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    selectedStatus === s ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-500 hover:text-[#111111]'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="student-directory-table overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[#f5f5f3]/80 border-b border-[#e6e6e3] text-[11px] font-black uppercase text-slate-500 tracking-wider">
                                <th className="p-4 pl-6">Student</th>
                                <th className="p-4">Contact & Location</th>
                                <th className="p-4">Course Enrolled</th>
                                <th className="p-4">Total Fees</th>
                                <th className="p-4">Paid Amount</th>
                                <th className="p-4">Pending Balance</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 pr-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                                        Loading student records...
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                                        No students found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                students.map((stu) => {
                                    const fees = Number(stu.fees) || 0;
                                    const paid = Number(stu.paidAmount) || 0;
                                    const pending = Number(stu.pendingAmount) || Math.max(0, fees - paid);
                                    const isPaidFull = pending === 0 && fees > 0;

                                    return (
                                        <tr key={stu._id} className="hover:bg-teal-50/30 transition-colors">
                                            {/* Student Details with Photo */}
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#f0f0ee] border-2 border-teal-500 flex items-center justify-center overflow-hidden shrink-0">
                                                        {stu.photo ? (
                                                            <img src={stu.photo} alt={stu.fullName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-black text-teal-700 text-sm">
                                                                {(stu.fullName || 'S').charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[#111111] text-sm">{stu.fullName}</div>
                                                        <div className="font-mono text-[11px] text-teal-700 font-bold">
                                                            {stu.studentId}
                                                            {stu.orderId && (
                                                                <span className="text-slate-400 ml-1.5 font-normal">
                                                                    (Ord #{stu.orderId})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact & Location */}
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    {stu.phone && (
                                                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5 font-medium">
                                                            <Phone size={12} className="text-slate-400 shrink-0" />
                                                            <span>{stu.phone}</span>
                                                        </div>
                                                    )}
                                                    {stu.email && (
                                                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                                            <Mail size={12} className="text-slate-400 shrink-0" />
                                                            <span className="truncate max-w-[180px]">{stu.email}</span>
                                                        </div>
                                                    )}
                                                    {stu.address && (
                                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
                                                            <MapPin size={10} className="shrink-0" />
                                                            <span>{stu.address}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Course */}
                                            <td className="p-4 max-w-xs">
                                                <span className="inline-block px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold text-[11px] leading-snug border border-teal-100">
                                                    {stu.course}
                                                </span>
                                                {stu.level && (
                                                    <span className="block text-[10px] text-slate-400 font-semibold mt-1">
                                                        Level: {stu.level} • {stu.preferredType || 'Offline'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Total Fees */}
                                            <td className="p-4 font-black text-[#111111] text-sm">
                                                ₹{fees.toLocaleString('en-IN')}
                                            </td>

                                            {/* Paid Amount */}
                                            <td className="p-4 text-emerald-600 font-bold text-sm">
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                                                    <span>₹{paid.toLocaleString('en-IN')}</span>
                                                </div>
                                            </td>

                                            {/* Pending Balance */}
                                            <td className="p-4 font-bold text-sm">
                                                {pending > 0 ? (
                                                    <span className="text-rose-600 flex items-center gap-1 font-mono font-black">
                                                        <Clock size={15} className="text-rose-500 shrink-0" />
                                                        ₹{pending.toLocaleString('en-IN')}
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-700 text-xs font-bold px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                                                        Fully Cleared
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    isPaidFull 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : 'bg-teal-100 text-teal-800'
                                                }`}>
                                                    {stu.status || (isPaidFull ? 'Completed' : 'Enrolled')}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 pr-6 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {pending > 0 && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleOpenPayment(stu)}
                                                            className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                            title="Record Fee Payment"
                                                        >
                                                            <CreditCard size={15} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleOpenEdit(stu)}
                                                        className="p-1.5 rounded-lg border border-[#e6e6e3] text-slate-600 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
                                                        title="Edit Student"
                                                    >
                                                        <Edit size={15} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleDeleteStudent(stu._id)}
                                                        className="p-1.5 rounded-lg border border-[#e6e6e3] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="Delete Student"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT STUDENT MODAL (Mirrors Robotriq AddStudent) */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
                    <div className="bg-[#111111] text-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-800 my-8">
                        {/* Header Banner */}
                        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-5 flex items-center justify-between text-white relative">
                            <div>
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                                    <GraduationCap size={22} />
                                    <span>{isEditModalOpen ? 'Edit Student Details' : 'Add Student Details'}</span>
                                </h3>
                                <p className="text-xs text-teal-100 mt-0.5 font-medium">
                                    Secure Student Admission & Photo Registration
                                </p>
                            </div>
                            <button 
                                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} 
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveStudent} className="p-6 md:p-8 space-y-6 text-xs max-h-[82vh] overflow-y-auto bg-[#111111]">
                            {/* Photo Upload Section */}
                            <div className="flex flex-col items-center justify-center pb-2">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handlePhotoSelect} 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                />
                                <div 
                                    className="w-24 h-24 rounded-full bg-[#303030] border-4 border-teal-500 flex items-center justify-center overflow-hidden cursor-pointer shadow-lg mb-3 hover:opacity-90 transition-opacity"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={36} className="text-slate-400" />
                                    )}
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Upload size={14} />
                                    <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                                </button>
                            </div>

                            {/* Section 1: Personal Information */}
                            <div>
                                <div className="text-center border-b border-slate-800 leading-[0.1em] my-4">
                                    <span className="bg-[#111111] px-3 text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                                        Personal Information
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <User size={12} className="text-teal-400" /> Full Name *
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={formData.fullName} 
                                            onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                                            placeholder="John Doe" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white font-medium outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <GraduationCap size={12} className="text-teal-400" /> Student ID *
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={formData.studentId} 
                                            onChange={e => setFormData({ ...formData, studentId: e.target.value })} 
                                            placeholder="RQ/26/014" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl font-mono text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Hash size={12} className="text-teal-400" /> Order ID *
                                        </label>
                                        <input 
                                            required 
                                            type="text" 
                                            value={formData.orderId} 
                                            onChange={e => setFormData({ ...formData, orderId: e.target.value })} 
                                            placeholder="ORD-1001" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl font-mono text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Lock size={12} className="text-teal-400" /> {isEditModalOpen ? 'Update Password (Optional)' : 'Create Password *'}
                                        </label>
                                        <input 
                                            type="password" 
                                            required={isAddModalOpen}
                                            value={formData.password} 
                                            onChange={e => setFormData({ ...formData, password: e.target.value })} 
                                            placeholder="••••••••" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Phone size={12} className="text-teal-400" /> Phone Number
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.phone} 
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                                            placeholder="Mobile Number" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Mail size={12} className="text-teal-400" /> Email ID
                                        </label>
                                        <input 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={e => setFormData({ ...formData, email: e.target.value })} 
                                            placeholder="Optional (auto-fills if empty)" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Calendar size={12} className="text-teal-400" /> Date of Birth
                                        </label>
                                        <input 
                                            type="date" 
                                            value={formData.dob} 
                                            onChange={e => setFormData({ ...formData, dob: e.target.value })} 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <MapPin size={12} className="text-teal-400" /> Billing Address
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.address} 
                                            onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                            placeholder="Full Address" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Academic Details */}
                            <div>
                                <div className="text-center border-b border-slate-800 leading-[0.1em] my-4">
                                    <span className="bg-[#111111] px-3 text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                                        Academic Details
                                    </span>
                                </div>

                                <div className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                                <Award size={12} className="text-teal-400" /> Training Level *
                                            </label>
                                            <select 
                                                required
                                                value={formData.level} 
                                                onChange={e => handleLevelChange(e.target.value)}
                                                className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500 cursor-pointer font-bold"
                                            >
                                                <option value="Beginner">Beginner (1 Course)</option>
                                                <option value="Intermediate">Intermediate (2 Courses)</option>
                                                <option value="Advance">Advance (3 Courses)</option>
                                                <option value="Master">Master (4 Courses)</option>
                                                <option value="Certified Process Automation">Certified Process Automation (All Courses)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                                <User size={12} className="text-teal-400" /> Training Mode
                                            </label>
                                            <select 
                                                value={formData.preferredType} 
                                                onChange={e => setFormData({ ...formData, preferredType: e.target.value })}
                                                className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500 cursor-pointer"
                                            >
                                                <option value="Offline">Offline</option>
                                                <option value="Online">Online</option>
                                                <option value="Hybrid">Hybrid</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Multi-Course Checkbox Dropdown */}
                                    <div ref={dropdownRef} className="relative">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                                                <BookOpen size={12} className="text-teal-400" /> Course Selection *
                                            </label>
                                            {formData.level && formData.level !== 'Certified Process Automation' && (
                                                <span className="text-teal-400 text-[11px] font-semibold">
                                                    (Select up to {LEVEL_LIMITS[formData.level]})
                                                </span>
                                            )}
                                        </div>

                                        <div 
                                            onClick={() => {
                                                if (formData.level !== 'Certified Process Automation') {
                                                    setShowCourseDropdown(!showCourseDropdown);
                                                }
                                            }}
                                            className={`w-full px-3.5 py-3 bg-[#303030] border border-slate-700 rounded-xl text-white flex items-center justify-between cursor-pointer hover:border-teal-500 transition-colors ${
                                                formData.level === 'Certified Process Automation' ? 'opacity-80 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            <span className={`truncate text-xs ${formData.selectedCourses.length === 0 ? 'text-slate-500' : 'text-teal-300 font-bold'}`}>
                                                {formData.selectedCourses.length > 0 
                                                    ? formData.selectedCourses.join(', ')
                                                    : '-- Click to Select Courses --'}
                                            </span>
                                            <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />
                                        </div>

                                        {showCourseDropdown && (
                                            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#303030] border border-slate-700 rounded-xl shadow-2xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-700/60">
                                                {COURSE_OPTIONS.map((c, i) => {
                                                    const isChecked = formData.selectedCourses.includes(c);
                                                    return (
                                                        <div 
                                                            key={i} 
                                                            onClick={() => toggleCourse(c)}
                                                            className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                                                                isChecked ? 'bg-teal-500/10 text-teal-300 font-bold' : 'text-slate-300'
                                                            }`}
                                                        >
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                                                isChecked ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-500'
                                                            }`}>
                                                                {isChecked && <Check size={12} strokeWidth={3} />}
                                                            </div>
                                                            <span className="text-xs">{c}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Building size={12} className="text-teal-400" /> College / University Name
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.collegeOrCompany} 
                                            onChange={e => setFormData({ ...formData, collegeOrCompany: e.target.value })} 
                                            placeholder="Institution or Company Name" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Finance & Duration */}
                            <div>
                                <div className="text-center border-b border-slate-800 leading-[0.1em] my-4">
                                    <span className="bg-[#111111] px-3 text-[11px] font-bold text-teal-400 uppercase tracking-wider">
                                        Finance & Duration
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Calendar size={12} className="text-teal-400" /> Joining Date
                                        </label>
                                        <input 
                                            type="date" 
                                            value={formData.joiningDate} 
                                            onChange={e => setFormData({ ...formData, joiningDate: e.target.value })} 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <Calendar size={12} className="text-teal-400" /> Expected End Date
                                        </label>
                                        <input 
                                            type="date" 
                                            value={formData.endingDate} 
                                            onChange={e => setFormData({ ...formData, endingDate: e.target.value })} 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-teal-400 uppercase mb-1 flex items-center gap-1.5">
                                            <IndianRupee size={12} /> Total Fees (₹) *
                                        </label>
                                        <input 
                                            required 
                                            type="number" 
                                            value={formData.fees} 
                                            onChange={e => setFormData({ ...formData, fees: e.target.value })} 
                                            placeholder="₹ 0.00" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-teal-500/80 rounded-xl font-mono text-white text-sm font-bold outline-none focus:border-teal-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                                            <CheckCircle size={12} className="text-emerald-400" /> Paid Amount (₹)
                                        </label>
                                        <input 
                                            type="number" 
                                            value={formData.paidAmount} 
                                            onChange={e => setFormData({ ...formData, paidAmount: e.target.value })} 
                                            placeholder="₹ 0.00" 
                                            className="w-full px-3.5 py-2.5 bg-[#303030] border border-slate-700 rounded-xl font-mono text-emerald-400 text-sm font-bold outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Live Pending Balance pill */}
                                <div className="mt-3 p-3 bg-[#303030]/80 rounded-xl border border-slate-700 flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold">Auto Pending Balance:</span>
                                    <span className={`font-mono font-black text-sm ${calculatedPending > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        ₹{calculatedPending.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Saving student details...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            <span>{isEditModalOpen ? 'Update Student Details' : 'Confirm & Save student details'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* RECORD FEE PAYMENT MODAL */}
            {isPaymentModalOpen && selectedStudent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#e6e6e3]">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-[#f5f5f3]/50">
                            <h3 className="text-base font-black text-[#111111] tracking-tight flex items-center gap-2">
                                <CreditCard size={20} className="text-emerald-600" />
                                <span>Record Fee Payment</span>
                            </h3>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleRecordPayment} className="p-6 space-y-4 text-xs">
                            <div className="p-3 bg-[#f5f5f3] rounded-xl border border-[#e6e6e3] space-y-1">
                                <div className="font-bold text-[#111111]">{selectedStudent.fullName}</div>
                                <div className="text-[11px] text-slate-500">ID: {selectedStudent.studentId} • Course: {selectedStudent.course}</div>
                                <div className="flex justify-between items-center text-xs pt-2 border-t border-[#e6e6e3]">
                                    <span className="text-slate-500">Current Pending:</span>
                                    <span className="font-bold text-rose-600 font-mono">₹{(selectedStudent.pendingAmount || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                    Payment Amount to Add (₹) *
                                </label>
                                <input 
                                    required 
                                    type="number" 
                                    max={selectedStudent.pendingAmount || undefined}
                                    value={paymentAmount} 
                                    onChange={e => setPaymentAmount(e.target.value)} 
                                    placeholder={`Up to ₹${selectedStudent.pendingAmount}`}
                                    className="w-full px-3 py-2.5 border border-[#e6e6e3] rounded-xl font-mono font-black text-[#111111] text-sm focus:outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Notes / Mode</label>
                                <input 
                                    type="text" 
                                    value={paymentNotes} 
                                    onChange={e => setPaymentNotes(e.target.value)} 
                                    placeholder="e.g. GPay / Cash / Installment 2" 
                                    className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsPaymentModalOpen(false)} 
                                    className="px-4 py-2 bg-[#f0f0ee] hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? 'Recording...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
