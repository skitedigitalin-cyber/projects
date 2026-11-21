import './FinanceLedger.css';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users, FileText, CheckCircle, Clock, Edit2, Save, Search, Plus, 
    ArrowLeft, X, Building, Phone, Mail, MapPin, IndianRupee, AlertTriangle,
    ChevronLeft, ChevronRight, TrendingUp, Layers, Check, Trash2, Calendar
} from 'lucide-react';

export default function CustomerManagement() {
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Paid' | 'Partial' | 'Unpaid'
    const [gstFilter, setGstFilter] = useState('All'); // 'All' | 'GST' | 'Non-GST'

    // Modal state for View Details / Edit
    const [selectedClient, setSelectedClient] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [savingClient, setSavingClient] = useState(false);

    // Modal state for New Customer
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const emptyForm = {
        customerName: '', companyName: '', contactPerson: '', phone: '', email: '',
        gstNumber: '', panNumber: '', billingAddress: '', shippingAddress: '',
        creditLimit: 0, paymentTerms: 'Immediate', openingBalance: 0
    };
    const [newCustomerForm, setNewCustomerForm] = useState(emptyForm);

    // Pagination (15 records per page)
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchCustomers();
        fetchInvoices();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, gstFilter]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/customers', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCustomers(res.data || []);
        } catch (error) {
            console.error("Error fetching customers", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoices = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/invoices', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setInvoices(res.data || []);
        } catch (error) {
            console.error("Error fetching invoices for customer modal", error);
        }
    };

    const getClientStatus = (c) => {
        const pending = Number(c.pendingAmount) || 0;
        const paid = Number(c.paidAmount) || 0;
        if (pending <= 0) return 'Paid';
        if (paid > 0) return 'Partial';
        return 'Unpaid';
    };

    const handleOpenDetails = (client) => {
        setSelectedClient(client);
        setIsEditing(false);
        setEditData({
            customerName: client.customerName || '',
            companyName: client.companyName || '',
            phone: client.phone || '',
            email: client.email || '',
            gstNumber: client.gstNumber || '',
            billingAddress: client.billingAddress || '',
            contactPerson: client.contactPerson || ''
        });
    };

    const handleSaveClientUpdates = async () => {
        if (!selectedClient) return;
        try {
            setSavingClient(true);
            const res = await axios.put(`http://localhost:5000/api/customers/${selectedClient._id}`, editData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSelectedClient(res.data);
            setIsEditing(false);
            fetchCustomers();
        } catch (error) {
            console.error("Error updating customer details", error);
            alert("Failed to update customer details.");
        } finally {
            setSavingClient(false);
        }
    };

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/customers', newCustomerForm, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setIsAddModalOpen(false);
            setNewCustomerForm(emptyForm);
            fetchCustomers();
        } catch (error) {
            console.error("Error creating customer", error);
            alert("Error creating customer.");
        }
    };

    const handleDeleteCustomer = async (id) => {
        if (!window.confirm("Are you sure you want to delete this customer?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/customers/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (selectedClient && selectedClient._id === id) {
                setSelectedClient(null);
            }
            fetchCustomers();
        } catch (error) {
            console.error("Error deleting customer", error);
        }
    };

    // Filter Logic
    const filteredCustomers = customers.filter(c => {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = (c.customerName || '').toLowerCase().includes(q) ||
                          (c.companyName || '').toLowerCase().includes(q) ||
                          (c.gstNumber || '').toLowerCase().includes(q) ||
                          (c.billingAddress || '').toLowerCase().includes(q);
        if (!nameMatch) return false;

        const status = getClientStatus(c);
        if (statusFilter !== 'All' && status !== statusFilter) return false;

        const hasGst = !!(c.gstNumber && c.gstNumber.trim());
        if (gstFilter === 'GST' && !hasGst) return false;
        if (gstFilter === 'Non-GST' && hasGst) return false;

        return true;
    });

    // Summary calculations
    const summary = {
        totalClients: filteredCustomers.length,
        totalInvoiced: filteredCustomers.reduce((acc, c) => acc + (Number(c.totalInvoiceAmount) || 0), 0),
        totalCollected: filteredCustomers.reduce((acc, c) => acc + (Number(c.paidAmount) || 0), 0),
        totalPending: filteredCustomers.reduce((acc, c) => acc + (Number(c.pendingAmount) || 0), 0)
    };

    const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const paginatedCustomers = filteredCustomers.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    // Filter invoices for currently selected client in modal
    const clientInvoices = selectedClient ? invoices.filter(inv => {
        const cId = inv.customerId?._id || inv.customerId;
        return cId === selectedClient._id || (inv.customerId?.customerName === selectedClient.customerName);
    }) : [];

    return (
        <div className="finance-customers">

            {/* Header: Exact replica of the user's CRM page */}
            <div className="finance-ledger-heading">
                <div className="flex items-center gap-4">
                    <button 
                        type="button"
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold bg-white text-slate-700 border border-slate-200 rounded-full hover:border-blue-500 hover:text-[#3f3f3f] transition-all shadow-xs cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <h2>{summary.totalClients} {summary.totalClients === 1 ? 'customer' : 'customers'} <span>· ₹{summary.totalPending.toLocaleString('en-IN')} pending</span></h2>
                </div>

                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-[#111111] hover:bg-[#303030] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
                >
                    <Plus size={16} />
                    <span>Add Customer</span>
                </button>
            </div>

            <dl className="finance-receipt-summary finance-customer-summary">
                <div><dt>Total clients</dt><dd>{summary.totalClients}</dd></div>
                <div><dt>Billed</dt><dd>₹{summary.totalInvoiced.toLocaleString('en-IN')}</dd></div>
                <div><dt>Collected</dt><dd>₹{summary.totalCollected.toLocaleString('en-IN')}</dd></div>
                <div><dt>Pending</dt><dd>₹{summary.totalPending.toLocaleString('en-IN')}</dd></div>
            </dl>

            <div className="finance-ledger" data-editor-open={Boolean(selectedClient)}>
                <section className="finance-ledger-list" aria-labelledby="customer-invoices-title">
                    <header className="finance-ledger-heading"><h2 id="customer-invoices-title">Customers</h2><p>From invoices</p></header>
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        aria-label="Search customers" placeholder="Search customers"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-[#111111] focus:bg-white transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* GST Filter */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        {['All', 'GST', 'Non-GST'].map(g => (
                            <button
                                key={g}
                                onClick={() => setGstFilter(g)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    gstFilter === g ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        {['All', 'Paid', 'Partial', 'Unpaid'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    statusFilter === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Customers Table (Exact 1:1 match with original CRM layout) */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[650px]" aria-label="Customers from invoices">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                                <th className="p-4 pl-6">Client Name</th>
                                <th className="p-4">Address & Location</th>
                                <th className="p-4">GST No</th>
                                <th className="p-4">Invoices</th>
                                <th className="p-4">Total Billed</th>
                                <th className="p-4">Total Paid</th>
                                <th className="p-4">Total Pending</th>
                                <th className="p-4 pr-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                                        Loading customers from invoices...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-slate-400 font-medium">
                                        No customers match your search criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCustomers.map((client) => {
                                    const hasGst = client.gstNumber && client.gstNumber.trim();
                                    const billed = Number(client.totalInvoiceAmount) || 0;
                                    const paid = Number(client.paidAmount) || 0;
                                    const pending = Number(client.pendingAmount) || 0;

                                    return (
                                        <tr key={client._id} className="hover:bg-[#f0f0ee]/30 transition-colors">
                                            {/* Client Name */}
                                            <td className="p-4 pl-6 font-bold text-slate-900 text-sm">
                                                {client.customerName}
                                            </td>

                                            {/* Address & Location */}
                                            <td className="p-4 text-slate-600 max-w-xs">
                                                <div className="text-[12px] leading-relaxed">
                                                    {client.billingAddress || 'No Address Provided'}
                                                </div>
                                            </td>

                                            {/* GST No */}
                                            <td className="p-4">
                                                {hasGst ? (
                                                    <span className="font-bold text-emerald-800 font-mono text-xs">
                                                        {client.gstNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-medium text-xs">
                                                        N/A
                                                    </span>
                                                )}
                                            </td>

                                            {/* Invoices Count */}
                                            <td className="p-4">
                                                <div className="inline-flex items-center gap-1.5 text-indigo-600 font-bold text-xs bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                    <FileText size={15} />
                                                    <span>{client.invoiceCount || 0}</span>
                                                </div>
                                            </td>

                                            {/* Total Billed */}
                                            <td className="p-4 font-black text-slate-900 text-sm">
                                                ₹{billed.toLocaleString('en-IN')}
                                            </td>

                                            {/* Total Paid */}
                                            <td className="p-4 text-emerald-600 font-bold text-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                                                    <span>₹{paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </td>

                                            {/* Total Pending */}
                                            <td className="p-4 text-rose-600 font-bold text-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={16} className="text-rose-500 shrink-0" />
                                                    <span>₹{pending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </td>

                                            {/* Action Button: View Details */}
                                            <td className="p-4 pr-6 text-center">
                                                <button 
                                                    type="button"
                                                    onClick={() => handleOpenDetails(client)}
                                                    className="bg-[#111111] hover:bg-[#303030] text-white px-3.5 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 15 Records Pagination */}
                {filteredCustomers.length > PAGE_SIZE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-900">{(validPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-slate-900">{Math.min(validPage * PAGE_SIZE, filteredCustomers.length)}</strong> of <strong className="text-slate-900">{filteredCustomers.length}</strong> customers
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
                            <span className="px-2 text-xs font-bold text-slate-600">
                                Page {validPage} of {totalPages}
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
                {selectedClient && (
                    <section className="finance-ledger-editor finance-customer-details" aria-label="Customer details">
                        {/* Close Icon */}
                        <button 
                            type="button"
                            onClick={() => setSelectedClient(null)}
                            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer z-10"
                        >
                            <X size={20} />
                        </button>

                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between pr-14">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    {isEditing ? "Edit Customer Details" : "Customer Details"}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {selectedClient.customerName}
                                </p>
                            </div>

                            {!isEditing && (
                                <button 
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer border border-slate-200"
                                >
                                    <Edit2 size={13} /> Edit
                                </button>
                            )}
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
                            
                            {/* Field: Client Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Name:</span>
                                <div className="sm:col-span-2">
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editData.customerName} 
                                            onChange={(e) => setEditData({...editData, customerName: e.target.value})} 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-[#111111]"
                                        />
                                    ) : (
                                        <span className="font-black text-slate-900 text-sm">{selectedClient.customerName}</span>
                                    )}
                                </div>
                            </div>

                            {/* Field: Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Phone:</span>
                                <div className="sm:col-span-2">
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editData.phone} 
                                            onChange={(e) => setEditData({...editData, phone: e.target.value})} 
                                            placeholder="e.g. 9876543210"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-[#111111]"
                                        />
                                    ) : (
                                        <span className="text-slate-700 font-medium">{selectedClient.phone || 'N/A'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Field: Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Email:</span>
                                <div className="sm:col-span-2">
                                    {isEditing ? (
                                        <input 
                                            type="email" 
                                            value={editData.email} 
                                            onChange={(e) => setEditData({...editData, email: e.target.value})} 
                                            placeholder="e.g. client@example.com"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-[#111111]"
                                        />
                                    ) : (
                                        <span className="text-slate-700 font-medium">{selectedClient.email || 'N/A'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Field: GST Number */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">GST No:</span>
                                <div className="sm:col-span-2">
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editData.gstNumber} 
                                            onChange={(e) => setEditData({...editData, gstNumber: e.target.value})} 
                                            placeholder="GST Number"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none focus:border-[#111111]"
                                        />
                                    ) : (
                                        <span className="font-bold text-emerald-800 font-mono">{selectedClient.gstNumber || 'N/A'}</span>
                                    )}
                                </div>
                            </div>

                            {/* Field: Billing Address */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px] pt-1">Address:</span>
                                <div className="sm:col-span-2">
                                    {isEditing ? (
                                        <textarea 
                                            rows="2"
                                            value={editData.billingAddress} 
                                            onChange={(e) => setEditData({...editData, billingAddress: e.target.value})} 
                                            placeholder="Full Billing Address"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-[#111111]"
                                        />
                                    ) : (
                                        <span className="text-slate-700 leading-relaxed font-medium">
                                            {selectedClient.billingAddress || 'No Address Provided'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Edit Controls */}
                            {isEditing ? (
                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button 
                                        type="button"
                                        onClick={() => setIsEditing(false)} 
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleSaveClientUpdates} 
                                        disabled={savingClient}
                                        className="px-5 py-2 bg-[#111111] hover:bg-[#303030] text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                                    >
                                        <Save size={15} />
                                        <span>{savingClient ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Summary 3-Box Strip */}
                                    <div className="pt-2 border-t border-slate-100">
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider">TOTAL INVOICED</div>
                                                <div className="text-sm font-black text-slate-900 mt-0.5">
                                                    ₹{(Number(selectedClient.totalInvoiceAmount) || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">TOTAL PAID</div>
                                                <div className="text-sm font-black text-emerald-700 mt-0.5">
                                                    ₹{(Number(selectedClient.paidAmount) || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                                                <div className="text-[10px] font-black text-rose-600 uppercase tracking-wider">PENDING</div>
                                                <div className="text-sm font-black text-rose-700 mt-0.5">
                                                    ₹{(Number(selectedClient.pendingAmount) || 0).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Client Invoices List Preview */}
                                    <div className="pt-3 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                                                <FileText size={14} className="text-[#3f3f3f]" />
                                                <span>Invoices History ({clientInvoices.length})</span>
                                            </span>
                                        </div>

                                        {clientInvoices.length === 0 ? (
                                            <p className="text-slate-400 italic text-[11px] py-2">
                                                No linked invoices found for this client.
                                            </p>
                                        ) : (
                                            <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                                                {clientInvoices.map((inv) => {
                                                    const isPaid = inv.paymentStatus === 'Paid';
                                                    return (
                                                        <div key={inv._id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-[#3f3f3f]">{inv.invoiceNumber}</span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="font-bold text-slate-900">
                                                                    ₹{(Number(inv.grandTotal) || 0).toLocaleString('en-IN')}
                                                                </span>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                                }`}>
                                                                    {inv.paymentStatus || 'Unpaid'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => handleDeleteCustomer(selectedClient._id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                                <Trash2 size={14} />
                                <span>Delete Customer</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedClient(null)}
                                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                            >
                                Close
                            </button>
                        </div>

                    </section>
                )}
            </div>

            {/* ========================================================
                ADD NEW CUSTOMER MODAL
                ======================================================== */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-base font-black text-slate-900 tracking-tight">Add New Customer</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer / Company Name *</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={newCustomerForm.customerName} 
                                    onChange={e => setNewCustomerForm({...newCustomerForm, customerName: e.target.value, companyName: e.target.value})} 
                                    placeholder="e.g. Acme Corporation" 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:border-[#111111]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">GST Number</label>
                                    <input 
                                        type="text" 
                                        value={newCustomerForm.gstNumber} 
                                        onChange={e => setNewCustomerForm({...newCustomerForm, gstNumber: e.target.value})} 
                                        placeholder="e.g. 33AAAAA0000A1Z5" 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                                    <input 
                                        type="text" 
                                        value={newCustomerForm.phone} 
                                        onChange={e => setNewCustomerForm({...newCustomerForm, phone: e.target.value})} 
                                        placeholder="e.g. 9876543210" 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-[#111111]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input 
                                    type="email" 
                                    value={newCustomerForm.email} 
                                    onChange={e => setNewCustomerForm({...newCustomerForm, email: e.target.value})} 
                                    placeholder="e.g. accounts@acme.com" 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-[#111111]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Billing Address & Location</label>
                                <textarea 
                                    rows="2" 
                                    value={newCustomerForm.billingAddress} 
                                    onChange={e => setNewCustomerForm({...newCustomerForm, billingAddress: e.target.value})} 
                                    placeholder="Street address, city, state, pincode" 
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-[#111111]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddModalOpen(false)} 
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2 bg-[#111111] hover:bg-[#303030] text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                                >
                                    Create Customer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
