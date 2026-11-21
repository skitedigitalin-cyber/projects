import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
    Calendar, Clock, Search, Filter, Plus, FileDown, 
    Trash2, User, BookOpen, AlertCircle, CheckCircle2, 
    X, RefreshCw, ChevronLeft, ChevronRight, GraduationCap,
    Check, CalendarClock, Loader2, Save
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function StudentAttendance() {
    const [attendanceList, setAttendanceList] = useState([]);
    const [summary, setSummary] = useState({ totalRecords: 0, presentCount: 0, absentCount: 0 });
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 12;

    // Students list for Mark Attendance modal dropdown
    const [students, setStudents] = useState([]);

    // Modal state
    const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [markFormData, setMarkFormData] = useState({
        studentId: '',
        studentCode: '',
        studentName: '',
        course: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '10:00 AM',
        checkOut: '05:00 PM',
        duration: '7h 0m',
        status: 'Present',
        workSummary: ''
    });

    useEffect(() => {
        fetchAttendance();
        fetchStudentsList();
    }, [fromDate, toDate, selectedStatus]);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/students/attendance', {
                params: {
                    search: searchTerm || undefined,
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                    status: selectedStatus !== 'All' ? selectedStatus : undefined
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setAttendanceList(res.data.records || []);
                setSummary(res.data.summary || { totalRecords: 0, presentCount: 0, absentCount: 0 });
            }
        } catch (error) {
            console.error('Error fetching student attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/students', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success && res.data.students) {
                setStudents(res.data.students);
            }
        } catch (err) {
            console.error('Error fetching students list:', err);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    // Filter by search term locally for instant typing responsiveness
    const filteredRecords = useMemo(() => {
        return attendanceList.filter(item => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
                (item.studentName || '').toLowerCase().includes(term) ||
                (item.studentCode || '').toLowerCase().includes(term) ||
                (item.course || '').toLowerCase().includes(term) ||
                (item.workSummary || '').toLowerCase().includes(term) ||
                (item.date || '').toLowerCase().includes(term)
            );
        });
    }, [attendanceList, searchTerm]);

    // Paginated records
    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
    const paginatedRecords = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredRecords.slice(start, start + PAGE_SIZE);
    }, [filteredRecords, currentPage]);

    const handleSelectStudentForMark = (studentId) => {
        const stu = students.find(s => s._id === studentId);
        if (stu) {
            setMarkFormData(prev => ({
                ...prev,
                studentId: stu._id,
                studentCode: stu.studentId,
                studentName: stu.fullName,
                course: stu.course || ''
            }));
        }
    };

    const handleMarkAttendanceSubmit = async (e) => {
        e.preventDefault();
        if (!markFormData.studentName) {
            alert('Please select or enter student name');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/students/attendance', markFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsMarkModalOpen(false);
            fetchAttendance();
        } catch (error) {
            console.error('Error saving attendance:', error);
            alert(error.response?.data?.message || 'Error saving attendance');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRecord = async (id) => {
        if (!window.confirm('Are you sure you want to delete this student attendance log?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/students/attendance/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAttendance();
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Failed to delete attendance record');
        }
    };

    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.setTextColor(13, 148, 136); // Teal
        doc.text("Robotriq Automation - Student Attendance Report", 14, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} | Total Records: ${filteredRecords.length}`, 14, 22);

        autoTable(doc, {
            head: [['Student Name', 'Student ID', 'Course', 'Date', 'In', 'Out', 'Duration', 'Status', 'Work / Lab Summary']],
            body: filteredRecords.map(item => [
                item.studentName || 'Student',
                item.studentCode || '--',
                item.course || '--',
                item.date || '--',
                item.checkIn || '--',
                item.checkOut || '--',
                item.duration || '0h 0m',
                item.status || 'Present',
                item.workSummary || '--'
            ]),
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 }
        });

        doc.save(`Student_Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const setQuickPreset = (preset) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (preset === 'TODAY') {
            setFromDate(todayStr);
            setToDate(todayStr);
        } else if (preset === 'THIS_MONTH') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            setFromDate(firstDay);
            setToDate(todayStr);
        } else if (preset === 'ALL') {
            setFromDate('');
            setToDate('');
            setSelectedStatus('All');
            setSearchTerm('');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <CalendarClock size={24} className="text-teal-600" />
                        <span>Student Attendance Logs</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Track daily punch-in, lab hours, completed section work & student presence.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={downloadPDF}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                        title="Export PDF Report"
                    >
                        <FileDown size={15} className="text-teal-600" />
                        <span>Download PDF</span>
                    </button>

                    <button 
                        type="button"
                        onClick={() => {
                            if (students.length > 0) {
                                handleSelectStudentForMark(students[0]._id);
                            }
                            setIsMarkModalOpen(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                    >
                        <Plus size={16} />
                        <span>Mark Student Attendance</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <CalendarClock size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Logs Recorded</span>
                        <h3 className="text-xl font-black text-slate-900">{filteredRecords.length}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Present Entries</span>
                        <h3 className="text-xl font-black text-emerald-600">
                            {filteredRecords.filter(r => r.status === 'Present').length}
                        </h3>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Absent Entries</span>
                        <h3 className="text-xl font-black text-rose-600">
                            {filteredRecords.filter(r => r.status === 'Absent').length}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search student name, ID, course, or work summary..." 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Date Pickers */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs">
                        <span className="text-slate-400 font-bold text-[10px] uppercase">From</span>
                        <input 
                            type="date" 
                            value={fromDate} 
                            onChange={e => setFromDate(e.target.value)}
                            className="bg-transparent font-medium text-slate-700 outline-none" 
                        />
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-400 font-bold text-[10px] uppercase">To</span>
                        <input 
                            type="date" 
                            value={toDate} 
                            onChange={e => setToDate(e.target.value)}
                            className="bg-transparent font-medium text-slate-700 outline-none" 
                        />
                    </div>

                    {/* Quick Presets */}
                    <button 
                        type="button" 
                        onClick={() => setQuickPreset('TODAY')}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                        Today
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setQuickPreset('THIS_MONTH')}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                        This Month
                    </button>
                    {(fromDate || toDate || searchTerm || selectedStatus !== 'All') && (
                        <button 
                            type="button" 
                            onClick={() => setQuickPreset('ALL')}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                            title="Reset all filters"
                        >
                            <RefreshCw size={12} />
                            <span>Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                                <th className="p-4 pl-6">Student Details</th>
                                <th className="p-4">Course</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Check-In</th>
                                <th className="p-4">Check-Out</th>
                                <th className="p-4">Duration</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 max-w-xs">Work / Lab Summary</th>
                                <th className="p-4 pr-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-400 font-medium">
                                        Loading student attendance records...
                                    </td>
                                </tr>
                            ) : paginatedRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-400 font-medium">
                                        No student attendance records found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecords.map((item) => {
                                    const isPresent = item.status === 'Present';

                                    return (
                                        <tr key={item._id} className="hover:bg-teal-50/30 transition-colors">
                                            {/* Student Details */}
                                            <td className="p-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-black text-xs flex items-center justify-center shrink-0">
                                                        {(item.studentName || 'S').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">{item.studentName}</div>
                                                        {item.studentCode && (
                                                            <div className="font-mono text-[10px] text-teal-700 font-bold">
                                                                {item.studentCode}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Course */}
                                            <td className="p-4">
                                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] truncate max-w-[200px]" title={item.course}>
                                                    {item.course || 'Automation'}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="p-4 font-mono font-bold text-slate-800">
                                                {item.date}
                                            </td>

                                            {/* Check-In */}
                                            <td className="p-4 font-mono font-bold text-emerald-700 text-[11px]">
                                                {item.checkIn || '--'}
                                            </td>

                                            {/* Check-Out */}
                                            <td className="p-4 font-mono font-bold text-indigo-700 text-[11px]">
                                                {item.checkOut || '--'}
                                            </td>

                                            {/* Duration */}
                                            <td className="p-4 font-bold text-slate-700">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono text-[11px]">
                                                    {item.duration || '0h 0m'}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="p-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    isPresent ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {item.status || 'Present'}
                                                </span>
                                            </td>

                                            {/* Work / Lab Summary */}
                                            <td className="p-4 max-w-xs">
                                                {item.workSummary ? (
                                                    <span className="text-[11px] text-slate-600 block truncate" title={item.workSummary}>
                                                        {item.workSummary}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px] italic">No summary provided</span>
                                                )}
                                            </td>

                                            {/* Action */}
                                            <td className="p-4 pr-6 text-center">
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleDeleteRecord(item._id)}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                    title="Delete log"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination footer */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                        <span>
                            Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length} records
                        </span>
                        <div className="flex items-center gap-1.5">
                            <button 
                                type="button" 
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="font-bold px-2">Page {currentPage} of {totalPages}</span>
                            <button 
                                type="button" 
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MARK STUDENT ATTENDANCE MODAL */}
            {isMarkModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-600 to-teal-700 text-white">
                            <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                                <CalendarClock size={20} />
                                <span>Log Student Attendance</span>
                            </h3>
                            <button 
                                onClick={() => setIsMarkModalOpen(false)} 
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleMarkAttendanceSubmit} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                    Select Student *
                                </label>
                                <select 
                                    required 
                                    value={markFormData.studentId} 
                                    onChange={e => handleSelectStudentForMark(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
                                >
                                    <option value="">-- Choose Student --</option>
                                    {students.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.fullName} ({s.studentId}) - {s.course}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Date *
                                    </label>
                                    <input 
                                        required 
                                        type="date" 
                                        value={markFormData.date} 
                                        onChange={e => setMarkFormData({ ...markFormData, date: e.target.value })} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Status
                                    </label>
                                    <select 
                                        value={markFormData.status} 
                                        onChange={e => setMarkFormData({ ...markFormData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-teal-500 cursor-pointer"
                                    >
                                        <option value="Present">Present</option>
                                        <option value="Absent">Absent</option>
                                        <option value="Half Day">Half Day</option>
                                        <option value="Late">Late</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Check In
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="10:00 AM" 
                                        value={markFormData.checkIn} 
                                        onChange={e => setMarkFormData({ ...markFormData, checkIn: e.target.value })} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-teal-500" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Check Out
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="05:00 PM" 
                                        value={markFormData.checkOut} 
                                        onChange={e => setMarkFormData({ ...markFormData, checkOut: e.target.value })} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-teal-500" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Duration
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="7h 0m" 
                                        value={markFormData.duration} 
                                        onChange={e => setMarkFormData({ ...markFormData, duration: e.target.value })} 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-teal-500" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                    Work / Lab Summary (Topics Practiced)
                                </label>
                                <textarea 
                                    rows="3" 
                                    value={markFormData.workSummary} 
                                    onChange={e => setMarkFormData({ ...markFormData, workSummary: e.target.value })} 
                                    placeholder="e.g. PLC Ladder logic programming, ABB DCS simulator practice, wiring..." 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-teal-500" 
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsMarkModalOpen(false)} 
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="px-5 py-2 bg-[#111111] hover:bg-[#303030] text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                    <span>{saving ? 'Saving...' : 'Save Attendance Log'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
