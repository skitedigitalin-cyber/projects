import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, CheckSquare, Search, Users, AlertCircle, Calendar, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TaskManagement() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination (15 tasks per page)
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/hr/tasks', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setTasks(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedEmployee, selectedStatus, startDate, endDate]);

    // Unique employees for dropdown
    const employeesList = Array.from(
        new Map(
            tasks
                .filter(t => t.employeeId && t.employeeId._id)
                .map(t => [t.employeeId._id.toString(), `${t.employeeId.firstName} ${t.employeeId.lastName || ''}`.trim()])
        ).entries()
    ).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedEmployee('all');
        setSelectedStatus('all');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    const hasActiveFilters = searchTerm || selectedEmployee !== 'all' || selectedStatus !== 'all' || startDate || endDate;

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = !searchTerm || 
            task.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            task.employeeId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.employeeId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const empId = task.employeeId?._id?.toString() || task.employeeId?.toString();
        const matchesEmployee = selectedEmployee === 'all' || empId === selectedEmployee;

        const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;

        let matchesDate = true;
        const taskDueDate = task.dueDate ? new Date(task.dueDate) : null;
        const taskCreatedDate = task.createdAt ? new Date(task.createdAt) : null;
        const compareDate = taskDueDate || taskCreatedDate;

        if (startDate && compareDate) {
            matchesDate = matchesDate && compareDate >= new Date(startDate);
        }
        if (endDate && compareDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && compareDate <= end;
        }

        return matchesSearch && matchesEmployee && matchesStatus && matchesDate;
    });

    const totalPages = Math.ceil(filteredTasks.length / PAGE_SIZE) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const paginatedTasks = filteredTasks.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading tasks...</div>;

    return (
        <div className="space-y-6">
            {/* Top Toolbar & Filters */}
            <div className="bg-white p-5 rounded-[1.75rem] border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search tasks by title, description or employee..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 transition-all font-medium text-xs text-slate-700"
                        />
                    </div>

                    {/* Action button */}
                    <button 
                        onClick={() => navigate('/hr/assign-task')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-sm hover:shadow transition-all active:scale-95 cursor-pointer text-xs"
                    >
                        <Plus size={16} className="mr-1.5" /> Assign Task
                    </button>
                </div>

                {/* Filter Controls Row matching old CRM */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
                    {/* Employee Filter */}
                    <div className="min-w-[180px]">
                        <select
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:bg-white focus:border-blue-500 transition-colors"
                        >
                            <option value="all">All Team Members ({employeesList.length})</option>
                            {employeesList.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        {['all', 'Pending', 'Completed'].map(st => (
                            <button
                                key={st}
                                onClick={() => setSelectedStatus(st)}
                                className={`px-3 py-1 rounded-lg font-bold text-xs capitalize transition-colors cursor-pointer ${
                                    selectedStatus === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {st === 'all' ? 'All' : st}
                            </button>
                        ))}
                    </div>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <Calendar size={14} className="text-slate-400 mr-2" />
                            <span className="text-[10px] font-bold text-slate-400 mr-1.5">FROM</span>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-slate-700 text-xs"
                            />
                        </div>
                        <span className="text-slate-400 font-bold">-</span>
                        <div className="flex items-center px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <Calendar size={14} className="text-slate-400 mr-2" />
                            <span className="text-[10px] font-bold text-slate-400 mr-1.5">TO</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-slate-700 text-xs"
                            />
                        </div>
                    </div>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={handleResetFilters}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold flex items-center transition-colors cursor-pointer ml-auto"
                        >
                            <RotateCcw size={13} className="mr-1.5 text-slate-400" /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Task Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-xs">
                        <CheckSquare size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-lg font-bold text-slate-900">No tasks matched your filter</p>
                        <p className="text-xs text-slate-400 mt-1">Try clearing filters or search to view more tasks.</p>
                        {hasActiveFilters && (
                            <button 
                                onClick={handleResetFilters}
                                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center text-xs"
                            >
                                <RotateCcw size={14} className="mr-1.5" /> Reset Filters
                            </button>
                        )}
                    </div>
                ) : paginatedTasks.map(task => (
                    <div key={task._id} className="bg-white border border-slate-200/90 rounded-[1.5rem] p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-3 gap-2">
                                <h3 className={`font-bold text-base ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                    {task.title}
                                </h3>
                                <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full whitespace-nowrap ${
                                    task.status === 'Completed' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                    {task.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                                {task.description || 'No additional details'}
                            </p>
                            
                            <div className="space-y-2 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                                <div className="flex items-center text-xs text-slate-600">
                                    <Users size={14} className="mr-2 text-slate-400 shrink-0" /> 
                                    <span className="text-slate-400 mr-1">Assignee:</span>
                                    <span className="font-bold text-slate-800">
                                        {task.employeeId ? `${task.employeeId.firstName} ${task.employeeId.lastName || ''}`.trim() : 'Unassigned'}
                                    </span>
                                </div>
                                <div className="flex items-center text-xs text-slate-600">
                                    <AlertCircle size={14} className={`mr-2 shrink-0 ${task.priority === 'High' ? 'text-red-500' : task.priority === 'Low' ? 'text-emerald-500' : 'text-amber-500'}`} /> 
                                    <span className="text-slate-400 mr-1">Priority:</span>
                                    <span className={`font-bold ${task.priority === 'High' ? 'text-red-600' : task.priority === 'Low' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {task.priority || 'Normal'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                            <span>Assigned: <strong className="text-slate-600 font-semibold">{formatDate(task.createdAt)}</strong></span>
                            <span>Due: <strong className="text-slate-600 font-semibold">{formatDate(task.dueDate)}</strong></span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {filteredTasks.length > PAGE_SIZE && (
                <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                    <span className="text-xs font-semibold text-slate-500">
                        Showing <strong className="text-slate-800">{(validPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-slate-800">{Math.min(validPage * PAGE_SIZE, filteredTasks.length)}</strong> of <strong className="text-slate-800">{filteredTasks.length}</strong> tasks
                    </span>
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={validPage <= 1}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <ChevronLeft size={14} /> Previous
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-600">
                            Page {validPage} of {totalPages}
                        </span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={validPage >= totalPages}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
