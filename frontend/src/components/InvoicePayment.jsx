import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, Search, CheckCircle, Clock, X, Filter, Calendar, Edit2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { invoicePaymentRows } from '../utils/accountSummary';
import './FinanceLedger.css';
import './AccountsAnalysis.css';

export default function InvoicePayment({ onBack, initialInvoice = null }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search and Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All'); // 'All' | 'With GST' | 'Without GST' | 'Paid' | 'Partial' | 'Unpaid'
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Pagination
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    // Record Payment Modal State
    const [isModalOpen, setIsModalOpen] = useState(Boolean(initialInvoice));
    const [selectedInvoice, setSelectedInvoice] = useState(initialInvoice);
    const [paymentAmount, setPaymentAmount] = useState(() => initialInvoice
        ? String(Math.max(0, Number(initialInvoice.grandTotal || 0) - Number(initialInvoice.paidAmount || 0)))
        : '');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('Bank Transfer');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [submittingPayment, setSubmittingPayment] = useState(false);

    // Inline Payment Date Edit State
    const [editingPaymentDateId, setEditingPaymentDateId] = useState(null);
    const [editingPaymentDateValue, setEditingPaymentDateValue] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, fromDate, toDate]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/invoices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = Array.isArray(res.data) ? res.data : [];
            // Sort by invoiceDate or createdAt desc
            data.sort((a, b) => new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt));
            setInvoices(data);
        } catch (error) {
            console.error('Error fetching invoices for InvoicePayment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLastPaymentDate = async (invoiceId) => {
        if (!editingPaymentDateValue) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/invoices/update-last-payment-date/${invoiceId}`, {
                date: editingPaymentDateValue
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEditingPaymentDateId(null);
            fetchInvoices();
        } catch (error) {
            console.error('Error updating payment date:', error);
            alert('Failed to update payment date');
        }
    };

    const openPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        const currentPaid = invoice.paidAmount || 0;
        const balance = Math.max(0, invoice.grandTotal - currentPaid);
        setPaymentAmount(balance.toString());
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setPaymentMode('Bank Transfer');
        setPaymentNotes('');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedInvoice(null);
        setPaymentAmount('');
    };

    const handleConfirmPayment = async () => {
        const amt = parseFloat(paymentAmount);
        if (isNaN(amt) || amt <= 0) {
            alert('Please enter a valid payment amount greater than zero.');
            return;
        }

        const currentPaid = selectedInvoice.paidAmount || 0;
        const balance = selectedInvoice.grandTotal - currentPaid;
        if (amt > balance + 0.01) {
            alert(`Amount cannot exceed the remaining balance of ₹${balance.toLocaleString('en-IN')}`);
            return;
        }

        try {
            setSubmittingPayment(true);
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/invoices/update-payment/${selectedInvoice._id}`, {
                paidAmount: currentPaid + amt,
                lastPaymentAmount: amt,
                lastPaymentDate: paymentDate || new Date().toISOString(),
                paymentMode: paymentMode,
                notes: paymentNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            closeModal();
            fetchInvoices();
        } catch (error) {
            console.error('Error recording payment:', error);
            alert(error.response?.data?.message || 'Failed to update payment.');
        } finally {
            setSubmittingPayment(false);
        }
    };

    // Filter Logic
    const filteredInvoices = invoices.filter(inv => {
        const clientName = inv.customerId?.customerName || inv.customerId?.companyName || inv.clientDetails?.name || '';
        const invNo = inv.invoiceNumber || inv.invoiceNo || '';
        const q = searchTerm.toLowerCase().trim();

        const matchesSearch = !q || (
            clientName.toLowerCase().includes(q) ||
            invNo.toLowerCase().includes(q)
        );
        if (!matchesSearch) return false;

        // GST filter & status filter
        const isGST = (Number(inv.taxRate) > 0) || (Number(inv.taxGstAmount) > 0);
        const paid = Number(inv.paidAmount) || 0;
        const balance = Math.max(0, (inv.grandTotal || 0) - paid);
        
        let status = 'Unpaid';
        if (balance <= 0.01) status = 'Paid';
        else if (paid > 0) status = 'Partial';

        if (filterType === 'With GST' && !isGST) return false;
        if (filterType === 'Without GST' && isGST) return false;
        if (filterType === 'Paid' && status !== 'Paid') return false;
        if (filterType === 'Partial' && status !== 'Partial') return false;
        if (filterType === 'Unpaid' && status !== 'Unpaid') return false;

        // Date filter (by invoiceDate)
        if (fromDate || toDate) {
            const rawD = inv.invoiceDate || inv.date || inv.createdAt;
            if (rawD) {
                const invD = new Date(rawD);
                invD.setHours(0, 0, 0, 0);
                if (fromDate) {
                    const fD = new Date(fromDate);
                    fD.setHours(0, 0, 0, 0);
                    if (invD < fD) return false;
                }
                if (toDate) {
                    const tD = new Date(toDate);
                    tD.setHours(0, 0, 0, 0);
                    if (invD > tD) return false;
                }
            }
        }

        return true;
    });

    // Summary calculations on filtered data
    const totalGrandAmount = filteredInvoices.reduce((acc, inv) => acc + (Number(inv.grandTotal) || 0), 0);
    const totalDueAmount = filteredInvoices.reduce((acc, inv) => {
        const bal = Math.max(0, (Number(inv.grandTotal) || 0) - (Number(inv.paidAmount) || 0));
        return acc + bal;
    }, 0);

    // Pagination
    const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const paginatedInvoices = filteredInvoices.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    return (
        <div className="accounts-analysis">
            <header className="accounts-analysis-heading">
                <h2>{loading ? 'Invoice payments' : <>₹{totalDueAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span>still to collect</span></>}</h2>
                <button type="button" onClick={onBack || (() => window.history.back())} className="accounts-payment-back"><ArrowLeft size={16} /> Back</button>
            </header>
            <div className="finance-ledger" data-editor-open={Boolean(isModalOpen && selectedInvoice)}>
                <section className="finance-ledger-list accounts-payment-list" aria-labelledby="invoice-payments-title">
                    <header className="finance-ledger-heading">
                        <h2 id="invoice-payments-title">Invoice payments</h2>
                        <p>₹{totalGrandAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} invoiced</p>
                    </header>
            {/* SEARCH & FILTERS TOOLBAR (Matching user's screenshot) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        aria-label="Search invoice payments" placeholder="Search invoices"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    
                    {/* Filter Dropdown */}
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <Filter size={16} className="text-slate-500" />
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                        >
                            <option value="All">All Invoices</option>
                            <option value="With GST">With GST</option>
                            <option value="Without GST">Without GST</option>
                            <option value="Paid">Status: Paid</option>
                            <option value="Partial">Status: Partial</option>
                            <option value="Unpaid">Status: Unpaid</option>
                        </select>
                    </div>

                    {/* Date Filters: From Date & To Date */}
                    <div className="accounts-date-range bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                        <Calendar size={16} className="text-slate-500" />
                        <label>
                            <span className="text-slate-500 font-medium">From:</span>
                            <input 
                                type="date" 
                                value={fromDate} 
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                            />
                        </label>
                        <label>
                            <span className="text-slate-500 font-medium">To:</span>
                            <input 
                                type="date" 
                                value={toDate} 
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                            />
                        </label>
                        {(searchTerm || fromDate || toDate || filterType !== 'All') && (
                            <button 
                                type="button"
                                onClick={() => { setSearchTerm(''); setFromDate(''); setToDate(''); setFilterType('All'); }}
                                className="p-1 rounded-md text-rose-500 hover:bg-rose-50 transition-colors ml-1 cursor-pointer"
                                title="Clear filters"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* TABLE: Exact replica of the user's screenshot */}
            <div className="accounts-payment-table">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                                <th className="p-4 pl-6">INVOICE DATE</th>
                                <th className="p-4">PAYMENT DATE</th>
                                <th className="p-4">INVOICE NO</th>
                                <th className="p-4">CLIENT</th>
                                <th className="p-4">TOTAL</th>
                                <th className="p-4">PAID</th>
                                <th className="p-4">BALANCE</th>
                                <th className="p-4 text-center">STATUS</th>
                                <th className="p-4 pr-6 text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-400 font-medium">
                                        Loading invoice payments...
                                    </td>
                                </tr>
                            ) : paginatedInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="p-12 text-center text-slate-400 font-medium">
                                        No invoices found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((inv) => {
                                    const grandTotal = Number(inv.grandTotal) || 0;
                                    const paid = Number(inv.paidAmount) || 0;
                                    const balance = Math.max(0, grandTotal - paid);

                                    let status = "UNPAID";
                                    let badgeClass = "bg-rose-100 text-rose-800 border-rose-200";
                                    if (balance <= 0.01) {
                                        status = "PAID";
                                        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                                    } else if (paid > 0) {
                                        status = "PARTIAL";
                                        badgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                                    }

                                    // Invoice Date
                                    const invRawDate = inv.invoiceDate || inv.date || inv.createdAt;
                                    const invoiceDateObj = invRawDate ? new Date(invRawDate) : null;
                                    const formattedInvoiceDate = invoiceDateObj && !isNaN(invoiceDateObj.getTime())
                                        ? invoiceDateObj.toLocaleDateString('en-GB')
                                        : '—';

                                    // Payment Date
                                    let paymentDateObj = null;
                                    if (inv.lastPaymentDate) {
                                        paymentDateObj = new Date(inv.lastPaymentDate);
                                    } else if (paid > 0 && invRawDate) {
                                        paymentDateObj = new Date(invRawDate);
                                    }
                                    const formattedPaymentDate = paymentDateObj && !isNaN(paymentDateObj.getTime())
                                        ? paymentDateObj.toLocaleDateString('en-GB')
                                        : '—';

                                    const clientName = inv.customerId?.customerName || inv.customerId?.companyName || inv.clientDetails?.name || 'Client';
                                    const invoiceNum = inv.invoiceNumber || inv.invoiceNo || 'INV';

                                    return (
                                        <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                                            
                                            {/* Invoice Date */}
                                            <td className="p-4 pl-6 text-slate-600">
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <Clock size={14} className="text-slate-400 shrink-0" />
                                                    <span>{formattedInvoiceDate}</span>
                                                </div>
                                            </td>

                                            {/* Payment Date with Inline Edit */}
                                            <td className="p-4 text-slate-600">
                                                <div className="flex items-center gap-1.5 font-medium">
                                                    <Clock size={14} className={paymentDateObj ? 'text-emerald-500 shrink-0' : 'text-slate-400 shrink-0'} />
                                                    {editingPaymentDateId === inv._id ? (
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="date"
                                                                value={editingPaymentDateValue}
                                                                onChange={(e) => setEditingPaymentDateValue(e.target.value)}
                                                                className="px-2 py-0.5 border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none"
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleUpdateLastPaymentDate(inv._id)}
                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                                                title="Save date"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setEditingPaymentDateId(null)}
                                                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                                                                title="Cancel"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className={paymentDateObj ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                                                                {formattedPaymentDate}
                                                            </span>
                                                            {paymentDateObj && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingPaymentDateId(inv._id);
                                                                        setEditingPaymentDateValue(paymentDateObj.toISOString().split('T')[0]);
                                                                    }}
                                                                    className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors ml-1 cursor-pointer"
                                                                    title="Edit Payment Date"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Invoice No */}
                                            <td className="p-4 font-mono font-bold text-blue-600">
                                                {invoiceNum}
                                            </td>

                                            {/* Client Name */}
                                            <td className="p-4 font-bold text-slate-900 max-w-xs truncate">
                                                {clientName}
                                            </td>

                                            {/* Total */}
                                            <td className="p-4 font-bold text-slate-900">
                                                ₹ {grandTotal.toLocaleString('en-IN')}
                                            </td>

                                            {/* Paid */}
                                            <td className="p-4 font-bold text-[#3f3f3f]">
                                                ₹ {paid.toLocaleString('en-IN')}
                                            </td>

                                            {/* Balance */}
                                            <td className={`p-4 font-bold ${balance > 0 ? 'text-[#a8320d]' : 'text-slate-700'}`}>
                                                ₹ {balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${badgeClass}`}>
                                                    {status}
                                                </span>
                                            </td>

                                            {/* Action Button: Add Payment or Completed */}
                                            <td className="p-4 pr-6 text-center">
                                                {balance > 0.01 ? (
                                                    <button 
                                                        type="button"
                                                        onClick={() => openPaymentModal(inv)}
                                                        className="finance-ledger-primary whitespace-nowrap"
                                                    >
                                                        Add Payment
                                                    </button>
                                                ) : (
                                                    <span className="text-[#3f3f3f] inline-flex items-center gap-1.5 font-bold text-xs">
                                                        <CheckCircle size={15} />
                                                        <span>Completed</span>
                                                    </span>
                                                )}
                                            </td>

                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 15 Records Pagination */}
                {filteredInvoices.length > PAGE_SIZE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-900">{(validPage - 1) * PAGE_SIZE + 1}</strong>–<strong className="text-slate-900">{Math.min(validPage * PAGE_SIZE, filteredInvoices.length)}</strong> of <strong className="text-slate-900">{filteredInvoices.length}</strong> invoices
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={validPage <= 1}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <span className="px-2 text-xs font-bold text-blue-600">
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

                </section>
                {isModalOpen && selectedInvoice && (() => {
                    const paid = Number(selectedInvoice.paidAmount) || 0;
                    const balance = Math.max(0, (Number(selectedInvoice.grandTotal) || 0) - paid);
                    const name = selectedInvoice.customerId?.customerName || selectedInvoice.customerId?.companyName || selectedInvoice.clientDetails?.name || 'Client';
                    const records = invoicePaymentRows(selectedInvoice);
                    return (
                        <section className="finance-ledger-editor accounts-payment-editor" data-tone="dark" aria-labelledby="invoice-payment-editor">
                            <header className="finance-ledger-heading">
                                <div><h2 id="invoice-payment-editor">{name}</h2><p>{selectedInvoice.invoiceNumber || selectedInvoice.invoiceNo}</p></div>
                                <button type="button" onClick={closeModal} aria-label="Close record payment"><X size={17} /></button>
                            </header>
                            <dl className="finance-purchase-totals"><div><dt>Pending balance</dt><dd>₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</dd></div></dl>
                            {records.length > 0 && <ul className="accounts-payment-history" aria-label="Recorded payments">
                                {records.map(row => <li key={row.key}><span>{row.date ? new Date(row.date).toLocaleDateString('en-IN') : '—'}</span><strong>₹{row.amount.toLocaleString('en-IN')}</strong></li>)}
                            </ul>}
                            <form onSubmit={event => { event.preventDefault(); handleConfirmPayment(); }}>
                                <h3>Record payment</h3>
                                <label>Amount received (₹)
                                    <input name="paymentAmount" type="number" step="any" autoFocus value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                                </label>
                                <div className="accounts-analysis-pills">
                                    <button type="button" onClick={() => setPaymentAmount(String(balance))}>Full balance</button>
                                    {balance > 1000 && <button type="button" onClick={() => setPaymentAmount(String(Math.round(balance / 2)))}>50%</button>}
                                </div>
                                <div className="finance-ledger-fields">
                                    <label>Payment date<input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></label>
                                    <label>Payment mode<select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                                        <option value="Bank Transfer">Bank transfer / NEFT / IMPS</option>
                                        <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                                        <option value="Cash">Cash</option><option value="Cheque">Cheque</option>
                                    </select></label>
                                </div>
                                <label>Notes<input value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Transaction reference or remarks" /></label>
                                <footer>
                                    <button type="button" onClick={closeModal}>Cancel</button>
                                    <button type="submit" className="finance-ledger-primary" disabled={submittingPayment}>{submittingPayment ? 'Processing…' : 'Confirm payment'}</button>
                                </footer>
                            </form>
                        </section>
                    );
                })()}
            </div>
        </div>
    );
}
