import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Search, CalendarDays, ChevronLeft, ChevronRight, 
    Trash2, AlertTriangle, X, CheckSquare, Square, 
    RefreshCw, Filter, CheckCircle2, Clock, Check, Users,
    FileSignature, Hourglass
} from 'lucide-react';

export default function AttendanceManagement() {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Sub-tab state: 'attendance' (Daily Logs) | 'permissions' (Permission Requests)
    const [activeSubTab, setActiveSubTab] = useState('attendance');

    // Permissions State
    const [permissions, setPermissions] = useState([]);
    const [permLoading, setPermLoading] = useState(false);
    const [permSearchTerm, setPermSearchTerm] = useState('');
    const [permStatusFilter, setPermStatusFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected'
    const [permUpdatingId, setPermUpdatingId] = useState(null);
    const [permDeleteModal, setPermDeleteModal] = useState({ isOpen: false, perm: null });
    const [permCurrentPage, setPermCurrentPage] = useState(1);
    const PERM_PAGE_SIZE = 10;

    // Selection states for Bulk Delete
    const [selectedIds, setSelectedIds] = useState([]);

    // Delete Confirmation Modal state
    // type: 'single' | 'selected' | 'filtered'
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        type: '',
        targetId: null,
        targetName: '',
        targetDate: '',
        count: 0
    });
    const [isDeleting, setIsDeleting] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    // Pagination (15 records per page)
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            let url = `http://localhost:5000/api/hr/attendance?`;
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;
            
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setAttendanceRecords(Array.isArray(res.data) ? res.data : []);
            setSelectedIds([]); // clear selection after fetch
        } catch (error) {
            console.error("Error fetching attendance records", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            setPermLoading(true);
            let url = `http://localhost:5000/api/hr/permissions?`;
            if (permStatusFilter && permStatusFilter !== 'all') url += `status=${permStatusFilter}&`;
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;
            
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setPermissions(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching permission requests:", error);
        } finally {
            setPermLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
        fetchPermissions();
    }, [startDate, endDate]);

    useEffect(() => {
        fetchPermissions();
    }, [permStatusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, startDate, endDate]);

    const handleUpdatePermissionStatus = async (id, status, comments = '') => {
        try {
            setPermUpdatingId(id);
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5000/api/hr/permissions/${id}/status`, {
                status,
                managerComments: comments || (status === 'Approved' ? 'Approved by Admin / HR' : 'Rejected by Admin / HR')
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showFeedback(res.data?.message || `Permission request ${status.toLowerCase()} successfully!`);
            await fetchPermissions();
        } catch (error) {
            console.error("Error updating permission status:", error);
            alert(error.response?.data?.message || "Failed to update permission status");
        } finally {
            setPermUpdatingId(null);
        }
    };

    const handleDeletePermission = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/hr/permissions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showFeedback("Permission request deleted successfully");
            setPermDeleteModal({ isOpen: false, perm: null });
            await fetchPermissions();
        } catch (error) {
            console.error("Error deleting permission:", error);
            alert(error.response?.data?.message || "Failed to delete permission");
        }
    };

    // Quick Date Presets
    const setQuickDatePreset = (type) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (type === 'TODAY') {
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (type === 'YESTERDAY') {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const yestStr = yest.toISOString().split('T')[0];
            setStartDate(yestStr);
            setEndDate(yestStr);
        } else if (type === 'THIS_MONTH') {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            setStartDate(firstOfMonth);
            setEndDate(todayStr);
        } else if (type === 'ALL') {
            setStartDate('');
            setEndDate('');
        }
    };

    // Filter by search term
    const filteredRecords = useMemo(() => {
        return attendanceRecords.filter(record => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            const fullName = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.toLowerCase();
            const empId = (record.employee?.employeeId || '').toLowerCase();
            const dept = (record.employee?.department || '').toLowerCase();
            const notes = (record.attendance?.notes || '').toLowerCase();
            const status = (record.attendance?.status || '').toLowerCase();
            return fullName.includes(term) || empId.includes(term) || dept.includes(term) || notes.includes(term) || status.includes(term);
        });
    }, [attendanceRecords, searchTerm]);

    // List of actual attendance record IDs that are deletable in filtered set
    const deletableFilteredIds = useMemo(() => {
        return filteredRecords
            .map(r => r.attendance?._id)
            .filter(Boolean);
    }, [filteredRecords]);

    // Permissions Metrics & Filtered List
    const pendingPermissionsCount = useMemo(() => {
        return permissions.filter(p => p.status === 'Pending').length;
    }, [permissions]);

    const approvedPermissionsCount = useMemo(() => {
        return permissions.filter(p => p.status === 'Approved').length;
    }, [permissions]);

    const rejectedPermissionsCount = useMemo(() => {
        return permissions.filter(p => p.status === 'Rejected').length;
    }, [permissions]);

    const filteredPermissions = useMemo(() => {
        return permissions.filter(perm => {
            // Status Filter
            if (permStatusFilter !== 'all' && perm.status !== permStatusFilter) {
                return false;
            }

            // Date Filters
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                const pDate = new Date(perm.date);
                pDate.setHours(0, 0, 0, 0);
                if (pDate < sDate) return false;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                const pDate = new Date(perm.date);
                if (pDate > eDate) return false;
            }

            // Search Term
            if (!permSearchTerm) return true;
            const term = permSearchTerm.toLowerCase();
            const fullName = `${perm.employeeId?.firstName || ''} ${perm.employeeId?.lastName || ''}`.toLowerCase();
            const empId = (perm.employeeId?.employeeId || '').toLowerCase();
            const dept = (perm.employeeId?.department || '').toLowerCase();
            const reason = (perm.reason || '').toLowerCase();
            const type = (perm.type || '').toLowerCase();
            const status = (perm.status || '').toLowerCase();
            return fullName.includes(term) || empId.includes(term) || dept.includes(term) || reason.includes(term) || type.includes(term) || status.includes(term);
        });
    }, [permissions, permSearchTerm, permStatusFilter, startDate, endDate]);

    useEffect(() => {
        setPermCurrentPage(1);
    }, [permSearchTerm, permStatusFilter, startDate, endDate]);

    const totalPermPages = Math.ceil(filteredPermissions.length / PERM_PAGE_SIZE) || 1;
    const validPermPage = Math.min(Math.max(1, permCurrentPage), totalPermPages);
    const paginatedPermissions = filteredPermissions.slice((validPermPage - 1) * PERM_PAGE_SIZE, validPermPage * PERM_PAGE_SIZE);

    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedRecords = filteredRecords.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    // Selection handlers
    const isAllFilteredSelected = deletableFilteredIds.length > 0 && deletableFilteredIds.every(id => selectedIds.includes(id));
    
    const handleToggleSelectAll = () => {
        if (isAllFilteredSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds([...deletableFilteredIds]);
        }
    };

    const handleToggleSelectRow = (id) => {
        if (!id) return;
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Open Single Delete Modal
    const promptDeleteSingle = (record) => {
        const id = record.attendance?._id;
        if (!id) return;
        const name = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'Employee';
        const dateStr = record.attendance?.date ? formatDate(record.attendance.date) : '';
        setDeleteModal({
            isOpen: true,
            type: 'single',
            targetId: id,
            targetName: name,
            targetDate: dateStr,
            count: 1
        });
    };

    // Open Bulk Delete for Selected
    const promptDeleteSelected = () => {
        if (selectedIds.length === 0) return;
        setDeleteModal({
            isOpen: true,
            type: 'selected',
            targetId: null,
            targetName: `${selectedIds.length} Selected Records`,
            targetDate: '',
            count: selectedIds.length
        });
    };

    // Open Delete for ALL Filtered Records
    const promptDeleteFiltered = () => {
        if (deletableFilteredIds.length === 0) return;
        setDeleteModal({
            isOpen: true,
            type: 'filtered',
            targetId: null,
            targetName: `All Filtered Records (${deletableFilteredIds.length})`,
            targetDate: startDate && endDate ? `${startDate} to ${endDate}` : (startDate || endDate || 'All Filtered Dates'),
            count: deletableFilteredIds.length
        });
    };

    // Execute Delete
    const executeDelete = async () => {
        try {
            setIsDeleting(true);
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (deleteModal.type === 'single' && deleteModal.targetId) {
                await axios.delete(`http://localhost:5000/api/hr/attendance/${deleteModal.targetId}`, { headers });
                showFeedback(`Deleted attendance record for ${deleteModal.targetName}`);
            } else if (deleteModal.type === 'selected') {
                const res = await axios.post(`http://localhost:5000/api/hr/attendance/bulk-delete`, {
                    ids: selectedIds
                }, { headers });
                showFeedback(res.data?.message || `Deleted ${selectedIds.length} records`);
            } else if (deleteModal.type === 'filtered') {
                const res = await axios.post(`http://localhost:5000/api/hr/attendance/bulk-delete`, {
                    ids: deletableFilteredIds
                }, { headers });
                showFeedback(res.data?.message || `Deleted ${deletableFilteredIds.length} filtered records`);
            }

            setDeleteModal({ isOpen: false, type: '', targetId: null, targetName: '', targetDate: '', count: 0 });
            await fetchAttendance();
        } catch (error) {
            console.error("Delete failed:", error);
            alert(error.response?.data?.message || "Failed to delete attendance record(s)");
        } finally {
            setIsDeleting(false);
        }
    };

    const showFeedback = (msg) => {
        setFeedbackMsg(msg);
        setTimeout(() => setFeedbackMsg(null), 4000);
    };

    const getStatusBadge = (attendance) => {
        if (!attendance) return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">Absent</span>;
        if (attendance.status === 'Present') return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700">Present</span>;
        if (attendance.status === 'Half Day') return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">Half Day</span>;
        if (attendance.status === 'Absent') return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">Absent</span>;
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700">{attendance.status}</span>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="space-y-6 animate-fade-up">
            
            {/* Feedback notification toast */}
            {feedbackMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold animate-fade-up shadow-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>{feedbackMsg}</span>
                    </div>
                    <button onClick={() => setFeedbackMsg(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Top Sub-Tab Switcher: Daily Attendance Logs vs Permission Requests */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-100/80 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('attendance')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            activeSubTab === 'attendance'
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        <Clock size={16} className={activeSubTab === 'attendance' ? 'text-indigo-600' : 'text-slate-400'} />
                        <span>Daily Attendance Logs</span>
                        <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded-full font-mono">
                            {filteredRecords.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSubTab('permissions')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            activeSubTab === 'permissions'
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        <CalendarDays size={16} className={activeSubTab === 'permissions' ? 'text-amber-600' : 'text-slate-400'} />
                        <span>Permission Requests</span>
                        {pendingPermissionsCount > 0 ? (
                            <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-white rounded-full font-mono font-bold animate-pulse">
                                {pendingPermissionsCount} Pending
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded-full font-mono">
                                {permissions.length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 pr-2">
                    <button 
                        type="button"
                        onClick={() => { fetchAttendance(); fetchPermissions(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-all font-semibold cursor-pointer border border-transparent hover:border-slate-200"
                        title="Refresh data"
                    >
                        <RefreshCw size={14} className={loading || permLoading ? 'animate-spin text-indigo-600' : ''} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: DAILY ATTENDANCE LOGS */}
            {activeSubTab === 'attendance' && (
                <>
            {/* Top Control Bar: Search + Dates + Quick Presets + Delete Filtered */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search employee name, ID, department..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-xs text-slate-900"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Quick Date Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start lg:self-auto">
                        <button 
                            type="button"
                            onClick={() => setQuickDatePreset('TODAY')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            Today
                        </button>
                        <button 
                            type="button"
                            onClick={() => setQuickDatePreset('YESTERDAY')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            Yesterday
                        </button>
                        <button 
                            type="button"
                            onClick={() => setQuickDatePreset('THIS_MONTH')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            This Month
                        </button>
                        <button 
                            type="button"
                            onClick={() => setQuickDatePreset('ALL')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            All Time
                        </button>
                    </div>

                </div>

                {/* Second Row: FROM - TO Pickers + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                            <CalendarDays className="text-blue-600" size={14} />
                            <span className="font-bold text-slate-600">FROM:</span>
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                            />
                        </div>

                        <span className="text-slate-300 font-bold">-</span>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                            <CalendarDays className="text-blue-600" size={14} />
                            <span className="font-bold text-slate-600">TO:</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                            />
                        </div>

                        {(startDate || endDate || searchTerm) && (
                            <button
                                type="button"
                                onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
                                className="px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                                title="Reset all filters"
                            >
                                <X size={14} /> Clear Filter
                            </button>
                        )}
                    </div>

                    {/* BULK DELETE ACTIONS BUTTONS */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        {/* Delete All Filtered Button */}
                        {deletableFilteredIds.length > 0 && (
                            <button
                                type="button"
                                onClick={promptDeleteFiltered}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center gap-1.5"
                                title="Delete all records currently matching this filter"
                            >
                                <Trash2 size={14} />
                                <span>Delete All Filtered ({deletableFilteredIds.length})</span>
                            </button>
                        )}
                    </div>
                </div>

            </div>

            {/* Selected Action Strip (When rows are checked) */}
            {selectedIds.length > 0 && (
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-4 animate-fade-up shadow-md">
                    <div className="flex items-center gap-2 text-xs font-bold">
                        <CheckSquare size={16} className="text-blue-400" />
                        <span>{selectedIds.length} attendance record{selectedIds.length > 1 ? 's' : ''} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={promptDeleteSelected}
                            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
                        >
                            <Trash2 size={13} />
                            <span>Delete Selected ({selectedIds.length})</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Table Card */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-2">
                <div className="bg-slate-50/50 rounded-[1.5rem] border border-slate-100/50 overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {/* Checkbox Column */}
                                <th className="p-4 w-10 text-center">
                                    <button 
                                        type="button"
                                        onClick={handleToggleSelectAll} 
                                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                                        title={isAllFilteredSelected ? "Unselect all" : "Select all filtered"}
                                        disabled={deletableFilteredIds.length === 0}
                                    >
                                        {isAllFilteredSelected && deletableFilteredIds.length > 0 ? (
                                            <CheckSquare size={16} className="text-blue-600" />
                                        ) : (
                                            <Square size={16} />
                                        )}
                                    </button>
                                </th>
                                <th className="p-4">Employee</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Check In</th>
                                <th className="p-4">Check Out</th>
                                <th className="p-4">Work Hours</th>
                                <th className="p-4">Daily Report (Notes)</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500 font-medium">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw size={16} className="animate-spin text-blue-600" />
                                            <span>Loading attendance records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-slate-500 font-medium">
                                        No attendance records found for the selected filter.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecords.map((record, index) => {
                                    const attId = record.attendance?._id;
                                    const isSelected = attId && selectedIds.includes(attId);
                                    const empName = `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || 'Employee';

                                    return (
                                        <tr 
                                            key={attId || index} 
                                            className={`border-b border-slate-100 last:border-0 hover:bg-white transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                                        >
                                            {/* Row Checkbox */}
                                            <td className="p-4 text-center">
                                                {attId ? (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleToggleSelectRow(attId)}
                                                        className="text-slate-400 hover:text-blue-600 cursor-pointer p-1"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare size={16} className="text-blue-600" />
                                                        ) : (
                                                            <Square size={16} />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            {/* Employee info */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                                                        {record.employee?.firstName?.charAt(0) || 'E'}{record.employee?.lastName?.charAt(0) || ''}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900">{empName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">
                                                            {record.employee?.employeeId} • {record.employee?.department || 'General'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="p-4 font-bold text-slate-700 text-sm">
                                                {formatDate(record.attendance?.date)}
                                            </td>

                                            {/* Status */}
                                            <td className="p-4">
                                                {getStatusBadge(record.attendance)}
                                            </td>

                                            {/* Check In */}
                                            <td className="p-4 text-sm font-medium text-slate-600">
                                                {record.attendance?.checkInTime ? new Date(record.attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>

                                            {/* Check Out */}
                                            <td className="p-4 text-sm font-medium text-slate-600">
                                                {record.attendance?.checkOutTime ? (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span>{new Date(record.attendance.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        {new Date(record.attendance.checkOutTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) > 
                                                         new Date(record.attendance.checkInTime || record.attendance.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 rounded border border-amber-200" title="Checked out next day">
                                                                +1 Day
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </td>

                                            {/* Work Hours */}
                                            <td className="p-4 text-sm font-medium text-slate-600">
                                                {record.attendance?.totalWorkingMinutes ? `${Math.floor(record.attendance.totalWorkingMinutes / 60)}h ${record.attendance.totalWorkingMinutes % 60}m` : '-'}
                                            </td>

                                            {/* Daily Report / Notes */}
                                            <td className="p-4 text-sm text-slate-500 max-w-xs truncate" title={record.attendance?.notes}>
                                                {record.attendance?.notes || <span className="text-slate-400 italic">No report</span>}
                                            </td>

                                            {/* Action: Delete Button */}
                                            <td className="p-4 text-center">
                                                {attId ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => promptDeleteSingle(record)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 active:scale-95"
                                                        title={`Delete attendance record for ${empName}`}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300 text-xs italic">No record</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 15 RECORDS PAGINATION FOOTER */}
                {filteredRecords.length > PAGE_SIZE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-900">{(validPage - 1) * PAGE_SIZE + 1}</strong>–<strong className="text-slate-900">{Math.min(validPage * PAGE_SIZE, filteredRecords.length)}</strong> of <strong className="text-slate-900">{filteredRecords.length}</strong> records
                        </span>
                        <div className="flex items-center space-x-2">
                            <button 
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={validPage <= 1}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs font-mono">
                                {validPage} / {totalPages}
                            </span>
                            <button 
                                type="button"
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
            </>
            )}

            {/* TAB 2: PERMISSION REQUESTS */}
            {activeSubTab === 'permissions' && (
                <div className="space-y-6">
                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Requests</p>
                                <h3 className="text-2xl font-black text-slate-900 mt-1">{permissions.length}</h3>
                            </div>
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                                <CalendarDays size={22} />
                            </div>
                        </div>

                        <div className="p-5 bg-white rounded-3xl border border-amber-200 bg-amber-50/20 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Approvals</p>
                                <h3 className="text-2xl font-black text-amber-900 mt-1">{pendingPermissionsCount}</h3>
                            </div>
                            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-bold">
                                <Hourglass size={22} className={pendingPermissionsCount > 0 ? 'animate-pulse' : ''} />
                            </div>
                        </div>

                        <div className="p-5 bg-white rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved</p>
                                <h3 className="text-2xl font-black text-emerald-900 mt-1">{approvedPermissionsCount}</h3>
                            </div>
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
                                <CheckCircle2 size={22} />
                            </div>
                        </div>

                        <div className="p-5 bg-white rounded-3xl border border-rose-200 bg-rose-50/20 shadow-xs flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Rejected</p>
                                <h3 className="text-2xl font-black text-rose-900 mt-1">{rejectedPermissionsCount}</h3>
                            </div>
                            <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center font-bold">
                                <X size={22} />
                            </div>
                        </div>
                    </div>

                    {/* Permission Filter Bar */}
                    <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            
                            {/* Search Input */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search employee, ID, reason, type..." 
                                    value={permSearchTerm}
                                    onChange={(e) => setPermSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-xs text-slate-900"
                                />
                                {permSearchTerm && (
                                    <button 
                                        onClick={() => setPermSearchTerm('')} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Status Filters Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start lg:self-auto">
                                {[
                                    { id: 'all', label: 'All Requests' },
                                    { id: 'Pending', label: `Pending (${pendingPermissionsCount})` },
                                    { id: 'Approved', label: 'Approved' },
                                    { id: 'Rejected', label: 'Rejected' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setPermStatusFilter(tab.id)}
                                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                            permStatusFilter === tab.id
                                                ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Filter for Permissions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                    <CalendarDays className="text-indigo-600" size={14} />
                                    <span className="font-bold text-slate-600">FROM:</span>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                    <CalendarDays className="text-indigo-600" size={14} />
                                    <span className="font-bold text-slate-600">TO:</span>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                                    />
                                </div>

                                {(startDate || endDate) && (
                                    <button 
                                        type="button"
                                        onClick={() => { setStartDate(''); setEndDate(''); }}
                                        className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                                    >
                                        <X size={13} /> Clear Date
                                    </button>
                                )}
                            </div>

                            <div className="text-xs font-semibold text-slate-400">
                                Showing {filteredPermissions.length} permission requests
                            </div>
                        </div>
                    </div>

                    {/* Permissions List / Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                                        <th className="p-4">Employee</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Duration & Slot</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Reason / Description</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Admin Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {permLoading ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                                                <RefreshCw className="animate-spin inline-block mr-2 text-indigo-600" size={16} />
                                                Loading permission requests...
                                            </td>
                                        </tr>
                                    ) : filteredPermissions.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                                                <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                                                <p className="font-bold text-slate-700">No permission requests found</p>
                                                <p className="text-xs mt-0.5">Employees have not submitted any permission requests matching this filter.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedPermissions.map((perm) => {
                                            const empName = `${perm.employeeId?.firstName || ''} ${perm.employeeId?.lastName || ''}`.trim() || 'Unknown Employee';
                                            const isUpdating = permUpdatingId === perm._id;

                                            return (
                                                <tr key={perm._id} className="hover:bg-slate-50/60 transition-colors">
                                                    {/* Employee Info */}
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shadow-inner">
                                                                {perm.employeeId?.firstName?.charAt(0) || 'E'}{perm.employeeId?.lastName?.charAt(0) || ''}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-xs">{empName}</div>
                                                                <div className="text-[10px] text-slate-500 font-mono">
                                                                    {perm.employeeId?.employeeId || 'ID'} • {perm.employeeId?.department || 'General'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Permission Date */}
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="font-bold text-slate-900">
                                                            {new Date(perm.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(perm.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                                                        </div>
                                                    </td>

                                                    {/* Duration & Slot */}
                                                    <td className="p-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs rounded-xl flex items-center gap-1.5 w-fit">
                                                                <Clock size={12} />
                                                                <span>{perm.hours} {perm.hours === 1 ? 'Hour' : 'Hours'}</span>
                                                            </span>
                                                            {perm.timeSlot && (
                                                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md w-fit">
                                                                    {perm.timeSlot}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Type */}
                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold border bg-slate-50 text-slate-700 border-slate-200">
                                                            {perm.type || 'Personal Work'}
                                                        </span>
                                                    </td>

                                                    {/* Reason / Description */}
                                                    <td className="p-4 max-w-xs">
                                                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium leading-relaxed">
                                                            {perm.reason}
                                                        </div>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="p-4 whitespace-nowrap">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 border ${
                                                            perm.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            perm.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                                        }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                perm.status === 'Approved' ? 'bg-emerald-500' :
                                                                perm.status === 'Rejected' ? 'bg-rose-500' :
                                                                'bg-amber-500'
                                                            }`}></span>
                                                            {perm.status}
                                                        </span>
                                                    </td>

                                                    {/* Admin Actions */}
                                                    <td className="p-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {perm.status === 'Pending' ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isUpdating}
                                                                        onClick={() => handleUpdatePermissionStatus(perm._id, 'Approved')}
                                                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                                                        title="Accept and approve this permission request"
                                                                    >
                                                                        <Check size={14} />
                                                                        <span>Accept</span>
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={isUpdating}
                                                                        onClick={() => handleUpdatePermissionStatus(perm._id, 'Rejected')}
                                                                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                                                        title="Reject this permission request"
                                                                    >
                                                                        <X size={14} />
                                                                        <span>Reject</span>
                                                                    </button>
                                                                </>
                                                            ) : perm.status === 'Approved' ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[11px] font-bold text-emerald-600 mr-1 flex items-center gap-1">
                                                                        <CheckCircle2 size={14} /> Accepted
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isUpdating}
                                                                        onClick={() => handleUpdatePermissionStatus(perm._id, 'Rejected')}
                                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                                                        title="Revoke and mark as rejected"
                                                                    >
                                                                        Revoke
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[11px] font-bold text-rose-600 mr-1 flex items-center gap-1">
                                                                        <X size={14} /> Rejected
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isUpdating}
                                                                        onClick={() => handleUpdatePermissionStatus(perm._id, 'Approved')}
                                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                                                        title="Change to Approved"
                                                                    >
                                                                        Re-Approve
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Delete permission record */}
                                                            <button
                                                                type="button"
                                                                onClick={() => setPermDeleteModal({ isOpen: true, perm })}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                                                                title="Delete permission request"
                                                            >
                                                                <Trash2 size={14} />
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

                        {/* PERMISSION REQUESTS PAGINATION FOOTER */}
                        {filteredPermissions.length > PERM_PAGE_SIZE && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white">
                                <span className="text-xs font-semibold text-slate-500">
                                    Showing <strong className="text-slate-900">{(validPermPage - 1) * PERM_PAGE_SIZE + 1}</strong>–<strong className="text-slate-900">{Math.min(validPermPage * PERM_PAGE_SIZE, filteredPermissions.length)}</strong> of <strong className="text-slate-900">{filteredPermissions.length}</strong> permission requests
                                </span>
                                <div className="flex items-center space-x-2">
                                    <button 
                                        type="button"
                                        onClick={() => setPermCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={validPermPage <= 1}
                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <ChevronLeft size={14} /> Previous
                                    </button>
                                    <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-xs font-mono">
                                        {validPermPage} / {totalPermPages}
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => setPermCurrentPage(p => Math.min(totalPermPages, p + 1))}
                                        disabled={validPermPage >= totalPermPages}
                                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        Next <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CONFIRMATION DELETE MODAL */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => !isDeleting && setDeleteModal({ isOpen: false, type: '', targetId: null, targetName: '', targetDate: '', count: 0 })}
                    ></div>
                    
                    <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-fade-up">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-xs">
                                <Trash2 size={26} />
                            </div>

                            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">
                                {deleteModal.type === 'single' ? 'Delete Attendance Record?' :
                                 deleteModal.type === 'filtered' ? `Delete All ${deleteModal.count} Filtered Records?` :
                                 `Delete ${deleteModal.count} Selected Records?`}
                            </h3>

                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-xs text-slate-600 text-left space-y-1">
                                {deleteModal.type === 'single' ? (
                                    <>
                                        <p><strong className="text-slate-800">Employee:</strong> {deleteModal.targetName}</p>
                                        <p><strong className="text-slate-800">Date:</strong> {deleteModal.targetDate}</p>
                                        <p className="text-slate-400 text-[11px] mt-1">This specific attendance log will be permanently removed.</p>
                                    </>
                                ) : (
                                    <>
                                        <p><strong className="text-slate-800">Scope:</strong> {deleteModal.targetName}</p>
                                        {deleteModal.targetDate && (
                                            <p><strong className="text-slate-800">Date Filter:</strong> {deleteModal.targetDate}</p>
                                        )}
                                        <p className="text-rose-600 font-semibold text-[11px] mt-1">
                                            ⚠️ This will permanently delete {deleteModal.count} attendance records matching your filter.
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setDeleteModal({ isOpen: false, type: '', targetId: null, targetName: '', targetDate: '', count: 0 })}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={executeDelete}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-rose-600/20 active:scale-95 cursor-pointer flex items-center gap-2"
                                >
                                    {isDeleting && <RefreshCw size={13} className="animate-spin" />}
                                    <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRMATION PERMISSION DELETE MODAL */}
            {permDeleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                        onClick={() => setPermDeleteModal({ isOpen: false, perm: null })}
                    ></div>
                    
                    <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-fade-up">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-xs">
                                <Trash2 size={26} />
                            </div>

                            <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">
                                Delete Permission Request?
                            </h3>

                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-xs text-slate-600 text-left space-y-1">
                                <p>
                                    <strong className="text-slate-800">Employee:</strong> {permDeleteModal.perm?.employeeId?.firstName} {permDeleteModal.perm?.employeeId?.lastName}
                                </p>
                                <p>
                                    <strong className="text-slate-800">Date & Hours:</strong> {permDeleteModal.perm?.hours} Hours on {new Date(permDeleteModal.perm?.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </p>
                                <p>
                                    <strong className="text-slate-800">Reason:</strong> {permDeleteModal.perm?.reason}
                                </p>
                                <p className="text-rose-600 font-semibold text-[11px] mt-2">
                                    ⚠️ This request record will be permanently deleted from the system.
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPermDeleteModal({ isOpen: false, perm: null })}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeletePermission(permDeleteModal.perm?._id)}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-rose-600/20 active:scale-95 cursor-pointer"
                                >
                                    Yes, Delete Permission
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
