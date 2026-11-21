import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HRViews.css';
import { 
    Plus, Search, UserCheck, Pencil, Trash2, Mail, Briefcase, Phone, 
    Eye, X, CreditCard, Landmark, Hash, Building2, Calendar, ShieldCheck, 
    RotateCcw, Ban, AlertTriangle, ChevronLeft, ChevronRight 
} from 'lucide-react';

export default function EmployeeManagement() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(null);

    // Pagination (15 records per page)
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Keep Escape available while employee details are open.
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedEmp(null);
        };
        if (selectedEmp) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedEmp]);

    const fetchEmployees = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/hr/employees', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setEmployees(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching employees", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    // 1. Deactivate / Block or Reactivate (Preserves history & records)
    const handleToggleStatus = async (emp) => {
        const isCurrentlyActive = emp.status !== 'Inactive';
        const newStatus = isCurrentlyActive ? 'Inactive' : 'Active';
        const confirmMsg = isCurrentlyActive 
            ? `Deactivate (Block) ${emp.firstName} ${emp.lastName || ''}?\n\n• Login access will be temporarily blocked.\n• Profile will be dimmed and moved to the end of the list.\n• Past attendance and payroll records are safely preserved.`
            : `Reactivate ${emp.firstName} ${emp.lastName || ''}?\n\n• Full login access will be restored.\n• Profile will return to active status at the top of the list.`;
        if (!window.confirm(confirmMsg)) return;

        // Optimistic instant UI update
        setEmployees(prev => prev.map(e => e._id === emp._id ? { ...e, status: newStatus } : e));
        if (selectedEmp?._id === emp._id) {
            setSelectedEmp(prev => prev ? { ...prev, status: newStatus } : null);
        }

        try {
            if (newStatus === 'Active') {
                await axios.put(`http://localhost:5000/api/hr/employees/${emp._id}`, { status: 'Active' });
            } else {
                await axios.delete(`http://localhost:5000/api/hr/employees/${emp._id}`);
            }
            fetchEmployees();
        } catch (error) {
            console.error("Error toggling employee status", error);
            fetchEmployees();
            alert(error.response?.data?.message || "Failed to update employee status");
        }
    };

    // 2. Permanent Delete (Erases employee and user login account permanently from database)
    const handlePermanentDelete = async (emp) => {
        const confirmMsg = `⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to COMPLETELY ERASE ${emp.firstName} ${emp.lastName || ''} (${emp.employeeId}) from the system?\n\n• This will permanently delete both the employee profile and user login account from the database.\n• This action CANNOT be undone!`;
        if (!window.confirm(confirmMsg)) return;

        // Optimistic instant UI update - disappears immediately!
        setEmployees(prev => prev.filter(e => e._id !== emp._id));
        if (selectedEmp?._id === emp._id) {
            setSelectedEmp(null);
        }

        try {
            await axios.delete(`http://localhost:5000/api/hr/employees/${emp._id}?permanent=true`);
            fetchEmployees();
        } catch (error) {
            console.error("Error permanently deleting employee", error);
            fetchEmployees();
            alert(error.response?.data?.message || "Failed to permanently delete employee");
        }
    };

    const filteredEmployees = employees
        .filter(emp => 
            (emp.firstName + ' ' + (emp.lastName || '')).toLowerCase().includes(searchTerm.toLowerCase()) || 
            emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            // Active employees come first, Deactivated (Inactive) employees go to the very end/last!
            const aInactive = a.status === 'Inactive' ? 1 : 0;
            const bInactive = b.status === 'Inactive' ? 1 : 0;
            if (aInactive !== bInactive) {
                return aInactive - bInactive;
            }
            return (a.employeeId || '').localeCompare(b.employeeId || '');
        });

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading employees...</div>;

    const activeCount = employees.filter(e => e.status !== 'Inactive').length;
    const inactiveCount = employees.filter(e => e.status === 'Inactive').length;

    const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const paginatedEmployees = filteredEmployees.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    return (
        <div className="hr-views-stack">
            <div className="hr-employee-toolbar">
                <div className="relative hr-employee-search">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        aria-label="Search employees" placeholder="Search employees"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#111111] focus:ring-4 focus:ring-[#f0f0ee] transition-all font-medium text-gray-700"
                    />
                </div>
                <div className="hr-employee-toolbar-actions">
                    <div className="hr-employee-counts" aria-label="Staff counts">
                        <span className="workspace-status workspace-status-success">
                            {activeCount} Active
                        </span>
                        {inactiveCount > 0 && (
                            <span className="workspace-status">
                                {inactiveCount} Deactivated
                            </span>
                        )}
                    </div>
                    <button 
                        onClick={() => navigate('/hr/employee/add')}
                        className="hr-employee-add"
                    >
                        <Plus size={18} className="mr-2" /> Add Employee
                    </button>
                </div>
            </div>

            <div className="hr-employee-directory" data-selected={Boolean(selectedEmp)}>
                <section className="hr-view-panel" aria-label="Employees">
            <div className="hr-employee-directory-list">
                {filteredEmployees.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <UserCheck size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-lg font-bold text-gray-900">No employees on record</p>
                        <p className="text-sm text-gray-500 mt-1">Click "Add Employee" to onboard your staff.</p>
                        <button 
                            onClick={() => navigate('/hr/employee/add')} 
                            className="mt-4 px-5 py-2 bg-[#f0f0ee] text-[#3f3f3f] rounded-xl font-bold hover:bg-[#e6e6e3] transition-colors cursor-pointer inline-flex items-center text-sm"
                        >
                            <Plus size={16} className="mr-1.5" /> Add First Employee
                        </button>
                    </div>
                ) : paginatedEmployees.map(emp => {
                    const isInactive = emp.status === 'Inactive';
                    return (
                        <div 
                            key={emp._id} 
                            onClick={() => setSelectedEmp(emp)}
                            className={`rounded-2xl p-5 border transition-all duration-300 relative group cursor-pointer flex flex-col justify-between ${
                                isInactive 
                                ? 'bg-slate-50/70 border-dashed border-slate-300 opacity-60 hover:opacity-100 grayscale-[40%] hover:grayscale-0 shadow-none' 
                                : 'bg-white border-gray-200 shadow-sm hover:shadow-md'
                            }`}
                        >
                            <div>
                                {/* Card Top Row: Avatar + Name & Quick Actions */}
                                <div className="hr-employee-card-header">
                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-black shadow-inner shrink-0 overflow-hidden ${
                                            isInactive 
                                            ? 'bg-slate-200 text-slate-500' 
                                            : 'bg-[#f0f0ee] text-[#111111]'
                                        }`}>
                                            {emp.photo ? (
                                                <img src={emp.photo} alt={emp.firstName} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{emp.firstName?.charAt(0)}{emp.lastName ? emp.lastName.charAt(0) : ''}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className={`font-semibold text-sm leading-tight ${isInactive ? 'text-slate-600' : 'text-gray-900'}`} title={`${emp.firstName} ${emp.lastName}`}>
                                                    {emp.firstName} {emp.lastName}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <p className="text-[11px] font-semibold text-[#3f3f3f] tracking-wide uppercase">{emp.employeeId}</p>
                                                {isInactive && (
                                                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 tracking-wider">
                                                        Deactivated
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={() => setSelectedEmp(emp)} 
                                            className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                                            title="View full profile"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/hr/employee/edit/${emp._id}`)} 
                                            className="text-[#3f3f3f] hover:text-blue-800 bg-[#f0f0ee] hover:bg-[#e6e6e3] p-1.5 rounded-lg transition-colors cursor-pointer"
                                            title="Edit employee and statutory/bank details"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        {isInactive ? (
                                            <>
                                                <button 
                                                    onClick={() => handleToggleStatus(emp)} 
                                                    className="text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                    title="Reactivate employee to Active"
                                                >
                                                    <RotateCcw size={15} />
                                                </button>
                                                <button 
                                                    onClick={() => handlePermanentDelete(emp)} 
                                                    className="text-red-500 hover:text-white bg-red-50 hover:bg-red-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                    title="Permanently Delete employee from database"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                onClick={() => handleToggleStatus(emp)} 
                                                className="text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                title="Deactivate / Block employee"
                                            >
                                                <Ban size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Contact & Designation Details */}
                                <div className="space-y-1.5 mb-3 text-xs">
                                    <div className="flex items-center text-gray-600">
                                        <Briefcase size={14} className="mr-2 text-gray-400 shrink-0" />
                                        <span className="font-medium text-gray-800 truncate" title={`${emp.designation || 'Staff'} | ${emp.department || 'General'}`}>
                                            {emp.designation || 'Staff'} <span className="text-gray-300 mx-1">•</span> <span className="text-gray-500 font-normal">{emp.department || 'General'}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center text-gray-600">
                                        <Mail size={14} className="mr-2 text-gray-400 shrink-0" />
                                        <span className="truncate">{emp.email}</span>
                                    </div>
                                    {emp.phone && (
                                        <div className="flex items-center text-gray-600">
                                            <Phone size={14} className="mr-2 text-gray-400 shrink-0" />
                                            <span>{emp.phone}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Statutory & Bank Chips */}
                                {(emp.panNumber || emp.bankName) ? (
                                    <div className="pt-2.5 pb-1 border-t border-dashed border-gray-100 flex items-center gap-1.5 flex-wrap">
                                        {emp.panNumber && (
                                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-mono">
                                                PAN: {emp.panNumber}
                                            </span>
                                        )}
                                        {emp.bankName && (
                                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 truncate max-w-[130px]">
                                                <Landmark size={10} className="mr-1" />
                                                {emp.bankName}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="pt-2 pb-0.5 border-t border-dashed border-gray-100 flex items-center justify-between text-[11px]" onClick={e => e.stopPropagation()}>
                                        <span className="text-slate-400 italic">No bank/PAN added</span>
                                        <button 
                                            onClick={() => navigate(`/hr/employee/edit/${emp._id}`)}
                                            className="text-[#3f3f3f] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                        >
                                            <Plus size={11} /> Add Details
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Card Bottom Status Row */}
                            <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center mt-2.5">
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                                        isInactive 
                                        ? 'bg-slate-200 text-slate-700' 
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                        {isInactive ? 'Deactivated' : 'Active'}
                                    </span>
                                    {isInactive && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleStatus(emp);
                                            }}
                                            className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer flex items-center gap-0.5"
                                            title="Click to reactivate"
                                        >
                                            <RotateCcw size={11} /> Reactivate
                                        </button>
                                    )}
                                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#f0f0ee] text-[#111111] border border-blue-100">
                                        {emp.role || emp.userId?.role || 'Employee'}
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {emp.shift || 'General'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredEmployees.length > PAGE_SIZE && (
                <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-gray-200 shadow-sm mt-4">
                    <span className="text-xs font-semibold text-slate-500">
                        Showing <strong className="text-slate-800">{(validPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-slate-800">{Math.min(validPage * PAGE_SIZE, filteredEmployees.length)}</strong> of <strong className="text-slate-800">{filteredEmployees.length}</strong> employees
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

                </section>
                {selectedEmp && (
                    <aside className="hr-view-panel hr-employee-details" aria-label="Employee details">
                        {/* Fixed Top Header (Always Visible!) */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white/95 backdrop-blur-sm shrink-0">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 rounded-2xl bg-[#111111] text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-none shrink-0 overflow-hidden">
                                    {selectedEmp.photo ? (
                                        <img src={selectedEmp.photo} alt={selectedEmp.firstName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{selectedEmp.firstName?.charAt(0)}{selectedEmp.lastName ? selectedEmp.lastName.charAt(0) : ''}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-xl font-black text-slate-900">
                                            {selectedEmp.firstName} {selectedEmp.lastName}
                                        </h3>
                                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${selectedEmp.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {selectedEmp.status || 'Active'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-[#3f3f3f] tracking-wider uppercase mt-1">
                                        {selectedEmp.employeeId} • {selectedEmp.designation || 'Staff'} ({selectedEmp.department || 'General'})
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => {
                                        navigate(`/hr/employee/edit/${selectedEmp._id}`);
                                        setSelectedEmp(null);
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-[#303030] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                >
                                    <Pencil size={13} />
                                    <span>Edit Details</span>
                                </button>
                                <button 
                                    onClick={() => setSelectedEmp(null)}
                                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                    title="Close (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Body Content */}
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                            {/* Section 1: Contact & Employment */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                                    <Briefcase size={14} className="mr-1.5 text-indigo-500" /> Employment & Contact
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Email Address</span>
                                        <span className="font-semibold text-slate-800 break-all">{selectedEmp.email}</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Phone Number</span>
                                        <span className="font-semibold text-slate-800">{selectedEmp.phone || 'Not Provided'}</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Date of Joining</span>
                                        <span className="font-semibold text-slate-800">
                                            {selectedEmp.dateOfJoining ? new Date(selectedEmp.dateOfJoining).toLocaleDateString('en-GB') : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Working Shift</span>
                                        <span className="font-semibold text-slate-800">{selectedEmp.shift || 'General'} Shift</span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Per-Day Salary Rate</span>
                                        <span className="font-bold text-emerald-700 font-mono text-sm">
                                            ₹{selectedEmp.perDaySalary ? selectedEmp.perDaySalary.toLocaleString() : '0'} / day
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Role</span>
                                        <span className="font-bold text-[#111111]">{selectedEmp.role || selectedEmp.userId?.role || 'Employee'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Statutory & Identity Details */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        <CreditCard size={14} className="mr-1.5 text-amber-500" /> Statutory & Identity Details
                                    </h4>
                                    {(!selectedEmp.panNumber || !selectedEmp.aadharNumber) && (
                                        <button 
                                            onClick={() => {
                                                navigate(`/hr/employee/edit/${selectedEmp._id}`);
                                                setSelectedEmp(null);
                                            }}
                                            className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={12} /> Add Statutory Details
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
                                        <span className="text-amber-800/60 block text-[10px] font-bold uppercase tracking-wider">PAN Number</span>
                                        <span className="font-mono font-black text-amber-950 text-sm tracking-wider">
                                            {selectedEmp.panNumber || <span className="text-slate-400 font-normal italic">Not recorded</span>}
                                        </span>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
                                        <span className="text-amber-800/60 block text-[10px] font-bold uppercase tracking-wider">Aadhaar Number</span>
                                        <span className="font-mono font-black text-amber-950 text-sm tracking-wider">
                                            {selectedEmp.aadharNumber ? selectedEmp.aadharNumber.replace(/(\d{4})(?=\d)/g, '$1 ') : <span className="text-slate-400 font-normal italic">Not recorded</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Bank Details */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                                        <Landmark size={14} className="mr-1.5 text-emerald-600" /> Bank Account Details (Salary Disbursement)
                                    </h4>
                                    {(!selectedEmp.bankName || !selectedEmp.accountNumber || !selectedEmp.ifscCode) && (
                                        <button 
                                            onClick={() => {
                                                navigate(`/hr/employee/edit/${selectedEmp._id}`);
                                                setSelectedEmp(null);
                                            }}
                                            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={12} /> Add Bank Details
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                                        <span className="text-emerald-800/60 block text-[10px] font-bold uppercase tracking-wider">Bank Name</span>
                                        <span className="font-bold text-emerald-950 text-sm">
                                            {selectedEmp.bankName || <span className="text-slate-400 font-normal italic">Not recorded</span>}
                                        </span>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                                        <span className="text-emerald-800/60 block text-[10px] font-bold uppercase tracking-wider">Account Number</span>
                                        <span className="font-mono font-black text-emerald-950 text-sm tracking-wide">
                                            {selectedEmp.accountNumber || <span className="text-slate-400 font-normal italic">Not recorded</span>}
                                        </span>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                                        <span className="text-emerald-800/60 block text-[10px] font-bold uppercase tracking-wider">IFSC Code</span>
                                        <span className="font-mono font-black text-emerald-950 text-sm tracking-wider uppercase">
                                            {selectedEmp.ifscCode || <span className="text-slate-400 font-normal italic">Not recorded</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Enabled Modules */}
                            {Array.isArray(selectedEmp.userId?.activeModules) && selectedEmp.userId.activeModules.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                                        <ShieldCheck size={14} className="mr-1.5 text-[#3f3f3f]" /> Enabled Dashboard Modules
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedEmp.userId.activeModules.map(m => (
                                            <span key={m} className="px-3 py-1 rounded-lg bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3]/70 text-xs font-bold uppercase tracking-wide">
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fixed Bottom Footer */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                                {selectedEmp.status === 'Inactive' ? (
                                    <button
                                        onClick={() => handleToggleStatus(selectedEmp)}
                                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Reactivate employee account"
                                    >
                                        <RotateCcw size={13} />
                                        <span>Reactivate Profile</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleToggleStatus(selectedEmp)}
                                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Deactivate and block login access"
                                    >
                                        <Ban size={13} />
                                        <span>Deactivate (Block)</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => handlePermanentDelete(selectedEmp)}
                                    className="px-3.5 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title="Erase from database completely"
                                >
                                    <Trash2 size={13} />
                                    <span>Delete Permanently</span>
                                </button>
                            </div>

                            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                <button
                                    onClick={() => setSelectedEmp(null)}
                                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        navigate(`/hr/employee/edit/${selectedEmp._id}`);
                                        setSelectedEmp(null);
                                    }}
                                    className="px-4 py-2 bg-[#111111] hover:bg-[#303030] text-white font-bold rounded-xl text-xs shadow-md shadow-none flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Pencil size={13} />
                                    <span>Edit Details</span>
                                </button>
                            </div>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
