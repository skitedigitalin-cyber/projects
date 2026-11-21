import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { invoicePaymentRows } from '../utils/accountSummary';
import { 
    ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, FileText, 
    CheckCircle, Filter, Edit2, Check, X, Calendar, DollarSign,
    RefreshCw, IndianRupee, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function IncomeExpense({ onRecordsChange } = {}) {
    const [invoices, setInvoices] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [manualIncomes, setManualIncomes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const PAGE_SIZE = 15;
    const [incomePage, setIncomePage] = useState(1);
    const [expensePage, setExpensePage] = useState(1);

    // Editing states for inline date change
    const [editingPayment, setEditingPayment] = useState(null); // { invoiceId, paymentIndex, date, isLegacy }
    const [editingTransaction, setEditingTransaction] = useState(null); // { id, date }

    // Date Filter (default: All Time so all historical & migrated records are visible immediately)
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    // Quick add forms
    const [incomeForm, setIncomeForm] = useState({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [submittingIncome, setSubmittingIncome] = useState(false);
    const [submittingExpense, setSubmittingExpense] = useState(false);

    const getHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, payRes] = await Promise.all([
                axios.get('http://localhost:5000/api/invoices', getHeaders()),
                axios.get('http://localhost:5000/api/payments', getHeaders()).catch(() => ({ data: [], failed: true }))
            ]);

            const invData = Array.isArray(invRes.data) ? invRes.data : [];
            setInvoices(invData);

            const payData = Array.isArray(payRes.data) ? payRes.data : [];
            onRecordsChange?.(payRes.failed ? { failed: true } : { invoices: invData, payments: payData });
            // Separate outward (expense) vs inward manual income
            setExpenses(payData.filter(t => t.paymentType === 'Outward'));
            setManualIncomes(payData.filter(t => t.paymentType === 'Inward' && t.category !== 'Customer Payment'));
        } catch (err) {
            onRecordsChange?.({ failed: true });
            console.error('Error fetching income/expense data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setIncomePage(1);
        setExpensePage(1);
    }, [dateFilter.from, dateFilter.to]);

    // Helper: Filter generic array by date
    const filterByDate = (data) => {
        if (!dateFilter.from || !dateFilter.to) return data;
        const from = new Date(dateFilter.from).setHours(0, 0, 0, 0);
        const to = new Date(dateFilter.to).setHours(23, 59, 59, 999);
        return data.filter(item => {
            const rawDate = item.paymentDate || item.date || item.createdAt;
            const itemDate = new Date(rawDate).getTime();
            return itemDate >= from && itemDate <= to;
        });
    };

    // Extract individual payment rows from invoices (supports both payments array & legacy paidAmount)
    const getFilteredPaymentRows = () => {
        const hasFilter = Boolean(dateFilter.from && dateFilter.to);
        const from = hasFilter ? new Date(dateFilter.from).setHours(0, 0, 0, 0) : null;
        const to = hasFilter ? new Date(dateFilter.to).setHours(23, 59, 59, 999) : null;

        return invoices.flatMap(invoicePaymentRows).filter(row => {
            if (!hasFilter) return true;
            const date = new Date(row.date).getTime();
            return date >= from && date <= to;
        });
    };

    const filteredPaymentRows = getFilteredPaymentRows();
    const filteredExpenses = filterByDate(expenses);
    const filteredManualIncomes = filterByDate(manualIncomes);

    // Combine all income sources and sort newest first
    const allIncomeRows = [
        ...filteredPaymentRows.map(row => ({
            ...row,
            rowType: 'invoice',
            normalizedDate: row.date
        })),
        ...filteredManualIncomes.map(inc => ({
            key: inc._id,
            _id: inc._id,
            rowType: 'manual',
            clientName: inc.notes || 'Direct Income',
            amount: Number(inc.amount || 0),
            date: inc.paymentDate || inc.createdAt,
            normalizedDate: inc.paymentDate || inc.createdAt,
            rawItem: inc
        }))
    ].sort((a, b) => new Date(b.normalizedDate || 0) - new Date(a.normalizedDate || 0));

    // Sort expenses newest first
    const sortedExpenses = [...filteredExpenses].sort((a, b) => {
        const dateA = new Date(a.paymentDate || a.date || a.createdAt || 0).getTime();
        const dateB = new Date(b.paymentDate || b.date || b.createdAt || 0).getTime();
        return dateB - dateA;
    });

    // Pagination calculations (15 records per page)
    const totalIncomePages = Math.ceil(allIncomeRows.length / PAGE_SIZE) || 1;
    const validIncomePage = Math.min(Math.max(1, incomePage), totalIncomePages);
    const paginatedIncomeRows = allIncomeRows.slice((validIncomePage - 1) * PAGE_SIZE, validIncomePage * PAGE_SIZE);

    const totalExpensePages = Math.ceil(sortedExpenses.length / PAGE_SIZE) || 1;
    const validExpensePage = Math.min(Math.max(1, expensePage), totalExpensePages);
    const paginatedExpenses = sortedExpenses.slice((validExpensePage - 1) * PAGE_SIZE, validExpensePage * PAGE_SIZE);

    // Summary Calculations
    const invoiceIncomeTotal = filteredPaymentRows.reduce((acc, row) => acc + (row.amount || 0), 0);
    const manualIncomeTotal = filteredManualIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalIncome = invoiceIncomeTotal + manualIncomeTotal;
    const totalExpense = filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;

    // Quick Add Manual Income
    const handleAddIncome = async (e) => {
        e.preventDefault();
        if (!incomeForm.description || !incomeForm.amount) return;
        try {
            setSubmittingIncome(true);
            const payload = {
                paymentType: 'Inward',
                category: 'Direct Income',
                notes: incomeForm.description,
                amount: Number(incomeForm.amount),
                paymentDate: incomeForm.date,
                paymentMode: 'Cash'
            };
            await axios.post('http://localhost:5000/api/payments', payload, getHeaders());
            setIncomeForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (err) {
            console.error('Error adding income:', err);
            alert('Failed to add income');
        } finally {
            setSubmittingIncome(false);
        }
    };

    // Quick Add Manual Expense
    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.description || !expenseForm.amount) return;
        try {
            setSubmittingExpense(true);
            const payload = {
                paymentType: 'Outward',
                category: 'Direct Expense',
                notes: expenseForm.description,
                amount: Number(expenseForm.amount),
                paymentDate: expenseForm.date,
                paymentMode: 'Cash'
            };
            await axios.post('http://localhost:5000/api/payments', payload, getHeaders());
            setExpenseForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (err) {
            console.error('Error adding expense:', err);
            alert('Failed to add expense');
        } finally {
            setSubmittingExpense(false);
        }
    };

    // Update Invoice Payment Date
    const handleUpdateInvoicePaymentDate = async (invoiceId, paymentIndex, newDate, isLegacy) => {
        try {
            if (isLegacy) {
                await axios.put(`http://localhost:5000/api/invoices/update-last-payment-date/${invoiceId}`, {
                    date: newDate
                }, getHeaders());
            } else {
                await axios.put(`http://localhost:5000/api/invoices/${invoiceId}/payment/${paymentIndex}/date`, {
                    date: newDate
                }, getHeaders());
            }
            setEditingPayment(null);
            fetchData();
        } catch (err) {
            console.error('Failed to update invoice payment date:', err);
            alert('Failed to update date');
        }
    };

    // Update Transaction Date (Manual Income / Expense)
    const handleUpdateTransactionDate = async (id, newDate) => {
        try {
            await axios.put(`http://localhost:5000/api/payments/${id}/date`, { date: newDate }, getHeaders());
            setEditingTransaction(null);
            fetchData();
        } catch (err) {
            console.error('Failed to update transaction date:', err);
            alert('Failed to update date');
        }
    };

    // Delete Manual Transaction
    const handleDeleteTransaction = async (id) => {
        if (!window.confirm('Delete this transaction record?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/payments/${id}`, getHeaders());
            fetchData();
        } catch (err) {
            console.error('Failed to delete transaction:', err);
            alert('Error deleting transaction');
        }
    };

    // Delete Invoice Payment Entry
    const handleDeleteInvoicePayment = async (invoiceId, paymentIndex) => {
        if (!window.confirm('Delete this payment entry? This will reverse the amount and update the invoice balance.')) return;
        try {
            await axios.delete(`http://localhost:5000/api/invoices/${invoiceId}/payment/${paymentIndex}`, getHeaders());
            fetchData();
        } catch (err) {
            console.error('Failed to delete invoice payment:', err);
            alert('Failed to delete payment');
        }
    };

    // Quick Date Filters
    const setQuickFilter = (type) => {
        const today = new Date().toISOString().split('T')[0];
        if (type === 'THIS_MONTH') {
            setDateFilter({
                from: new Date().toISOString().slice(0, 8) + '01',
                to: today
            });
        } else if (type === 'TODAY') {
            setDateFilter({ from: today, to: today });
        } else if (type === 'ALL') {
            setDateFilter({ from: '', to: '' });
        }
    };

    return (
        <div className="accounts-ledger space-y-6">
            {/* TOP HEADER & SUMMARY CARD */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-[#e6e6e3] shadow-xs">
                <div>
                    <h2 className="text-xl font-black text-[#111111] tracking-tight">Accounts Overview</h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Live real-time income from invoices & manual entries vs operational expenses
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="px-5 py-3 rounded-2xl bg-[#f5f5f3] border border-[#e6e6e3] text-right">
                        <span className="text-[11px] font-bold text-[#595959] uppercase tracking-wider block">Total Revenue</span>
                        <h4 className="text-xl font-black text-[#111111] font-mono">₹{totalIncome.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="px-5 py-3 rounded-2xl bg-[#f5f5f3] border border-[#e6e6e3] text-right">
                        <span className="text-[11px] font-bold text-[#595959] uppercase tracking-wider block">Total Expense</span>
                        <h4 className="text-xl font-black text-[#111111] font-mono">₹{totalExpense.toLocaleString('en-IN')}</h4>
                    </div>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="p-4 bg-white rounded-2xl border border-[#e6e6e3] flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Filter size={16} className="text-[#3f3f3f]" />
                        <span>Filter by Date:</span>
                    </div>

                    <div className="accounts-date-range text-xs">
                        <label className="text-slate-600 font-medium"><span>From:</span>
                            <input
                                type="date"
                                value={dateFilter.from}
                                onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                                className="px-2.5 py-1.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl font-bold text-slate-800 outline-none focus:border-[#111111]"
                            />

                        </label>
                        <label className="text-slate-600 font-medium"><span>To:</span>
                            <input
                                type="date"
                                value={dateFilter.to}
                                onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                                className="px-2.5 py-1.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl font-bold text-slate-800 outline-none focus:border-[#111111]"
                            />
                        </label>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-[#f0f0ee] p-1 rounded-xl text-xs font-bold">
                    <button 
                        type="button"
                        onClick={() => setQuickFilter('THIS_MONTH')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            dateFilter.from === new Date().toISOString().slice(0, 8) + '01' ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-600 hover:text-[#111111]'
                        }`}
                    >
                        This Month
                    </button>
                    <button 
                        type="button"
                        onClick={() => setQuickFilter('TODAY')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            dateFilter.from === new Date().toISOString().split('T')[0] && dateFilter.to === new Date().toISOString().split('T')[0] ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-600 hover:text-[#111111]'
                        }`}
                    >
                        Today
                    </button>
                    <button 
                        type="button"
                        onClick={() => setQuickFilter('ALL')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            !dateFilter.from && !dateFilter.to ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-600 hover:text-[#111111]'
                        }`}
                    >
                        All Time
                    </button>
                </div>
            </div>

            {/* TWO-COLUMN GRID: LEFT INCOME | RIGHT EXPENSE */}
            <div className="accounts-ledger-columns">

                {/* ========================================================
                   LEFT COLUMN: INCOME (GREEN)
                ======================================================== */}
                <div className="bg-white rounded-3xl border border-[#e6e6e3] shadow-xs overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="accounts-ledger-heading" data-flow="income">
                        <div className="flex items-center gap-2.5">
                            <div className="accounts-ledger-direction">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-tight">
                                    Cash in Hand: ₹{netBalance.toLocaleString('en-IN')}
                                </h3>
                                <span className="text-[11px] text-[#d4d4d4] font-medium">(Income - Expense)</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-[#d4d4d4] block uppercase font-bold tracking-wider">Total Income</span>
                            <span className="font-mono font-black text-sm">₹{totalIncome.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Quick Add Income Form */}
                        <form onSubmit={handleAddIncome} className="accounts-ledger-entry space-y-2">
                            <span className="text-[10px] font-black uppercase text-[#595959] tracking-wider block">
                                + Log Direct / Other Income
                            </span>
                            <div className="accounts-ledger-fields">
                                <input 
                                    type="date" 
                                    required
                                    value={incomeForm.date} 
                                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                                    className="w-full min-w-0 px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#111111]"
                                />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Income Description (e.g. Consulting, Freelance)"
                                    value={incomeForm.description}
                                    onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                                    className="w-full min-w-0 px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#111111]"
                                />
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    placeholder="Amount (₹)"
                                    value={incomeForm.amount}
                                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                                    className="w-full min-w-0 px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl text-xs font-bold font-mono text-[#111111] outline-none focus:border-[#111111]"
                                />
                                <button 
                                    type="submit" 
                                    disabled={submittingIncome}
                                    className="accounts-ledger-add"
                                    title="Add Income"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </form>

                        {/* Income Sources List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    Income Sources ({allIncomeRows.length})
                                </h4>
                                <span className="text-[11px] text-slate-400 font-medium">Auto Invoices + Manual Incomes</span>
                            </div>

                            <div className="workspace-scroll-list max-h-[520px] overflow-y-auto space-y-2">
                                {loading ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading income streams...</div>
                                ) : allIncomeRows.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                        No income records in the selected date range.
                                    </div>
                                ) : (
                                    paginatedIncomeRows.map(item => {
                                        if (item.rowType === 'invoice') {
                                            const row = item;
                                            return (
                                                <div key={row.key} className="accounts-ledger-row p-3 bg-white hover:bg-[#f5f5f3] border border-[#e6e6e3] rounded-2xl transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl workspace-status-success flex items-center justify-center shrink-0">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-[#111111] flex flex-wrap items-center gap-1.5">
                                                                <span>{row.clientName}</span>
                                                                {row.invoiceNumber && (
                                                                    <span className="text-[10px] text-emerald-700 font-mono font-bold bg-emerald-100/70 px-1.5 py-0.2 rounded">
                                                                        {row.invoiceNumber}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Payment Date with Inline Edit */}
                                                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                                {editingPayment?.invoiceId === row.invoiceId && editingPayment?.paymentIndex === row.paymentIndex ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input 
                                                                            type="date"
                                                                            value={editingPayment.date}
                                                                            onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })}
                                                                            className="px-1.5 py-0.5 border border-emerald-300 rounded text-[11px] font-bold text-slate-800 bg-white"
                                                                        />
                                                                        <button 
                                                                            onClick={() => handleUpdateInvoicePaymentDate(row.invoiceId, row.paymentIndex, editingPayment.date, row.isLegacy)}
                                                                            className="text-emerald-600 hover:text-emerald-800 p-0.5 cursor-pointer"
                                                                            title="Save Date"
                                                                        >
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setEditingPayment(null)}
                                                                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                                                            title="Cancel"
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <Calendar size={12} className="text-slate-400" />
                                                                        <span>
                                                                            {row.date ? new Date(row.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                                        </span>
                                                                        <button 
                                                                            onClick={() => setEditingPayment({
                                                                                invoiceId: row.invoiceId,
                                                                                paymentIndex: row.paymentIndex,
                                                                                date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
                                                                                isLegacy: row.isLegacy
                                                                            })}
                                                                            className="text-slate-400 hover:text-emerald-600 p-0.5 ml-0.5 cursor-pointer"
                                                                            title="Edit Date"
                                                                        >
                                                                            <Edit2 size={11} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-semibold text-sm accounts-ledger-inflow">
                                                            + ₹{row.amount.toLocaleString('en-IN')}
                                                        </span>

                                                        {/* Delete only for non-legacy array entries */}
                                                        {!row.isLegacy && (
                                                            <button 
                                                                onClick={() => handleDeleteInvoicePayment(row.invoiceId, row.paymentIndex)}
                                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                                title="Delete Payment Entry"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // 2. Manual Incomes
                                        const inc = item.rawItem || item;
                                        return (
                                            <div key={inc._id} className="accounts-ledger-row p-3 bg-white hover:bg-[#f5f5f3] border border-[#e6e6e3] rounded-2xl transition-colors">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-[#e6e6e3] text-[#111111] flex items-center justify-center shrink-0">
                                                        <CheckCircle size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-xs text-[#111111]">{inc.notes || 'Direct Income'}</div>
                                                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                            {editingTransaction?.id === inc._id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <input 
                                                                        type="date"
                                                                        value={editingTransaction.date}
                                                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                                                                        className="px-1.5 py-0.5 border border-blue-300 rounded text-[11px] font-bold text-slate-800 bg-white"
                                                                    />
                                                                    <button 
                                                                        onClick={() => handleUpdateTransactionDate(inc._id, editingTransaction.date)}
                                                                        className="text-[#3f3f3f] hover:text-[#111111] p-0.5 cursor-pointer"
                                                                        title="Save Date"
                                                                    >
                                                                        <Check size={14} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setEditingTransaction(null)}
                                                                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                                                        title="Cancel"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Calendar size={12} className="text-slate-400" />
                                                                    <span>
                                                                        {inc.paymentDate ? new Date(inc.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => setEditingTransaction({
                                                                            id: inc._id,
                                                                            date: inc.paymentDate ? new Date(inc.paymentDate).toISOString().split('T')[0] : ''
                                                                        })}
                                                                        className="text-slate-400 hover:text-[#3f3f3f] p-0.5 ml-0.5 cursor-pointer"
                                                                        title="Edit Date"
                                                                    >
                                                                        <Edit2 size={11} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-semibold text-sm accounts-ledger-inflow">
                                                        + ₹{Number(inc.amount || 0).toLocaleString('en-IN')}
                                                    </span>
                                                    <button 
                                                        onClick={() => handleDeleteTransaction(inc._id)}
                                                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Income Entry"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* 15 Records Pagination for Income */}
                            {allIncomeRows.length > PAGE_SIZE && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100">
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        Showing <strong className="text-slate-800">{(validIncomePage - 1) * PAGE_SIZE + 1}</strong>–<strong className="text-slate-800">{Math.min(validIncomePage * PAGE_SIZE, allIncomeRows.length)}</strong> of <strong className="text-slate-800">{allIncomeRows.length}</strong>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            type="button"
                                            onClick={() => setIncomePage(p => Math.max(1, p - 1))}
                                            disabled={validIncomePage <= 1}
                                            className="px-2.5 py-1 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            <ChevronLeft size={13} /> Prev
                                        </button>
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs">
                                            {validIncomePage} / {totalIncomePages}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => setIncomePage(p => Math.min(totalIncomePages, p + 1))}
                                            disabled={validIncomePage >= totalIncomePages}
                                            className="px-2.5 py-1 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            Next <ChevronRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ========================================================
                   RIGHT COLUMN: EXPENSE (ROSE / RED)
                ======================================================== */}
                <div className="bg-white rounded-3xl border border-[#e6e6e3] shadow-xs overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="accounts-ledger-heading" data-flow="expense">
                        <div className="flex items-center gap-2.5">
                            <div className="accounts-ledger-direction">
                                <TrendingDown size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-tight">
                                    Total Expense: ₹{totalExpense.toLocaleString('en-IN')}
                                </h3>
                                <span className="text-[11px] text-[#595959] font-medium">Recorded Operational Outflows</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-[#595959] block uppercase font-bold tracking-wider">Entries Count</span>
                            <span className="font-mono font-black text-sm">{filteredExpenses.length} Records</span>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Quick Add Expense Form */}
                        <form onSubmit={handleAddExpense} className="accounts-ledger-entry space-y-2">
                            <span className="text-[10px] font-black uppercase text-[#595959] tracking-wider block">
                                - Log Operational Expense
                            </span>
                            <div className="accounts-ledger-fields">
                                <input 
                                    type="date" 
                                    required
                                    value={expenseForm.date} 
                                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                    className="w-full min-w-0 px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#111111]"
                                />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Expense Description (e.g. Office Rent, Electricity)"
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full min-w-0 px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#111111]"
                                />
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    placeholder="Amount (₹)"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full min-w-0 px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl text-xs font-bold font-mono text-[#111111] outline-none focus:border-[#111111]"
                                />
                                <button 
                                    type="submit" 
                                    disabled={submittingExpense}
                                    className="accounts-ledger-add"
                                    title="Add Expense"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </form>

                        {/* Expense List */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                    Expense List ({filteredExpenses.length})
                                </h4>
                                <span className="text-[11px] text-slate-400 font-medium">All recorded outward payouts</span>
                            </div>

                            <div className="workspace-scroll-list max-h-[520px] overflow-y-auto space-y-2">
                                {loading ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading expenses...</div>
                                ) : sortedExpenses.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                        No expenses recorded in the selected date range.
                                    </div>
                                ) : (
                                    paginatedExpenses.map(exp => (
                                        <div key={exp._id} className="accounts-ledger-row p-3 bg-white hover:bg-[#f5f5f3] border border-[#e6e6e3] rounded-2xl transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl workspace-status-danger flex items-center justify-center shrink-0">
                                                    <TrendingDown size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-[#111111]">
                                                        {exp.notes || exp.vendorId?.vendorName || 'Operational Expense'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                        {editingTransaction?.id === exp._id ? (
                                                            <div className="flex items-center gap-1">
                                                                <input 
                                                                    type="date"
                                                                    value={editingTransaction.date}
                                                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                                                                    className="px-1.5 py-0.5 border border-rose-300 rounded text-[11px] font-bold text-slate-800 bg-white"
                                                                />
                                                                <button 
                                                                    onClick={() => handleUpdateTransactionDate(exp._id, editingTransaction.date)}
                                                                    className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer"
                                                                    title="Save Date"
                                                                >
                                                                    <Check size={14} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => setEditingTransaction(null)}
                                                                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                                                    title="Cancel"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Calendar size={12} className="text-slate-400" />
                                                                <span>
                                                                    {exp.paymentDate ? new Date(exp.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                                </span>
                                                                <button 
                                                                    onClick={() => setEditingTransaction({
                                                                        id: exp._id,
                                                                        date: exp.paymentDate ? new Date(exp.paymentDate).toISOString().split('T')[0] : ''
                                                                    })}
                                                                    className="text-slate-400 hover:text-rose-600 p-0.5 ml-0.5 cursor-pointer"
                                                                    title="Edit Date"
                                                                >
                                                                    <Edit2 size={11} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-semibold text-sm accounts-ledger-outflow">
                                                    - ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                                                </span>
                                                <button 
                                                    onClick={() => handleDeleteTransaction(exp._id)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Delete Expense Entry"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* 15 Records Pagination for Expenses */}
                            {sortedExpenses.length > PAGE_SIZE && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100">
                                    <span className="text-[11px] font-semibold text-slate-500">
                                        Showing <strong className="text-slate-800">{(validExpensePage - 1) * PAGE_SIZE + 1}</strong>–<strong className="text-slate-800">{Math.min(validExpensePage * PAGE_SIZE, sortedExpenses.length)}</strong> of <strong className="text-slate-800">{sortedExpenses.length}</strong>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            type="button"
                                            onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                                            disabled={validExpensePage <= 1}
                                            className="px-2.5 py-1 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            <ChevronLeft size={13} /> Prev
                                        </button>
                                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-xs">
                                            {validExpensePage} / {totalExpensePages}
                                        </span>
                                        <button 
                                            type="button"
                                            onClick={() => setExpensePage(p => Math.min(totalExpensePages, p + 1))}
                                            disabled={validExpensePage >= totalExpensePages}
                                            className="px-2.5 py-1 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            Next <ChevronRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
