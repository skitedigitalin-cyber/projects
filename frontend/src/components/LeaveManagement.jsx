import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Check, X, Clock, FileSignature, Calendar, Search, 
    ChevronLeft, ChevronRight, CheckCircle2, Hourglass, 
    CalendarDays, Users, RefreshCw, AlertCircle
} from 'lucide-react';

export default function LeaveManagement() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination (10 records per page)
    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    const fetchLeaves = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/hr/leaves', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLeaves(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching leaves", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const updateStatus = async (id, status) => {
        setUpdatingId(id);
        try {
            await axios.put(`http://localhost:5000/api/hr/leaves/${id}/status`, 
                { status, managerComments: status === 'Approved' ? 'Approved by HR' : 'Rejected by HR' },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            await fetchLeaves();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to update leave status");
        } finally {
            setUpdatingId(null);
        }
    };

    // Metric counts
    const pendingCount = useMemo(() => leaves.filter(l => l.status === 'Pending').length, [leaves]);
    const approvedCount = useMemo(() => leaves.filter(l => l.status === 'Approved').length, [leaves]);
    const rejectedCount = useMemo(() => leaves.filter(l => l.status === 'Rejected').length, [leaves]);

    // Filtering logic
    const filteredLeaves = useMemo(() => {
        return leaves.filter(leave => {
            // Status filter
            if (statusFilter !== 'all' && leave.status !== statusFilter) {
                return false;
            }

            // Date range filter
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                const lStart = new Date(leave.startDate);
                lStart.setHours(0, 0, 0, 0);
                if (lStart < sDate) return false;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                const lEnd = new Date(leave.endDate || leave.startDate);
                if (lEnd > eDate) return false;
            }

            // Search filter
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            const fName = `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''}`.toLowerCase();
            const empId = (leave.employeeId?.employeeId || '').toLowerCase();
            const dept = (leave.employeeId?.department || '').toLowerCase();
            const lType = (leave.leaveType || '').toLowerCase();
            const reason = (leave.reason || '').toLowerCase();
            const status = (leave.status || '').toLowerCase();

            return fName.includes(term) || empId.includes(term) || dept.includes(term) || lType.includes(term) || reason.includes(term) || status.includes(term);
        });
    }, [leaves, searchTerm, statusFilter, startDate, endDate]);

    // Reset page to 1 whenever search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, startDate, endDate]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredLeaves.length / PAGE_SIZE) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedLeaves = filteredLeaves.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    if (loading) {
        return (
            <div className="p-16 text-center text-slate-500 font-medium">
                <RefreshCw className="animate-spin inline-block mr-2 text-indigo-600" size={20} />
                Loading leave requests...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* 1. Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Leave Requests</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-1">{leaves.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                        <FileSignature size={22} />
                    </div>
                </div>

                <div className="p-5 bg-white rounded-3xl border border-amber-200 bg-amber-50/20 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Approvals</p>
                        <h3 className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</h3>
                    </div>
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-bold">
                        <Hourglass size={22} className={pendingCount > 0 ? 'animate-pulse' : ''} />
                    </div>
                </div>

                <div className="p-5 bg-white rounded-3xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Approved Leaves</p>
                        <h3 className="text-2xl font-black text-emerald-900 mt-1">{approvedCount}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold">
                        <CheckCircle2 size={22} />
                    </div>
                </div>

                <div className="p-5 bg-white rounded-3xl border border-rose-200 bg-rose-50/20 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Rejected Requests</p>
                        <h3 className="text-2xl font-black text-rose-900 mt-1">{rejectedCount}</h3>
                    </div>
                    <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center font-bold">
                        <X size={22} />
                    </div>
                </div>
            </div>

            {/* 2. Control Bar: Search + Status Chips + Date Filters */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search employee, ID, department, leave type, reason..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-xs text-slate-900"
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

                    {/* Status Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start lg:self-auto">
                        {[
                            { id: 'all', label: `All Leaves (${leaves.length})` },
                            { id: 'Pending', label: `Pending (${pendingCount})` },
                            { id: 'Approved', label: `Approved (${approvedCount})` },
                            { id: 'Rejected', label: `Rejected (${rejectedCount})` }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStatusFilter(tab.id)}
                                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                    statusFilter === tab.id
                                        ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Filter */}
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
                        Showing {filteredLeaves.length} leave requests
                    </div>
                </div>
            </div>

            {/* 3. Leave Requests Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50">
                                <th className="p-4">Employee</th>
                                <th className="p-4">Leave Type</th>
                                <th className="p-4">Duration & Dates</th>
                                <th className="p-4">Reason / Notes</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Admin Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredLeaves.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                                        <FileSignature size={36} className="mx-auto text-slate-300 mb-2" />
                                        <p className="font-bold text-slate-700">No leave requests found</p>
                                        <p className="text-xs mt-0.5">No employee leave records match the current filter criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLeaves.map(leave => {
                                    const empName = `${leave.employeeId?.firstName || ''} ${leave.employeeId?.lastName || ''}`.trim() || 'Unknown Employee';
                                    const sDate = new Date(leave.startDate);
                                    const eDate = new Date(leave.endDate || leave.startDate);
                                    const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                                    const isUpdating = updatingId === leave._id;

                                    return (
                                        <tr key={leave._id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Employee */}
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shadow-inner">
                                                        {leave.employeeId?.firstName?.charAt(0) || 'E'}{leave.employeeId?.lastName?.charAt(0) || ''}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-xs">{empName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">
                                                            {leave.employeeId?.employeeId || 'ID'} • {leave.employeeId?.department || 'General'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Leave Type */}
                                            <td className="p-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                                                    leave.leaveType === 'Sick Leave' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    leave.leaveType === 'Casual Leave' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    leave.leaveType === 'Permission' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                    {leave.leaveType}
                                                </span>
                                            </td>

                                            {/* Duration & Dates */}
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                        <Calendar size={13} className="text-indigo-600" />
                                                        <span>{sDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        {leave.endDate && sDate.getTime() !== eDate.getTime() && (
                                                            <>
                                                                <span className="text-slate-400">→</span>
                                                                <span>{eDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-500">
                                                        {diffDays} {diffDays === 1 ? 'Day' : 'Days'} Duration
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Reason */}
                                            <td className="p-4 max-w-xs">
                                                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium leading-relaxed">
                                                    {leave.reason}
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 border ${
                                                    leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                                    leave.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                                    'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        leave.status === 'Approved' ? 'bg-emerald-500' :
                                                        leave.status === 'Rejected' ? 'bg-rose-500' :
                                                        'bg-amber-500'
                                                    }`}></span>
                                                    {leave.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    {leave.status === 'Pending' ? (
                                                        <>
                                                            <button 
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={() => updateStatus(leave._id, 'Approved')}
                                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                                            >
                                                                <Check size={14} /> Approve
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={() => updateStatus(leave._id, 'Rejected')}
                                                                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                                            >
                                                                <X size={14} /> Reject
                                                            </button>
                                                        </>
                                                    ) : leave.status === 'Approved' ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] font-bold text-emerald-600 mr-1 flex items-center gap-1">
                                                                <CheckCircle2 size={14} /> Approved
                                                            </span>
                                                            <button
                                                                type="button"
                                                                disabled={isUpdating}
                                                                onClick={() => updateStatus(leave._id, 'Rejected')}
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
                                                                onClick={() => updateStatus(leave._id, 'Approved')}
                                                                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                                                                title="Change to Approved"
                                                            >
                                                                Re-Approve
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 4. LEAVE REQUESTS PAGINATION FOOTER */}
                {filteredLeaves.length > PAGE_SIZE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-900">{(validPage - 1) * PAGE_SIZE + 1}</strong>–<strong className="text-slate-900">{Math.min(validPage * PAGE_SIZE, filteredLeaves.length)}</strong> of <strong className="text-slate-900">{filteredLeaves.length}</strong> leave requests
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

        </div>
    );
}
