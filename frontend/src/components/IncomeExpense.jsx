import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, FileText, 
    CheckCircle, Filter, Edit2, Check, X, Calendar, DollarSign,
    RefreshCw, IndianRupee, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function IncomeExpense() {
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
                axios.get('http://localhost:5000/api/payments', getHeaders()).catch(() => ({ data: [] }))
            ]);

            const invData = Array.isArray(invRes.data) ? invRes.data : [];
            setInvoices(invData);

            const payData = Array.isArray(payRes.data) ? payRes.data : [];
            // Separate outward (expense) vs inward manual income
            setExpenses(payData.filter(t => t.paymentType === 'Outward'));
            setManualIncomes(payData.filter(t => t.paymentType === 'Inward' && t.category !== 'Customer Payment'));
        } catch (err) {
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

        return invoices.flatMap(inv => {
            const clientName = inv.customerId?.customerName || inv.customerId?.companyName || inv.clientDetails?.name || 'Customer';
            const invNo = inv.invoiceNumber || '';
            const history = inv.payments || inv.paymentHistory || [];

            // Case 1: Multiple individual payments in history
            if (history.length > 0) {
                return history
                    .map((payment, i) => ({
                        key: `${inv._id}-${i}`,
                        invoiceId: inv._id,
                        invoiceNumber: invNo,
                        paymentIndex: i,
                        clientName,
                        amount: Number(payment.amount) || 0,
                        date: payment.paymentDate || payment.date || inv.lastPaymentDate || inv.invoiceDate,
                        isLegacy: false
                    }))
                    .filter(row => {
                        if (row.amount <= 0) return false;
                        if (!hasFilter) return true;
                        const pDate = new Date(row.date).getTime();
                        return pDate >= from && pDate <= to;
                    });
            }

            // Case 2: Legacy invoice with paidAmount > 0 (single lump sum)
            if ((Number(inv.paidAmount) || 0) > 0) {
                const rawDate = inv.lastPaymentDate || inv.invoiceDate || inv.date || inv.createdAt;
                const pDate = new Date(rawDate).getTime();
                const matchesDate = !hasFilter || (pDate >= from && pDate <= to);

                if (matchesDate) {
                    return [{
                        key: inv._id,
                        invoiceId: inv._id,
                        invoiceNumber: invNo,
                        paymentIndex: -1,
                        clientName,
                        amount: Number(inv.paidAmount) || 0,
                        date: rawDate,
                        isLegacy: true
                    }];
                }
            }

            return [];
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
        <div className="space-y-6 text-slate-800">
            {/* TOP HEADER & SUMMARY CARD */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Accounts Overview</h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Live real-time income from invoices & manual entries vs operational expenses
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-5 py-3 rounded-2xl bg-sky-50 border border-sky-200 text-right">
                        <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider block">Total Revenue</span>
                        <h4 className="text-xl font-black text-sky-950 font-mono">₹{totalIncome.toLocaleString('en-IN')}</h4>
                    </div>
                    <div className="px-5 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-right">
                        <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Total Expense</span>
                        <h4 className="text-xl font-black text-rose-950 font-mono">₹{totalExpense.toLocaleString('en-IN')}</h4>
                    </div>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Filter size={16} className="text-blue-600" />
                        <span>Filter by Date:</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <label className="text-slate-400 font-medium text-[11px]">From:</label>
                        <input 
                            type="date" 
                            value={dateFilter.from} 
                            onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500"
                        />

                        <label className="text-slate-400 font-medium text-[11px] ml-1">To:</label>
                        <input 
                            type="date" 
                            value={dateFilter.to} 
                            onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button 
                        type="button"
                        onClick={() => setQuickFilter('THIS_MONTH')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            dateFilter.from === new Date().toISOString().slice(0, 8) + '01' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        This Month
                    </button>
                    <button 
                        type="button"
                        onClick={() => setQuickFilter('TODAY')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            dateFilter.from === new Date().toISOString().split('T')[0] && dateFilter.to === new Date().toISOString().split('T')[0] ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Today
                    </button>
                    <button 
                        type="button"
                        onClick={() => setQuickFilter('ALL')}
                        className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            !dateFilter.from && !dateFilter.to ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        All Time
                    </button>
                </div>
            </div>

            {/* TWO-COLUMN GRID: LEFT INCOME | RIGHT EXPENSE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* ========================================================
                   LEFT COLUMN: INCOME (GREEN)
                ======================================================== */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <TrendingUp size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-tight">
                                    Cash in Hand: ₹{netBalance.toLocaleString('en-IN')}
                                </h3>
                                <span className="text-[11px] text-emerald-100 font-medium">(Income - Expense)</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-emerald-200 block uppercase font-bold tracking-wider">Total Income</span>
                            <span className="font-mono font-black text-sm">₹{totalIncome.toLocaleString('en-IN')}</span>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Quick Add Income Form */}
                        <form onSubmit={handleAddIncome} className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                            <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider block">
                                + Log Direct / Other Income
                            </span>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                <input 
                                    type="date" 
                                    required
                                    value={incomeForm.date} 
                                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                                    className="w-full sm:w-32 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500"
                                />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Income Description (e.g. Consulting, Freelance)"
                                    value={incomeForm.description}
                                    onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                                    className="w-full sm:flex-1 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                                />
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    placeholder="Amount (₹)"
                                    value={incomeForm.amount}
                                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                                    className="w-full sm:w-28 px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:border-emerald-500"
                                />
                                <button 
                                    type="submit" 
                                    disabled={submittingIncome}
                                    className="w-full sm:w-auto p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center shrink-0"
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

                            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
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
                                                <div key={row.key} className="p-3 bg-emerald-50/30 hover:bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center justify-between transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
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
                                                        <span className="font-mono font-black text-sm text-emerald-600">
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
                                            <div key={inc._id} className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-colors">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                                        <CheckCircle size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-xs text-slate-900">{inc.notes || 'Direct Income'}</div>
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
                                                                        className="text-blue-600 hover:text-blue-800 p-0.5 cursor-pointer"
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
                                                                        className="text-slate-400 hover:text-blue-600 p-0.5 ml-0.5 cursor-pointer"
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
                                                    <span className="font-mono font-black text-sm text-emerald-600">
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
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
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
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
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
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <TrendingDown size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-tight">
                                    Total Expense: ₹{totalExpense.toLocaleString('en-IN')}
                                </h3>
                                <span className="text-[11px] text-rose-100 font-medium">Recorded Operational Outflows</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-rose-200 block uppercase font-bold tracking-wider">Entries Count</span>
                            <span className="font-mono font-black text-sm">{filteredExpenses.length} Records</span>
                        </div>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Quick Add Expense Form */}
                        <form onSubmit={handleAddExpense} className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2">
                            <span className="text-[10px] font-black uppercase text-rose-800 tracking-wider block">
                                - Log Operational Expense
                            </span>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                <input 
                                    type="date" 
                                    required
                                    value={expenseForm.date} 
                                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                    className="w-full sm:w-32 px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                                />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Expense Description (e.g. Office Rent, Electricity)"
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full sm:flex-1 px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-rose-500"
                                />
                                <input 
                                    type="number" 
                                    required
                                    min="1"
                                    placeholder="Amount (₹)"
                                    value={expenseForm.amount}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    className="w-full sm:w-28 px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:border-rose-500"
                                />
                                <button 
                                    type="submit" 
                                    disabled={submittingExpense}
                                    className="w-full sm:w-auto p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center shrink-0"
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

                            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {loading ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading expenses...</div>
                                ) : sortedExpenses.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                        No expenses recorded in the selected date range.
                                    </div>
                                ) : (
                                    paginatedExpenses.map(exp => (
                                        <div key={exp._id} className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-colors">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                                                    <TrendingDown size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-xs text-slate-900">
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
                                                <span className="font-mono font-black text-sm text-rose-600">
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
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
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
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
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
