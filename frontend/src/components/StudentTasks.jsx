import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    CheckSquare, Plus, Search, Filter, Clock, AlertCircle, 
    CheckCircle2, Trash2, Eye, Pencil, User, BookOpen, 
    Calendar, ChevronDown, Check, X, Loader2, Save,
    Award, ArrowUpDown, RefreshCw, AlertTriangle
} from 'lucide-react';

export default function StudentTasks() {
    const [tasks, setTasks] = useState([]);
    const [summary, setSummary] = useState({ 
        totalTasks: 0, 
        pendingTasks: 0, 
        inProgressTasks: 0, 
        completedTasks: 0, 
        overdueTasks: 0 
    });
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedPriority, setSelectedPriority] = useState('All');
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('All');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        studentId: '',
        title: '',
        description: '',
        dueDate: '',
        priority: 'Medium',
        status: 'Pending'
    });

    useEffect(() => {
        fetchTasks();
        fetchStudentsList();
    }, [selectedStatus, selectedPriority, selectedStudentFilter]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/students/tasks', {
                params: {
                    status: selectedStatus !== 'All' ? selectedStatus : undefined,
                    priority: selectedPriority !== 'All' ? selectedPriority : undefined,
                    studentId: selectedStudentFilter !== 'All' ? selectedStudentFilter : undefined
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                setTasks(res.data.tasks || []);
                if (res.data.summary) {
                    setSummary(res.data.summary);
                }
            }
        } catch (error) {
            console.error('Error fetching student tasks:', error);
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
            if (res.data && res.data.students) {
                setStudents(res.data.students);
            }
        } catch (error) {
            console.error('Error fetching students list:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const openAddModal = () => {
        const today = new Date();
        today.setDate(today.getDate() + 7); // Default 7 days from now
        const defaultDue = today.toISOString().split('T')[0];

        setFormData({
            studentId: students.length > 0 ? students[0]._id : '',
            title: '',
            description: '',
            dueDate: defaultDue,
            priority: 'Medium',
            status: 'Pending'
        });
        setIsAddModalOpen(true);
    };

    const openEditModal = (task) => {
        setSelectedTask(task);
        setFormData({
            studentId: task.studentId?._id || task.studentId || '',
            title: task.title || '',
            description: task.description || '',
            dueDate: task.dueDate || '',
            priority: task.priority || 'Medium',
            status: task.status || 'Pending'
        });
        setIsEditModalOpen(true);
    };

    const openViewModal = (task) => {
        setSelectedTask(task);
        setIsViewModalOpen(true);
    };

    const openDeleteModal = (task) => {
        setSelectedTask(task);
        setIsDeleteModalOpen(true);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!formData.studentId || !formData.title.trim()) {
            alert('Please select a student and enter a task title.');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/students/tasks', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                setIsAddModalOpen(false);
                fetchTasks();
            }
        } catch (error) {
            console.error('Error creating task:', error);
            alert(error.response?.data?.message || 'Failed to assign task');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTask = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            alert('Task title is required.');
            return;
        }

        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5000/api/students/tasks/${selectedTask._id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                setIsEditModalOpen(false);
                fetchTasks();
            }
        } catch (error) {
            console.error('Error updating task:', error);
            alert(error.response?.data?.message || 'Failed to update task');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/students/tasks/${selectedTask._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsDeleteModalOpen(false);
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        } finally {
            setSaving(false);
        }
    };

    const handleQuickStatusChange = async (task, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/students/tasks/${task._id}`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Client-side search filtering
    const filteredTasks = useMemo(() => {
        if (!searchTerm.trim()) return tasks;
        const term = searchTerm.toLowerCase();
        return tasks.filter(t => {
            const titleMatch = (t.title || '').toLowerCase().includes(term);
            const descMatch = (t.description || '').toLowerCase().includes(term);
            const nameMatch = (t.studentId?.fullName || '').toLowerCase().includes(term);
            const idMatch = (t.studentId?.studentId || '').toLowerCase().includes(term);
            const courseMatch = (t.studentId?.course || '').toLowerCase().includes(term);
            return titleMatch || descMatch || nameMatch || idMatch || courseMatch;
        });
    }, [tasks, searchTerm]);

    const getDueDateStatus = (dueDate, status) => {
        if (!dueDate || status === 'Completed') return null;
        const todayStr = new Date().toISOString().split('T')[0];
        if (dueDate < todayStr) {
            return { label: 'Overdue', color: 'bg-red-50 text-red-700 border-red-200' };
        } else if (dueDate === todayStr) {
            return { label: 'Due Today', color: 'bg-amber-50 text-amber-700 border-amber-200' };
        }
        return null;
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'High':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'Low':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Completed':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'In Progress':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <CheckSquare className="text-teal-600" size={26} />
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Tasks</h2>
                        <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                            {summary.totalTasks} Tasks
                        </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-1 font-medium">
                        Assign lab projects, practical exercises, ladder logic tasks and track student completion.
                    </p>
                </div>

                <button 
                    onClick={openAddModal}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                    <Plus size={16} />
                    <span>Assign New Task</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                        <CheckSquare size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
                        <span className="text-2xl font-black text-slate-900">{summary.totalTasks}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                        <Clock size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
                        <span className="text-2xl font-black text-amber-600">{summary.pendingTasks}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Loader2 size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
                        <span className="text-2xl font-black text-blue-600">{summary.inProgressTasks}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                        <span className="text-2xl font-black text-emerald-600">{summary.completedTasks}</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search task, student, ID, course..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Student Filter */}
                    <select 
                        value={selectedStudentFilter} 
                        onChange={(e) => setSelectedStudentFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer"
                    >
                        <option value="All">All Students ({students.length})</option>
                        {students.map(s => (
                            <option key={s._id} value={s._id}>{s.fullName} ({s.studentId})</option>
                        ))}
                    </select>

                    {/* Priority Filter */}
                    <select 
                        value={selectedPriority} 
                        onChange={(e) => setSelectedPriority(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-teal-500 cursor-pointer"
                    >
                        <option value="All">All Priorities</option>
                        <option value="High">High Priority</option>
                        <option value="Medium">Medium Priority</option>
                        <option value="Low">Low Priority</option>
                    </select>

                    {/* Status Tabs */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        {['All', 'Pending', 'In Progress', 'Completed'].map(st => (
                            <button
                                key={st}
                                onClick={() => setSelectedStatus(st)}
                                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                    selectedStatus === st ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tasks Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <Loader2 size={32} className="animate-spin text-teal-600" />
                        <span className="text-xs font-bold">Loading student tasks...</span>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                            <CheckSquare size={32} />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">No Student Tasks Found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mb-5">
                            {searchTerm || selectedStatus !== 'All' 
                                ? 'No tasks matched your search or filter criteria.' 
                                : 'No coursework tasks have been assigned yet. Assign exercises and lab work directly to students.'}
                        </p>
                        <button 
                            onClick={openAddModal}
                            className="px-4 py-2.5 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                            <Plus size={15} />
                            <span>Assign First Task</span>
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-5">Student</th>
                                    <th className="py-3.5 px-5">Task Details</th>
                                    <th className="py-3.5 px-5">Due Date</th>
                                    <th className="py-3.5 px-5">Priority</th>
                                    <th className="py-3.5 px-5">Status</th>
                                    <th className="py-3.5 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredTasks.map((task) => {
                                    const student = task.studentId;
                                    const dueStatus = getDueDateStatus(task.dueDate, task.status);

                                    return (
                                        <tr key={task._id} className="hover:bg-slate-50/80 transition-colors">
                                            {/* Student */}
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center text-sm shadow-2xs shrink-0">
                                                        {student?.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-[13px]">{student?.fullName || 'Unassigned'}</h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                                {student?.studentId || 'N/A'}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]" title={student?.course}>
                                                                {student?.course || 'No course'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Task Details */}
                                            <td className="py-4 px-5 max-w-xs">
                                                <p className="font-bold text-slate-800 text-[13px] line-clamp-1">{task.title}</p>
                                                {task.description && (
                                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Due Date */}
                                            <td className="py-4 px-5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    <span className="font-bold text-slate-700">
                                                        {task.dueDate || 'No due date'}
                                                    </span>
                                                </div>
                                                {dueStatus && (
                                                    <span className={`inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${dueStatus.color}`}>
                                                        {dueStatus.label}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Priority */}
                                            <td className="py-4 px-5 whitespace-nowrap">
                                                <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${getPriorityBadge(task.priority)}`}>
                                                    {task.priority || 'Medium'}
                                                </span>
                                            </td>

                                            {/* Status / Quick Toggle */}
                                            <td className="py-4 px-5 whitespace-nowrap">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => handleQuickStatusChange(task, e.target.value)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${getStatusBadge(task.status)}`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button 
                                                        onClick={() => openViewModal(task)}
                                                        className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                                                        title="View Task Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button 
                                                        onClick={() => openEditModal(task)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Edit Task"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button 
                                                        onClick={() => openDeleteModal(task)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Task"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ======================================================== */}
            {/* ADD / ASSIGN TASK MODAL                                  */}
            {/* ======================================================== */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-up">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                                    <CheckSquare size={18} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base">Assign Task to Student</h3>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                            {/* Student Selection */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Select Student <span className="text-red-500">*</span>
                                </label>
                                <select 
                                    name="studentId" 
                                    value={formData.studentId} 
                                    onChange={handleInputChange} 
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all cursor-pointer"
                                >
                                    <option value="" disabled>-- Select Enrolled Student --</option>
                                    {students.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.fullName} ({s.studentId}) - {s.course}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Task Title */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Task Title <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={handleInputChange} 
                                    placeholder="e.g. PLC Ladder Logic Lab Exercise 2" 
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all"
                                />
                            </div>

                            {/* Task Description */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Description & Instructions
                                </label>
                                <textarea 
                                    name="description" 
                                    rows="3" 
                                    value={formData.description} 
                                    onChange={handleInputChange} 
                                    placeholder="Describe the lab exercise, required components, or project deliverables..." 
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all resize-none"
                                />
                            </div>

                            {/* Due Date & Priority */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                        Due Date
                                    </label>
                                    <input 
                                        type="date" 
                                        name="dueDate" 
                                        value={formData.dueDate} 
                                        onChange={handleInputChange} 
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                        Priority
                                    </label>
                                    <select 
                                        name="priority" 
                                        value={formData.priority} 
                                        onChange={handleInputChange} 
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all cursor-pointer"
                                    >
                                        <option value="High">High Priority</option>
                                        <option value="Medium">Medium Priority</option>
                                        <option value="Low">Low Priority</option>
                                    </select>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-[#111111] hover:bg-[#303030] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                >
                                    {saving && <Loader2 size={14} className="animate-spin" />}
                                    <span>{saving ? 'Assigning...' : 'Assign Task'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* EDIT TASK MODAL                                          */}
            {/* ======================================================== */}
            {isEditModalOpen && selectedTask && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-up">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                    <Pencil size={18} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base">Edit Student Task</h3>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Task Title <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={handleInputChange} 
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                    Description & Instructions
                                </label>
                                <textarea 
                                    name="description" 
                                    rows="3" 
                                    value={formData.description} 
                                    onChange={handleInputChange} 
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                        Due Date
                                    </label>
                                    <input 
                                        type="date" 
                                        name="dueDate" 
                                        value={formData.dueDate} 
                                        onChange={handleInputChange} 
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                        Priority
                                    </label>
                                    <select 
                                        name="priority" 
                                        value={formData.priority} 
                                        onChange={handleInputChange} 
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all cursor-pointer"
                                    >
                                        <option value="High">High</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Low">Low</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
                                        Status
                                    </label>
                                    <select 
                                        name="status" 
                                        value={formData.status} 
                                        onChange={handleInputChange} 
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-teal-500 transition-all cursor-pointer"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-[#111111] hover:bg-[#303030] text-white text-xs font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                >
                                    {saving && <Loader2 size={14} className="animate-spin" />}
                                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* VIEW TASK MODAL                                          */}
            {/* ======================================================== */}
            {isViewModalOpen && selectedTask && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-fade-up">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                                    <Eye size={18} />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base">Task Details</h3>
                            </div>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Student Info Card */}
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center text-sm">
                                    {selectedTask.studentId?.fullName ? selectedTask.studentId.fullName.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 text-sm">{selectedTask.studentId?.fullName}</h4>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        ID: <span className="font-mono font-bold text-slate-700">{selectedTask.studentId?.studentId}</span> • {selectedTask.studentId?.course}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Task Title</span>
                                <p className="text-base font-bold text-slate-900">{selectedTask.title}</p>
                            </div>

                            {selectedTask.description && (
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
                                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                                        {selectedTask.description}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3 pt-2">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Due Date</span>
                                    <span className="text-xs font-bold text-slate-800">{selectedTask.dueDate || 'N/A'}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Priority</span>
                                    <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border mt-0.5 ${getPriorityBadge(selectedTask.priority)}`}>
                                        {selectedTask.priority}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                                    <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border mt-0.5 ${getStatusBadge(selectedTask.status)}`}>
                                        {selectedTask.status}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => setIsViewModalOpen(false)}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* DELETE TASK MODAL                                        */}
            {/* ======================================================== */}
            {isDeleteModalOpen && selectedTask && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-fade-up">
                        <div className="p-6 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">Delete Student Task?</h3>
                            <p className="text-xs text-slate-500">
                                Are you sure you want to delete <strong className="text-slate-700">"{selectedTask.title}"</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 p-4 bg-slate-50 border-t border-slate-100">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteTask}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                <span>{saving ? 'Deleting...' : 'Delete'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
