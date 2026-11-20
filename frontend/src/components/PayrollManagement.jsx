import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Banknote, Calendar, ChevronLeft, ChevronRight, Search, 
    Edit3, CheckCircle2, AlertCircle, Eye, Printer, Sparkles, 
    User, Check, X, ArrowRight, ShieldCheck, Clock, TrendingUp
} from 'lucide-react';

export default function PayrollManagement() {
    const [month, setMonth] = useState(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    });

    const [loading, setLoading] = useState(false);
    const [payrollData, setPayrollData] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('All');

    // Quick Rate Edit Modal state
    const [editingEmp, setEditingEmp] = useState(null);
    const [editRateValue, setEditRateValue] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    // View Dates Modal state
    const [viewDatesEmp, setViewDatesEmp] = useState(null);

    // Payslip Modal state
    const [payslipEmp, setPayslipEmp] = useState(null);

    // Paid status tracking (local storage cache per month & emp)
    const [paidStatus, setPaidStatus] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('payroll_paid_status') || '{}');
        } catch {
            return {};
        }
    });

    useEffect(() => {
        fetchPayroll();
    }, [month]);

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5000/api/hr/payroll?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPayrollData(res.data);
        } catch (err) {
            console.error('Error fetching payroll:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        const [y, m] = month.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        const newY = d.getFullYear();
        const newM = String(d.getMonth() + 1).padStart(2, '0');
        setMonth(`${newY}-${newM}`);
    };

    const handleNextMonth = () => {
        const [y, m] = month.split('-').map(Number);
        const d = new Date(y, m, 1);
        const newY = d.getFullYear();
        const newM = String(d.getMonth() + 1).padStart(2, '0');
        setMonth(`${newY}-${newM}`);
    };

    const handleOpenEditRate = (record) => {
        setEditingEmp(record);
        setEditRateValue(record.perDaySalary || '');
    };

    const handleSaveRate = async (e) => {
        e.preventDefault();
        if (!editingEmp) return;
        setEditSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/hr/payroll/salary/${editingEmp.employeeId}`, {
                perDaySalary: Number(editRateValue) || 0
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingEmp(null);
            await fetchPayroll();
        } catch (err) {
            console.error('Error saving salary rate:', err);
            alert(err.response?.data?.message || 'Failed to update salary rate');
        } finally {
            setEditSaving(false);
        }
    };

    const togglePaidStatus = (empId) => {
        const key = `${month}_${empId}`;
        const updated = { ...paidStatus, [key]: !paidStatus[key] };
        setPaidStatus(updated);
        localStorage.setItem('payroll_paid_status', JSON.stringify(updated));
    };

    const formatMonthName = (mStr) => {
        if (!mStr) return '';
        const [y, m] = mStr.split('-').map(Number);
        const d = new Date(y, m - 1, 1);
        return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    };

    // Filter records
    const records = payrollData?.records || [];
    const departments = ['All', ...new Set(records.map(r => r.department).filter(Boolean))];

    const filteredRecords = records.filter(r => {
        const matchesSearch = 
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === 'All' || r.department === selectedDept;
        return matchesSearch && matchesDept;
    });

    const stats = payrollData?.stats || {
        totalPayroll: 0,
        totalPresentDays: 0,
        employeeCount: 0,
        avgDailyRate: 0
    };

    return (
        <div className="space-y-6">
            {/* 1. Header Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-1.5">
                        <Sparkles size={13} className="text-blue-600" />
                        <span>Automated Payroll Engine</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Staff Attendance & Payroll Ledger</h2>
                    <p className="text-xs text-slate-500 font-medium">Daily wage multiplied by verified present days for selected billing period.</p>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
                    <button 
                        onClick={handlePrevMonth}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-none hover:shadow-sm cursor-pointer"
                        title="Previous Month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex items-center gap-2 px-3 py-1 text-sm font-black text-slate-800">
                        <Calendar size={16} className="text-blue-600" />
                        <span>{formatMonthName(month)}</span>
                    </div>

                    <button 
                        onClick={handleNextMonth}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white transition-all shadow-none hover:shadow-sm cursor-pointer"
                        title="Next Month"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* 2. Key Metrics Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Payroll */}
                <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200">
                    <div className="bg-white rounded-[1.5rem] p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Month Payout</span>
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                <Banknote size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                            ₹{stats.totalPayroll.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            Based on {stats.totalPresentDays} total logged present days
                        </p>
                    </div>
                </div>

                {/* Total Present Days */}
                <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200">
                    <div className="bg-white rounded-[1.5rem] p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Present Days Clocked</span>
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                <Clock size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                            {stats.totalPresentDays} <span className="text-sm font-semibold text-slate-500">Days</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            Across {stats.employeeCount} active company employees
                        </p>
                    </div>
                </div>

                {/* Average Daily Wage */}
                <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200">
                    <div className="bg-white rounded-[1.5rem] p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Daily Rate</span>
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                            ₹{stats.avgDailyRate.toLocaleString()} <span className="text-sm font-semibold text-slate-500">/ day</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            {stats.staffWithRateCount} of {stats.employeeCount} staff have rates set
                        </p>
                    </div>
                </div>

                {/* Staff Count */}
                <div className="p-2 bg-slate-100/80 rounded-[2rem] border border-slate-200">
                    <div className="bg-white rounded-[1.5rem] p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff Count</span>
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                                <User size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                            {stats.employeeCount} <span className="text-sm font-semibold text-slate-500">Staff</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-medium">
                            {payrollData?.daysInMonth || 30} days in {formatMonthName(month)}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Search and Department Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search staff by name or ID..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Department:</span>
                    {departments.map(dept => (
                        <button
                            key={dept}
                            type="button"
                            onClick={() => setSelectedDept(dept)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                selectedDept === dept
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {dept}
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. Payroll List / Table */}
            {loading ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-bold text-slate-500">Calculating payroll based on attendance records...</p>
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <Banknote size={28} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No Employees Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Add employees or adjust your search filter to see payroll calculations.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-4 px-6">Employee</th>
                                    <th className="py-4 px-4">Department & Shift</th>
                                    <th className="py-4 px-4">Per-Day Salary</th>
                                    <th className="py-4 px-4 text-center">Days Present</th>
                                    <th className="py-4 px-4 text-center">Attendance Breakdown</th>
                                    <th className="py-4 px-6 text-right">Calculated Salary</th>
                                    <th className="py-4 px-6 text-center">Status & Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                                {filteredRecords.map((r) => {
                                    const isPaid = paidStatus[`${month}_${r.employeeId}`];
                                    return (
                                        <tr key={r.employeeId} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Employee Name & Code */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                                        {r.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{r.name}</h4>
                                                        <p className="text-[11px] text-slate-400 mt-0.5">{r.code} • {r.designation}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Department & Shift */}
                                            <td className="py-4 px-4">
                                                <div className="font-bold text-slate-800">{r.department}</div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">{r.shift} Shift</div>
                                            </td>

                                            {/* Per-Day Salary */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    {r.perDaySalary > 0 ? (
                                                        <span className="font-black text-slate-900 text-sm">
                                                            ₹{r.perDaySalary.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            Rate Not Set
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditRate(r)}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                                        title="Edit Per-Day Salary"
                                                    >
                                                        <Edit3 size={13} />
                                                    </button>
                                                </div>
                                                <span className="text-[10px] text-slate-400">per present day</span>
                                            </td>

                                            {/* Days Present */}
                                            <td className="py-4 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewDatesEmp(r)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-extrabold text-xs transition-colors cursor-pointer group"
                                                    title="Click to view dates"
                                                >
                                                    <span>{r.effectiveDays} Days</span>
                                                    <Eye size={12} className="text-blue-600 group-hover:scale-110 transition-transform" />
                                                </button>
                                            </td>

                                            {/* Attendance Breakdown Badges */}
                                            <td className="py-4 px-4">
                                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]" title="Full Day Present">
                                                        {r.presentCount}P
                                                    </span>
                                                    {r.halfDayCount > 0 && (
                                                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]" title="Half Days">
                                                            {r.halfDayCount}HD
                                                        </span>
                                                    )}
                                                    {r.onLeaveCount > 0 && (
                                                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px]" title="Leaves">
                                                            {r.onLeaveCount}L
                                                        </span>
                                                    )}
                                                    {r.absentCount > 0 && (
                                                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[10px]" title="Absent">
                                                            {r.absentCount}A
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Calculated Salary */}
                                            <td className="py-4 px-6 text-right">
                                                <div className="text-base font-black text-blue-700">
                                                    ₹{r.calculatedSalary.toLocaleString()}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {r.effectiveDays} × ₹{r.perDaySalary || 0}
                                                </div>
                                            </td>

                                            {/* Status & Actions */}
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePaidStatus(r.employeeId)}
                                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                                            isPaid 
                                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {isPaid ? <Check size={11} strokeWidth={3} /> : null}
                                                        <span>{isPaid ? 'Paid' : 'Mark Paid'}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setPayslipEmp(r)}
                                                        className="p-1.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-800 transition-colors cursor-pointer"
                                                        title="Generate / Print Payslip"
                                                    >
                                                        <Printer size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal 1: Edit Per-Day Salary Rate */}
            {editingEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 animate-scale-in text-left">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-extrabold text-base text-slate-900">Set Per-Day Salary</h3>
                                <p className="text-xs text-slate-500">{editingEmp.name} ({editingEmp.code})</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingEmp(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRate} className="space-y-4 pt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Per-Day Salary (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                    <input 
                                        type="number"
                                        min="0"
                                        required
                                        autoFocus
                                        value={editRateValue}
                                        onChange={(e) => setEditRateValue(e.target.value)}
                                        placeholder="e.g. 1000"
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    This employee has {editingEmp.effectiveDays} present days this month. Calculated salary will be updated to ₹{(Number(editRateValue || 0) * editingEmp.effectiveDays).toLocaleString()}.
                                </p>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    disabled={editSaving}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                                >
                                    {editSaving ? 'Saving...' : 'Save & Recalculate'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingEmp(null)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal 2: View Present Dates Breakdown */}
            {viewDatesEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-scale-in text-left">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-extrabold text-base text-slate-900">Present Dates Breakdown</h3>
                                <p className="text-xs text-slate-500">{viewDatesEmp.name} • {formatMonthName(month)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewDatesEmp(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="py-4 space-y-3">
                            <div className="flex items-center justify-between text-xs bg-blue-50 text-blue-900 p-3 rounded-xl border border-blue-200">
                                <span className="font-bold">Total Present Days:</span>
                                <span className="font-black text-sm">{viewDatesEmp.effectiveDays} Days ({viewDatesEmp.presentCount} Full + {viewDatesEmp.halfDayCount} Half)</span>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                                {viewDatesEmp.presentDates.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-6">No present records clocked in this month.</p>
                                ) : (
                                    viewDatesEmp.presentDates.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={13} className="text-blue-600" />
                                                <span className="font-bold text-slate-800">{new Date(item.date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${item.type === 'Full Day' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {item.type}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setViewDatesEmp(null)}
                                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: Printable Payslip Slip */}
            {payslipEmp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-7 animate-scale-in text-left">
                        {/* Header letterhead */}
                        <div className="flex items-center justify-between pb-5 border-b border-slate-200">
                            <div>
                                <h3 className="font-black text-xl text-slate-900 tracking-tight">Skite CRM</h3>
                                <p className="text-xs text-slate-500 font-medium">Monthly Attendance & Payroll Slip</p>
                            </div>
                            <div className="text-right">
                                <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                                    {formatMonthName(month)}
                                </span>
                            </div>
                        </div>

                        {/* Employee Details Strip */}
                        <div className="grid grid-cols-2 gap-3 py-4 text-xs border-b border-slate-100">
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee Name</span>
                                <span className="font-extrabold text-slate-900 text-sm">{payslipEmp.name}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee ID</span>
                                <span className="font-bold text-slate-800">{payslipEmp.code}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                                <span className="font-bold text-slate-800">{payslipEmp.department}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
                                <span className="font-bold text-slate-800">{payslipEmp.designation}</span>
                            </div>
                        </div>

                        {/* Statutory & Bank Account Strip */}
                        {(payslipEmp.bankName || payslipEmp.accountNumber || payslipEmp.panNumber || payslipEmp.aadharNumber) && (
                            <div className="py-3 px-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs grid grid-cols-2 gap-2.5 my-3">
                                {payslipEmp.panNumber && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">PAN Number</span>
                                        <span className="font-mono font-bold text-slate-800">{payslipEmp.panNumber}</span>
                                    </div>
                                )}
                                {payslipEmp.aadharNumber && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Aadhaar Number</span>
                                        <span className="font-mono font-bold text-slate-800">{payslipEmp.aadharNumber}</span>
                                    </div>
                                )}
                                {payslipEmp.bankName && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Bank Name</span>
                                        <span className="font-bold text-slate-800">{payslipEmp.bankName}</span>
                                    </div>
                                )}
                                {payslipEmp.accountNumber && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Number</span>
                                        <span className="font-mono font-bold text-slate-800">{payslipEmp.accountNumber}</span>
                                    </div>
                                )}
                                {payslipEmp.ifscCode && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">IFSC Code</span>
                                        <span className="font-mono font-bold text-slate-800">{payslipEmp.ifscCode}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Wage Breakdown Table */}
                        <div className="py-4 space-y-2 text-xs">
                            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2">Wage Computation</h4>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                                <span className="text-slate-600">Per-Day Rate:</span>
                                <span className="font-bold text-slate-900">₹{payslipEmp.perDaySalary.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                                <span className="text-slate-600">Verified Present Days:</span>
                                <span className="font-bold text-slate-900">{payslipEmp.effectiveDays} Days ({payslipEmp.presentCount} Full + {payslipEmp.halfDayCount} Half)</span>
                            </div>
                            <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                                <span className="text-slate-600">Approved Leaves:</span>
                                <span className="font-bold text-slate-900">{payslipEmp.onLeaveCount} Days</span>
                            </div>
                            <div className="flex justify-between p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 font-bold mt-2">
                                <span className="text-sm font-extrabold">Net Payable Salary:</span>
                                <span className="text-lg font-black text-blue-700">₹{payslipEmp.calculatedSalary.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">Generated via Skite CRM Payroll System</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                                >
                                    <Printer size={13} />
                                    <span>Print</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayslipEmp(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
