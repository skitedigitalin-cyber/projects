import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
    Plus, Search, CreditCard, ArrowDownLeft, X, Building, User, 
    Download, Eye, Trash2, Receipt, CheckCircle2, TrendingUp, IndianRupee, 
    Calendar, Share2, Sparkles, Filter, FileText
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PaymentReceiptModal from './PaymentReceiptModal';
import { generatePaymentReceiptPdf } from '../utils/paymentReceiptPdfGenerator';

export default function PaymentManagement() {
    const { user } = useContext(AuthContext);
    const [receipts, setReceipts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [customerInvoices, setCustomerInvoices] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [modeFilter, setModeFilter] = useState('All');
    const [loading, setLoading] = useState(false);

    // Company branding details for PDF receipts
    const [company, setCompany] = useState({
        name: user?.companyName || 'SKITE',
        address: user?.companyDetails?.address || '',
        gstNumber: user?.companyDetails?.gstNumber || '',
        email: user?.companyDetails?.email || user?.email || '',
        phone: user?.companyDetails?.phone || '',
        logo: user?.invoiceLogo || '',
        sign: user?.invoiceSign || '',
        seal: user?.invoiceSeal || '',
        invoiceColor: localStorage.getItem('selected-invoice-color') || '#FF4500'
    });

    // Form States for creating a Receipt
    const [customerId, setCustomerId] = useState('');
    const [invoiceId, setInvoiceId] = useState('');
    const [amount, setAmount] = useState('');
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMode, setPaymentMode] = useState('Bank Transfer');
    const [transactionId, setTransactionId] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchReceipts();
        fetchCustomers();
        fetchBranding();
    }, []);

    // When customer is chosen in modal, load customer's invoices
    useEffect(() => {
        if (!customerId) {
            setCustomerInvoices([]);
            setInvoiceId('');
            return;
        }
        fetchCustomerInvoices(customerId);
    }, [customerId]);

    const fetchBranding = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('http://localhost:5000/api/auth/invoice-branding', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setCompany({
                    name: res.data.companyName || user?.companyName || 'SKITE',
                    address: res.data.companyDetails?.address || '',
                    gstNumber: res.data.companyDetails?.gstNumber || '',
                    email: res.data.companyDetails?.email || user?.email || '',
                    phone: res.data.companyDetails?.phone || '',
                    logo: res.data.invoiceLogo || '',
                    sign: res.data.invoiceSign || '',
                    seal: res.data.invoiceSeal || '',
                    invoiceColor: res.data.invoiceColor || localStorage.getItem('selected-invoice-color') || '#FF4500'
                });
            }
        } catch (err) {
            console.error('Failed to load branding:', err);
        }
    };

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/receipts', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setReceipts(res.data || []);
        } catch (error) {
            console.error("Error fetching receipts", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/customers', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCustomers(res.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchCustomerInvoices = async (cId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/invoices`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (Array.isArray(res.data)) {
                const filtered = res.data.filter(inv => {
                    const invCustId = inv.customerId?._id || inv.customerId;
                    return invCustId === cId;
                });
                setCustomerInvoices(filtered);
            }
        } catch (err) {
            console.error('Failed to fetch invoices for customer:', err);
        }
    };

    const handleCreateReceipt = async (e) => {
        e.preventDefault();
        
        if (!customerId) return alert('Please select a client.');
        if (!amount || Number(amount) <= 0) return alert('Please enter a valid amount.');

        const payload = {
            customerId,
            invoiceId: invoiceId || undefined,
            amount: Number(amount),
            receiptDate,
            paymentMode,
            transactionId,
            notes
        };

        setSubmitting(true);
        try {
            const res = await axios.post('http://localhost:5000/api/receipts', payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            
            setIsAddModalOpen(false);
            resetForm();
            await fetchReceipts();

            // Open the generated receipt in modal immediately for viewing/printing/downloading
            if (res.data) {
                setSelectedReceipt(res.data);
            }
        } catch (error) {
            console.error("Error creating receipt:", error);
            alert(error.response?.data?.message || "Error creating receipt. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReceipt = async (id) => {
        if (!window.confirm('Are you sure you want to delete this payment receipt? This will adjust the customer\'s balance.')) {
            return;
        }
        try {
            await axios.delete(`http://localhost:5000/api/receipts/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchReceipts();
        } catch (err) {
            console.error('Failed to delete receipt:', err);
            alert('Failed to delete receipt');
        }
    };

    const handleDirectDownloadPdf = async (receipt) => {
        try {
            const clientName = receipt.customerId?.companyName || receipt.customerId?.customerName || 'Client';
            const fileName = `Payment_Receipt_${receipt.receiptNumber}_${clientName.replace(/\s+/g, '_')}`;
            await generatePaymentReceiptPdf(receipt, company, fileName, company.invoiceColor);
        } catch (err) {
            console.error('Direct PDF error:', err);
            alert('Failed to export PDF');
        }
    };

    const resetForm = () => {
        setCustomerId('');
        setInvoiceId('');
        setAmount('');
        setReceiptDate(new Date().toISOString().split('T')[0]);
        setPaymentMode('Bank Transfer');
        setTransactionId('');
        setNotes('');
    };

    // Calculate metrics strictly from issued receipts
    const totalCollected = receipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthReceipts = receipts.filter(r => {
        const d = new Date(r.receiptDate || r.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const thisMonthCollected = thisMonthReceipts.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    const filteredReceipts = receipts.filter(r => {
        if (modeFilter !== 'All' && r.paymentMode !== modeFilter) return false;

        const rNo = r.receiptNumber || '';
        const cName = r.customerId?.customerName || r.customerId?.companyName || '';
        const txn = r.transactionId || '';
        const invNo = r.invoiceId?.invoiceNumber || '';
        const s = searchTerm.toLowerCase();

        return rNo.toLowerCase().includes(s) || 
            cName.toLowerCase().includes(s) || 
            txn.toLowerCase().includes(s) ||
            invNo.toLowerCase().includes(s);
    });

    const inr = (val) => Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    return (
        <div className="space-y-6 text-left">
            {/* Top Stat Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Receipts */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Receipts Issued
                        </span>
                        <h4 className="text-2xl font-black text-slate-900 mt-1">
                            {receipts.length}
                        </h4>
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                            <CheckCircle2 size={12} /> Official Client Receipts
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <Receipt size={24} />
                    </div>
                </div>

                {/* Total Inward Amount */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Total Payment Received
                        </span>
                        <h4 className="text-2xl font-black text-emerald-600 mt-1">
                            ₹ {inr(totalCollected)}
                        </h4>
                        <span className="text-xs text-slate-500 font-medium mt-1 block">
                            Verified Client Payments
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <TrendingUp size={24} />
                    </div>
                </div>

                {/* This Month Receipts */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            This Month Received
                        </span>
                        <h4 className="text-2xl font-black text-slate-900 mt-1">
                            ₹ {inr(thisMonthCollected)}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium mt-1 block">
                            {thisMonthReceipts.length} Receipts in {new Date().toLocaleString('en-IN', { month: 'short' })}
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                        <Calendar size={24} />
                    </div>
                </div>

                {/* Active Brand Theme */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            Receipt Theme Color
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <span 
                                className="w-5 h-5 rounded-lg border border-white/20 shadow-xs" 
                                style={{ backgroundColor: company.invoiceColor }} 
                            />
                            <h4 className="text-lg font-black text-white font-mono">
                                {company.invoiceColor.toUpperCase()}
                            </h4>
                        </div>
                        <span className="text-xs text-slate-400 font-medium mt-1 block">
                            Auto-branded on all receipts
                        </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-800 text-amber-400 border border-slate-700">
                        <Sparkles size={24} />
                    </div>
                </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 max-w-lg">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by Receipt No (RCP-...), Client, UTR, Invoice..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:border-blue-500 shadow-xs"
                        />
                    </div>

                    {/* Mode Filter */}
                    <select
                        value={modeFilter}
                        onChange={(e) => setModeFilter(e.target.value)}
                        className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-xs cursor-pointer"
                    >
                        <option value="All">All Modes</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                    </select>
                </div>

                {/* Create Receipt Button */}
                <button 
                    onClick={() => {
                        resetForm();
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer self-start sm:self-auto"
                >
                    <Plus size={16} />
                    <span>Create Receipt</span>
                </button>
            </div>

            {/* Receipts Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] uppercase text-slate-500 font-extrabold tracking-wider">
                                <th className="p-4">Receipt No</th>
                                <th className="p-4">Client / Customer</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Payment Mode & UTR</th>
                                <th className="p-4">Linked Invoice</th>
                                <th className="p-4 text-right">Amount (₹)</th>
                                <th className="p-4 text-center">Receipt Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-14 text-center text-slate-400">
                                        <div className="flex flex-col items-center max-w-sm mx-auto">
                                            <div className="p-4 rounded-3xl bg-slate-100 text-slate-400 mb-3">
                                                <Receipt size={40} />
                                            </div>
                                            <p className="text-base font-bold text-slate-800">No payment receipts yet</p>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                Click <strong>"+ Create Receipt"</strong> above to issue your first official client payment receipt.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    resetForm();
                                                    setIsAddModalOpen(true);
                                                }}
                                                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-slate-800"
                                            >
                                                <Plus size={14} />
                                                <span>Issue First Receipt</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredReceipts.map((r) => {
                                const clientName = r.customerId?.companyName || r.customerId?.customerName || 'Client';

                                return (
                                    <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                                        {/* Receipt No */}
                                        <td className="p-4">
                                            <span className="font-extrabold text-slate-900 font-mono block text-xs">
                                                {r.receiptNumber}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                                                <CheckCircle2 size={10} /> RECEIVED
                                            </span>
                                        </td>

                                        {/* Customer */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                                    <User size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xs">{clientName}</p>
                                                    {r.customerId?.gstNumber && (
                                                        <p className="text-[10px] text-slate-400 font-mono">GST: {r.customerId.gstNumber}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="p-4 text-slate-600 font-medium">
                                            {new Date(r.receiptDate || r.createdAt).toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </td>

                                        {/* Mode & UTR */}
                                        <td className="p-4">
                                            <span className="font-semibold text-slate-800 block">{r.paymentMode}</span>
                                            {r.transactionId ? (
                                                <span className="text-[10px] font-mono text-slate-400">UTR: {r.transactionId}</span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">No UTR logged</span>
                                            )}
                                        </td>

                                        {/* Linked Invoice */}
                                        <td className="p-4">
                                            {r.invoiceId?.invoiceNumber ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-[11px] border border-blue-200">
                                                    <FileText size={11} />
                                                    {r.invoiceId.invoiceNumber}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 italic">On Account</span>
                                            )}
                                        </td>

                                        {/* Amount */}
                                        <td className="p-4 text-right">
                                            <span className="font-black text-sm font-mono text-emerald-700">
                                                ₹ {inr(r.amount)}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReceipt(r)}
                                                    className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                    title="View Full Payment Receipt"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDirectDownloadPdf(r)}
                                                    className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                                                    title="Download Official PDF Receipt"
                                                >
                                                    <Download size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteReceipt(r._id)}
                                                    className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                                    title="Delete Receipt"
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
            </div>

            {/* Modal: Create Client Payment Receipt */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden text-left animate-scale-in">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <span className="p-2.5 rounded-2xl bg-slate-900 text-white">
                                    <Receipt size={20} />
                                </span>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">Issue Payment Receipt</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Generate official receipt for received client payment</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAddModalOpen(false)} 
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white space-y-4">
                            <form id="createReceiptForm" onSubmit={handleCreateReceipt} className="space-y-4">
                                {/* Customer Selector */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                        Select Client / Customer *
                                    </label>
                                    <select 
                                        required 
                                        value={customerId} 
                                        onChange={(e) => setCustomerId(e.target.value)} 
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                                    >
                                        <option value="">-- Choose Client --</option>
                                        {customers.map(c => (
                                            <option key={c._id} value={c._id}>
                                                {c.companyName ? `${c.companyName} (${c.customerName})` : c.customerName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Linked Invoice Selector */}
                                {customerInvoices.length > 0 && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Link to Invoice (Optional)
                                        </label>
                                        <select 
                                            value={invoiceId} 
                                            onChange={(e) => setInvoiceId(e.target.value)} 
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                                        >
                                            <option value="">-- Direct Payment / On Account --</option>
                                            {customerInvoices.map(inv => (
                                                <option key={inv._id} value={inv._id}>
                                                    {inv.invoiceNumber} • ₹ {inr(inv.grandTotal || inv.totalAmount)} ({new Date(inv.invoiceDate || inv.date).toLocaleDateString('en-IN')})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Amount & Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Amount (₹) *</label>
                                        <input 
                                            required 
                                            type="number" 
                                            min="1" 
                                            value={amount} 
                                            onChange={(e) => setAmount(e.target.value)} 
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-sm" 
                                            placeholder="50000" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Receipt Date *</label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={receiptDate} 
                                            onChange={(e) => setReceiptDate(e.target.value)} 
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold" 
                                        />
                                    </div>
                                </div>

                                {/* Payment Mode & UTR / Txn ID */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">Payment Mode *</label>
                                        <select 
                                            required 
                                            value={paymentMode} 
                                            onChange={(e) => setPaymentMode(e.target.value)} 
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                                        >
                                            <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                                            <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                                            <option value="Cash">Cash</option>
                                            <option value="Cheque">Cheque</option>
                                            <option value="Other">Other Mode</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                            Transaction / UTR Reference
                                        </label>
                                        <input 
                                            type="text" 
                                            value={transactionId} 
                                            onChange={(e) => setTransactionId(e.target.value)} 
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs font-mono" 
                                            placeholder="e.g. UTR29184918239" 
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1.5">Remarks / Notes (Optional)</label>
                                    <textarea 
                                        rows="2" 
                                        value={notes} 
                                        onChange={(e) => setNotes(e.target.value)} 
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-xs" 
                                        placeholder="e.g. Advance payment for Social Media Marketing & Branding..." 
                                    />
                                </div>
                            </form>
                        </div>
                        
                        {/* Modal Footer */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button 
                                type="button"
                                onClick={() => setIsAddModalOpen(false)} 
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                form="createReceiptForm" 
                                disabled={submitting}
                                className="px-6 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {submitting ? 'Generating Receipt...' : 'Save & Generate Receipt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: View / Print / PDF Official Payment Receipt */}
            {selectedReceipt && (
                <PaymentReceiptModal
                    payment={selectedReceipt}
                    company={company}
                    onClose={() => setSelectedReceipt(null)}
                />
            )}
        </div>
    );
}
