import { getWorkspaceBrand } from '../utils/workspaceBrand';
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Plus, Search, User, Download, Eye, Trash2, Receipt, CheckCircle2, FileText } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import PaymentReceiptModal from './PaymentReceiptModal';
import './FinanceLedger.css';
import { generatePaymentReceiptPdf } from '../utils/paymentReceiptPdfGenerator';

export default function PaymentManagement() {
    const { user } = useContext(AuthContext);
    const [receipts, setReceipts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [customerInvoices, setCustomerInvoices] = useState([]);
    const [editorOpen, setEditorOpen] = useState(true);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [modeFilter, setModeFilter] = useState('All');
    const [loading, setLoading] = useState(false);

    // Company branding details for PDF receipts
    const [company, setCompany] = useState({
        workspaceBrand: getWorkspaceBrand(user),
        name: user?.companyName || '',
        address: user?.companyDetails?.address || '',
        gstNumber: user?.companyDetails?.gstNumber || '',
        email: user?.companyDetails?.email || user?.email || '',
        phone: user?.companyDetails?.phone || '',
        logo: user?.invoiceLogo || '',
        sign: user?.invoiceSign || '',
        seal: user?.invoiceSeal || '',
        invoiceColor: user?.invoiceColor || '#FF4500'
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
                    workspaceBrand: getWorkspaceBrand(user),
                    name: res.data.companyName || user?.companyName || '',
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
            
            setEditorOpen(false);
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


    const showEditor = () => {
        resetForm();
        setEditorOpen(true);
        requestAnimationFrame(() => document.getElementById('receipt-editor-title')?.focus());
    };

    return (
        <div className="finance-receipts">
            <dl className="finance-receipt-summary">
                <div><dt>Receipts issued</dt><dd>{receipts.length}</dd></div>
                <div><dt>Total payment received</dt><dd>₹{inr(totalCollected)}</dd></div>
                <div><dt>Received this month</dt><dd>₹{inr(thisMonthCollected)}</dd></div>
                <div>
                    <dt>Receipt colour</dt>
                    <dd><i aria-hidden="true" style={{ backgroundColor: company.invoiceColor }} />{company.invoiceColor.toUpperCase()}</dd>
                    <small>Applied to every receipt PDF</small>
                </div>
            </dl>
            <div className="finance-ledger" data-editor-open={editorOpen}>
                <section className="finance-ledger-list" aria-labelledby="receipt-list-title">
                    <header className="finance-ledger-heading">
                        <h2 id="receipt-list-title">Receipts</h2>
                        <button type="button" className="finance-ledger-primary" onClick={showEditor}><Plus size={15} /> Issue receipt</button>
                    </header>
                    <div className="finance-receipt-filters">
                        <label className="finance-ledger-search"><Search size={16} aria-hidden="true" />
                            <input type="search" aria-label="Search receipts" placeholder="Search receipts" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </label>
                        <select aria-label="Payment mode filter" value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
                            {['All','Bank Transfer','UPI','Cash','Cheque'].map(mode => <option key={mode} value={mode}>{mode === 'All' ? 'All modes' : mode}</option>)}
                        </select>
                    </div>
                    <div className="finance-ledger-table finance-receipt-table">
                    <table aria-label="Receipts">
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
                                                    setEditorOpen(true);
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
                </section>

                {editorOpen && <section className="finance-ledger-editor" data-tone="dark" aria-labelledby="receipt-editor-title">
                    <h2 id="receipt-editor-title" tabIndex={-1}>Issue a receipt</h2>
                    <p>For money already received from a client.</p>
                    <form id="createReceiptForm" onSubmit={handleCreateReceipt}>
                        <label>Client
                            <select name="customer" required value={customerId} onChange={e => setCustomerId(e.target.value)}>
                                <option value="">Choose client</option>
                                {customers.map(customer => <option key={customer._id} value={customer._id}>{customer.companyName ? `${customer.companyName} (${customer.customerName})` : customer.customerName}</option>)}
                            </select>
                        </label>
                        {customerInvoices.length > 0 && <label>Link to invoice (optional)
                            <select name="invoice" value={invoiceId} onChange={e => setInvoiceId(e.target.value)}>
                                <option value="">Direct payment / on account</option>
                                {customerInvoices.map(invoice => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber} · ₹{inr(invoice.grandTotal || invoice.totalAmount)} ({new Date(invoice.invoiceDate || invoice.date).toLocaleDateString('en-IN')})</option>)}
                            </select>
                        </label>}
                        <div className="finance-ledger-fields">
                            <label>Amount (₹)<input name="amount" type="number" min="1" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
                            <label>Date<input name="date" type="date" required value={receiptDate} onChange={e => setReceiptDate(e.target.value)} /></label>
                        </div>
                        <label>Mode
                            <select name="mode" required value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                                <option value="Bank Transfer">Bank transfer (NEFT/RTGS/IMPS)</option>
                                <option value="UPI">UPI (GPay / PhonePe / QR)</option>
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Other">Other mode</option>
                            </select>
                        </label>
                        <label>Transaction / UTR reference<input name="reference" value={transactionId} onChange={e => setTransactionId(e.target.value)} /></label>
                        <label>Notes (optional)<textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></label>
                        <footer>
                            <button type="button" onClick={() => setEditorOpen(false)}>Cancel</button>
                            <button type="submit" className="finance-ledger-primary" disabled={submitting}>{submitting ? 'Generating receipt…' : 'Save & generate receipt'}</button>
                        </footer>
                    </form>
                </section>}
            </div>

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
