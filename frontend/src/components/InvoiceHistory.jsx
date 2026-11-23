import { useAuth } from '../context/AuthContext';
import { getWorkspaceBrand } from '../utils/workspaceBrand';
import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
    Search, Download, FileText, Calendar, Filter, Eye,
    Printer, ArrowUpDown, RefreshCw, Loader2, Sparkles, Plus, 
    ArrowLeft, Layers, Check, X, Building2, ChevronLeft, ChevronRight,
    FileX, Trash2
} from 'lucide-react';
import InvoiceRenderer from './invoiceTemplates/InvoiceRenderer';
import InvoiceWorkspace from './InvoiceWorkspace';
import './InvoiceArchive.css';
import { INVOICE_TEMPLATES } from './invoiceTemplates/templateConfigs';
import { generateSingleInvoicePdf, generateNativeInvoicePdf, generateBatchInvoicesPdf } from '../utils/invoicePdfGenerator';

export default function InvoiceHistory({ onNavigateToInvoices, workspace = false, onInvoicesChange, onRecordPayment }) {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    // Active Template state (synced with settings / tenant)
    const [activeTemplate, setActiveTemplate] = useState(
        localStorage.getItem('selected-invoice-template') || 'skite-orange'
    );

    // Company Profile for InvoiceRenderer
    const [company, setCompany] = useState(() => ({
        workspaceBrand: getWorkspaceBrand(user),
        name: '',
        address: '',
        email: '',
        website: '',
        phone: '',
        gstNumber: '',
        panNumber: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        logo: '',
        sign: '',
        seal: ''
    }));

    // Filters
    const [activeGstTab, setActiveGstTab] = useState('all'); // 'all' | 'gst' | 'nongst'
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Paid' | 'Unpaid' | 'Partial'
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');

    // View Modal
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [modalTemplate, setModalTemplate] = useState(activeTemplate);
    const previewModalRef = useRef(null);

    // PDF Generation
    const [isBatchDownloading, setIsBatchDownloading] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [rowDownloadingId, setRowDownloadingId] = useState(null);

    // GST identification helper
    const isGSTInvoice = (inv) => {
        if (inv.taxRate !== undefined && Number(inv.taxRate) > 0) return true;
        if (inv.taxGstAmount !== undefined && Number(inv.taxGstAmount) > 0) return true;
        const invNum = inv.invoiceNumber || inv.invoiceNo || '';
        if (invNum.includes('26-27')) return true;
        if (invNum.includes('/N')) return false;
        return false;
    };

    const gstCount = useMemo(() => invoices.filter(isGSTInvoice).length, [invoices]);
    const nonGstCount = useMemo(() => invoices.length - gstCount, [invoices, gstCount]);

    // Extract unique client names for dedicated Client Filter dropdown
    const clientList = useMemo(() => {
        const set = new Set();
        invoices.forEach(inv => {
            const name = inv.customerId?.companyName || inv.customerId?.customerName || inv.clientDetails?.name || (typeof inv.customerId === 'string' ? inv.customerId : null);
            if (name && typeof name === 'string' && name.trim()) {
                set.add(name.trim());
            }
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [invoices]);

    useEffect(() => {
        fetchInvoices();
        fetchTenantProfile();
    }, []);

    useEffect(() => {
        if (viewingInvoice) {
            setModalTemplate(activeTemplate);
        }
    }, [viewingInvoice, activeTemplate]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setViewingInvoice(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const fetchTenantProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.invoiceTemplate) {
                setActiveTemplate(res.data.invoiceTemplate);
            }
            const cd = res.data?.companyDetails || {};
            setCompany({
                workspaceBrand: getWorkspaceBrand(user),
                name: cd.name || res.data?.companyName || res.data?.name || '',
                address: cd.address || '',
                email: cd.email || res.data?.email || '',
                website: cd.website || '',
                phone: cd.phone || '',
                gstNumber: cd.gstNumber || '',
                panNumber: cd.panNumber || '',
                bankName: cd.bankName || '',
                accountName: cd.accountName || '',
                accountNumber: cd.accountNumber || '',
                ifscCode: cd.ifscCode || '',
                branch: cd.branch || '',
                logo: res.data?.invoiceLogo || '',
                sign: res.data?.invoiceSign || '',
                seal: res.data?.invoiceSeal || ''
            });
        } catch (error) {
            console.error('Error fetching tenant profile in InvoiceHistory', error);
        }
    };

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            setLoadError(false);
            const res = await axios.get('http://localhost:5000/api/invoices', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const records = Array.isArray(res.data) ? res.data : [];
            setInvoices(records);
            onInvoicesChange?.(records);
        } catch (error) {
            setLoadError(true);
            console.error('Error fetching invoices in InvoiceHistory', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteInvoice = async (id, invNum) => {
        if (!window.confirm(`Are you sure you want to delete invoice ${invNum || ''}? This cannot be undone.`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/invoices/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvoices(prev => prev.filter(inv => inv._id !== id));
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert(error.response?.data?.message || 'Failed to delete invoice');
        }
    };

    const handleSetAsDefaultTemplate = async (templateId) => {
        setActiveTemplate(templateId);
        localStorage.setItem('selected-invoice-template', templateId);
        try {
            await axios.put('http://localhost:5000/api/auth/invoice-template', { templateId }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (error) {
            console.error('Failed to update default template', error);
        }
    };

    // Filter & Sort
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            // GST / Non-GST Separation
            const isGst = isGSTInvoice(inv);
            if (activeGstTab === 'gst' && !isGst) return false;
            if (activeGstTab === 'nongst' && isGst) return false;

            // Search Query: Client Name, Company Name, Invoice No, GST No
            const q = searchTerm.toLowerCase().trim();
            if (q) {
                const invNum = (inv.invoiceNumber || inv.invoiceNo || '').toLowerCase();
                const custName = (inv.customerId?.customerName || inv.clientDetails?.name || '').toLowerCase();
                const compName = (inv.customerId?.companyName || '').toLowerCase();
                const gstNo = (inv.customerId?.gstNumber || inv.clientDetails?.gstNo || '').toLowerCase();
                if (!invNum.includes(q) && !custName.includes(q) && !compName.includes(q) && !gstNo.includes(q)) {
                    return false;
                }
            }

            // Dedicated Client Filter
            if (selectedClient) {
                const target = selectedClient.toLowerCase().trim();
                const custName = (inv.customerId?.customerName || inv.clientDetails?.name || '').toLowerCase().trim();
                const compName = (inv.customerId?.companyName || '').toLowerCase().trim();
                const rawId = typeof inv.customerId === 'string' ? inv.customerId.toLowerCase().trim() : '';
                if (custName !== target && compName !== target && rawId !== target && !custName.includes(target) && !compName.includes(target)) {
                    return false;
                }
            }

            // Status Filter
            if (statusFilter !== 'ALL' && inv.paymentStatus !== statusFilter) {
                return false;
            }

            // Date Range (From Date / To Date)
            if (fromDate || toDate) {
                const rawD = inv.invoiceDate || inv.date || inv.createdAt;
                if (rawD) {
                    const d = new Date(rawD);
                    const invDateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    if (fromDate && invDateString < fromDate) return false;
                    if (toDate && invDateString > toDate) return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'date-asc') {
                return new Date(a.invoiceDate || a.date || 0) - new Date(b.invoiceDate || b.date || 0);
            } else if (sortBy === 'amount-desc') {
                return (Number(b.grandTotal) || 0) - (Number(a.grandTotal) || 0);
            } else if (sortBy === 'amount-asc') {
                return (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0);
            }
            return new Date(b.invoiceDate || b.date || 0) - new Date(a.invoiceDate || a.date || 0);
        });
    }, [invoices, activeGstTab, searchTerm, selectedClient, statusFilter, fromDate, toDate, sortBy]);

    // Pagination (15 records per page matching legacy CRM)
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeGstTab, searchTerm, selectedClient, statusFilter, fromDate, toDate, sortBy]);

    const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const paginatedInvoices = filteredInvoices.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    // Financial KPIs
    const totalCount = filteredInvoices.length;
    const totalGross = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalCollected = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || (inv.paymentStatus === 'Paid' ? Number(inv.grandTotal) : 0)), 0);
    const totalPending = Math.max(0, totalGross - totalCollected);

    // Single PDF Download
    const handleDownloadSinglePdf = async (inv) => {
        setRowDownloadingId(inv._id);
        try {
            await generateNativeInvoicePdf(inv, company, inv.invoiceNumber || 'Invoice');
        } catch (error) {
            console.error('Error downloading single invoice PDF', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setRowDownloadingId(null);
        }
    };

    // Download PDF from View Modal
    const handleDownloadModalPdf = async () => {
        if (!viewingInvoice) return;
        try {
            await generateNativeInvoicePdf(
                viewingInvoice, 
                company, 
                viewingInvoice.invoiceNumber || 'Invoice'
            );
        } catch (error) {
            console.error('Error generating PDF from preview modal', error);
            alert('Failed to generate PDF.');
        }
    };

    // Batch Download All (Combined Single PDF)
    const handleBatchDownloadAll = async () => {
        if (filteredInvoices.length === 0) {
            alert('No invoices match the current filters to download.');
            return;
        }

        setIsBatchDownloading(true);
        setBatchProgress({ current: 0, total: filteredInvoices.length });

        try {
            // Build descriptive filename based on active filters
            const parts = ['Invoices'];
            if (selectedClient) {
                parts.push(selectedClient.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25));
            } else if (searchTerm.trim()) {
                parts.push(searchTerm.trim().replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15));
            }
            if (fromDate && toDate) {
                parts.push(`${fromDate}_to_${toDate}`);
            } else if (fromDate) {
                parts.push(`from_${fromDate}`);
            } else if (toDate) {
                parts.push(`to_${toDate}`);
            }
            if (statusFilter !== 'ALL') {
                parts.push(statusFilter);
            }
            if (activeGstTab !== 'all') {
                parts.push(activeGstTab.toUpperCase());
            }
            if (parts.length === 1) {
                parts.push(`Export_${new Date().toISOString().slice(0, 10)}`);
            }
            const bundleFilename = parts.join('_');

            await generateBatchInvoicesPdf(
                filteredInvoices, 
                bundleFilename, 
                (current, total) => setBatchProgress({ current, total }),
                company
            );
        } catch (error) {
            console.error('Batch download error:', error);
            alert('Batch PDF export failed. Please try again.');
        } finally {
            setIsBatchDownloading(false);
            setBatchProgress({ current: 0, total: 0 });
        }
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedClient('');
        setStatusFilter('ALL');
        setActiveGstTab('all');
        setFromDate('');
        setToDate('');
        setSortBy('date-desc');
    };

    const hasActiveFilters = searchTerm !== '' || selectedClient !== '' || statusFilter !== 'ALL' || activeGstTab !== 'all' || fromDate !== '' || toDate !== '' || sortBy !== 'date-desc';
    const activeTemplateObj = INVOICE_TEMPLATES.find(t => t.id === activeTemplate) || INVOICE_TEMPLATES[0];

    if (workspace) {
        return <InvoiceWorkspace invoices={invoices} company={company} loading={loading} failed={loadError}
            downloadingId={rowDownloadingId} onDownload={handleDownloadSinglePdf} onRecordPayment={onRecordPayment} />;
    }

    return (
        <div className="invoice-archive">
            <div className="invoice-archive-actions">
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Active Template Selector */}
                    <div className="invoice-archive-template flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200">
                        <Sparkles size={14} className="text-emerald-600" />
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Template:</span>
                        <select 
                            aria-label="Invoice PDF template"
                            value={activeTemplate}
                            onChange={(e) => handleSetAsDefaultTemplate(e.target.value)}
                            className="bg-transparent font-bold text-xs text-slate-700 cursor-pointer outline-none border-none py-0.5"
                        >
                            {INVOICE_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Batch Export Button */}
                    <button
                        onClick={handleBatchDownloadAll}
                        disabled={isBatchDownloading || filteredInvoices.length === 0}
                        className={`invoice-archive-export flex items-center gap-2 px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                            filteredInvoices.length === 0
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-[#111111] text-white hover:bg-[#303030]'
                        }`}
                        title="Download filtered invoices as a single combined PDF"
                    >
                        {isBatchDownloading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Exporting ({batchProgress.current}/{batchProgress.total})...</span>
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                <span>
                                    {hasActiveFilters 
                                        ? `Download Filtered (${filteredInvoices.length})` 
                                        : `Download All (${filteredInvoices.length})`}
                                </span>
                            </>
                        )}
                    </button>

                    {/* Back / Create Invoice */}
                    {onNavigateToInvoices && (
                        <button
                            onClick={onNavigateToInvoices}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={14} />
                            <span>Back to Invoices</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Compact, Clean KPI Strip */}
            <div className="invoice-archive-summary grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Matching Invoices</span>
                    <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-slate-900">{totalCount}</span>
                        <span className="text-[11px] text-slate-500 font-medium">of {invoices.length} total</span>
                    </div>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Invoiced</span>
                    <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-blue-700">₹{totalGross.toLocaleString()}</span>
                        <span className="text-[11px] text-blue-500 font-medium">Gross</span>
                    </div>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Collected</span>
                    <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-emerald-600">₹{totalCollected.toLocaleString()}</span>
                        <span className="text-[11px] text-emerald-600 font-bold">
                            {totalGross > 0 ? `${Math.round((totalCollected / totalGross) * 100)}%` : '0%'}
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Pending</span>
                    <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-amber-600">₹{totalPending.toLocaleString()}</span>
                        <span className="text-[11px] text-amber-600 font-medium">Due</span>
                    </div>
                </div>
            </div>

            {/* GST / Non-GST Separation Tabs (Exact Replica of Legacy CRM) */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setActiveGstTab('all')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeGstTab === 'all'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Layers size={15} />
                    <span>All Invoices</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeGstTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                        {invoices.length}
                    </span>
                </button>

                <button
                    onClick={() => setActiveGstTab('gst')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeGstTab === 'gst'
                            ? 'bg-[#111111] text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <FileText size={15} />
                    <span>GST Invoices</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeGstTab === 'gst' ? 'bg-white/15 text-white' : 'bg-[#f0f0ee] text-[#595959] font-bold'
                    }`}>
                        {gstCount}
                    </span>
                </button>

                <button
                    onClick={() => setActiveGstTab('nongst')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeGstTab === 'nongst'
                            ? 'bg-[#111111] text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <FileX size={15} />
                    <span>Without GST</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeGstTab === 'nongst' ? 'bg-white/15 text-white' : 'bg-[#f0f0ee] text-[#595959] font-bold'
                    }`}>
                        {nonGstCount}
                    </span>
                </button>
            </div>

            {/* Clean, Unified Single-Bar Filter Controls */}
            <div className="invoice-archive-filters space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            aria-label="Search invoices"
                            placeholder="Search invoices"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white text-xs font-medium"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns & Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                            {['ALL', 'Paid', 'Partial', 'Unpaid'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        statusFilter === status
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {status === 'ALL' ? 'All' : status}
                                </button>
                            ))}
                        </div>

                        {/* Client Dropdown Filter */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                            <Building2 size={13} className="text-slate-400 shrink-0" />
                            <select
                                aria-label="Client"
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                className="bg-transparent border-none outline-none font-semibold text-xs text-slate-800 cursor-pointer max-w-[150px] truncate"
                            >
                                <option value="">All Clients ({clientList.length})</option>
                                {clientList.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* From & To Date Pickers */}
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <Calendar size={13} className="text-slate-400" />
                            <span className="text-slate-500 font-semibold text-[11px]">From:</span>
                            <input 
                                type="date" 
                                aria-label="From date"
                                value={fromDate} 
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-transparent border-none outline-none font-semibold text-xs text-slate-700 cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                            <Calendar size={13} className="text-slate-400" />
                            <span className="text-slate-500 font-semibold text-[11px]">To:</span>
                            <input 
                                type="date" 
                                aria-label="To date"
                                value={toDate} 
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-transparent border-none outline-none font-semibold text-xs text-slate-700 cursor-pointer"
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                            <ArrowUpDown size={13} className="text-slate-400 mr-0.5" />
                            <select
                                aria-label="Sort invoices"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent border-none outline-none font-bold text-xs text-slate-800 cursor-pointer"
                            >
                                <option value="date-desc">Newest First</option>
                                <option value="date-asc">Oldest First</option>
                                <option value="amount-desc">Amount: High to Low</option>
                                <option value="amount-asc">Amount: Low to High</option>
                            </select>
                        </div>

                        {/* Reset button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer text-xs font-bold"
                                title="Reset all filters"
                            >
                                <RefreshCw size={13} />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="invoice-archive-table">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" aria-label="Invoices">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                                <th className="py-3.5 px-5">Invoice No</th>
                                <th className="py-3.5 px-5">Date</th>
                                <th className="py-3.5 px-5">Client Name</th>
                                <th className="py-3.5 px-5">GST No</th>
                                <th className="py-3.5 px-5">Amount</th>
                                <th className="py-3.5 px-5">Status</th>
                                <th className="py-3.5 px-5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-slate-400">
                                        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
                                        <span className="text-xs font-medium">Loading invoice history...</span>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center max-w-sm mx-auto">
                                            <FileText size={42} className="text-slate-300 mb-2" />
                                            <p className="text-sm font-bold text-slate-700">No invoices found</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                No records match the current search or filters.
                                            </p>
                                            {hasActiveFilters && (
                                                <button 
                                                    onClick={handleResetFilters}
                                                    className="mt-3 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                                                >
                                                    Clear Filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((inv) => {
                                    const clientGst = inv.customerId?.gstNumber || inv.clientDetails?.gstNo;
                                    const clientDisplayName = inv.customerId?.companyName || inv.customerId?.customerName || inv.clientDetails?.name || 'N/A';
                                    const contactPerson = inv.customerId?.customerName && inv.customerId?.companyName ? inv.customerId.customerName : '';

                                    return (
                                        <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-5">
                                                <button 
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="font-mono font-bold text-[#FF4500] hover:underline text-sm text-left cursor-pointer"
                                                >
                                                    {inv.invoiceNumber || inv.invoiceNo}
                                                </button>
                                                <span className="block font-sans text-[10px] text-slate-400 font-normal">
                                                    {inv.items?.length || 0} item{inv.items?.length === 1 ? '' : 's'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-xs font-semibold text-slate-700">
                                                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-GB') : '—'}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <p className="font-bold text-slate-800 text-xs">{clientDisplayName}</p>
                                                {contactPerson && contactPerson !== clientDisplayName && (
                                                    <p className="text-[11px] text-slate-400">{contactPerson}</p>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                {clientGst ? (
                                                    <span className="font-mono font-bold text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                        {clientGst}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 font-medium text-xs">---</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-5 font-black text-slate-900 text-sm">
                                                ₹{(Number(inv.grandTotal) || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                    inv.paymentStatus === 'Paid' 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                        : inv.paymentStatus === 'Partial' 
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                                        inv.paymentStatus === 'Paid' ? 'bg-emerald-500' :
                                                        inv.paymentStatus === 'Partial' ? 'bg-amber-500' : 'bg-rose-500'
                                                    }`} />
                                                    {inv.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button 
                                                        onClick={() => setViewingInvoice(inv)}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                                        title="View Invoice in selected template"
                                                    >
                                                        <Eye size={13} />
                                                        <span>View</span>
                                                    </button>

                                                    <button 
                                                        onClick={() => handleDownloadSinglePdf(inv)}
                                                        disabled={rowDownloadingId === inv._id}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                                        title="Download PDF"
                                                    >
                                                        {rowDownloadingId === inv._id ? (
                                                            <Loader2 size={13} className="animate-spin" />
                                                        ) : (
                                                            <Download size={13} />
                                                        )}
                                                        <span>PDF</span>
                                                    </button>

                                                    <button 
                                                        onClick={() => handleDeleteInvoice(inv._id, inv.invoiceNumber || inv.invoiceNo)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Delete Invoice"
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

                {filteredInvoices.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-800">{(validPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-slate-800">{Math.min(validPage * PAGE_SIZE, filteredInvoices.length)}</strong> of <strong className="text-slate-800">{filteredInvoices.length}</strong> invoices
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
            </div>

            {/* ========================================================
                VIEW / PRINT / EXPORT MODAL (RENDERED VIA PORTAL TO BODY)
                ======================================================== */}
            {viewingInvoice && createPortal(
                <div 
                    className="workspace-invoice-preview fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setViewingInvoice(null);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-scale-in">
                        
                        {/* Modal Header */}
                        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 px-6 border-b border-slate-200 bg-slate-50">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                                        Invoice {viewingInvoice.invoiceNumber || viewingInvoice.invoiceNo}
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                        viewingInvoice.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                                        viewingInvoice.paymentStatus === 'Partial' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {viewingInvoice.paymentStatus || 'Unpaid'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                                    Issued to {viewingInvoice.customerId?.companyName || viewingInvoice.customerId?.customerName || viewingInvoice.clientDetails?.name || 'Customer'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl shadow-xs">
                                    <Layers size={14} className="text-blue-600" />
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Template:</label>
                                    <select
                                        value={modalTemplate}
                                        onChange={(e) => setModalTemplate(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                    >
                                        {INVOICE_TEMPLATES.map(tmpl => (
                                            <option key={tmpl.id} value={tmpl.id}>
                                                {tmpl.name} ({tmpl.badge})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {modalTemplate !== activeTemplate && (
                                    <button
                                        onClick={() => handleSetAsDefaultTemplate(modalTemplate)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <Check size={14} /> Make Default
                                    </button>
                                )}

                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center gap-1 px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    <Printer size={14} /> Print
                                </button>

                                <button
                                    onClick={handleDownloadModalPdf}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF4500] hover:bg-[#e03e00] text-white text-xs font-bold rounded-xl shadow-xs shadow-orange-500/20 transition-colors cursor-pointer"
                                >
                                    <Download size={14} /> Download PDF
                                </button>

                                <button 
                                    onClick={() => setViewingInvoice(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer ml-1"
                                    title="Close (Esc)"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Fully scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 flex justify-center">
                            <div 
                                id="printable-invoice-modal-content"
                                ref={previewModalRef} 
                                className="w-full max-w-4xl bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 my-auto"
                            >
                                <InvoiceRenderer 
                                    invoice={viewingInvoice} 
                                    templateId={modalTemplate} 
                                    company={company} 
                                />
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Off-screen elements for batch PDF export */}
            <div 
                style={{ 
                    position: 'fixed', 
                    left: '-9999px', 
                    top: 0, 
                    width: '850px', 
                    zIndex: -9999, 
                    opacity: 1, 
                    pointerEvents: 'none' 
                }}
            >
                {filteredInvoices.map((inv, idx) => (
                    <div 
                        key={`history-batch-${inv._id || idx}`} 
                        id={`history-batch-render-${idx}`}
                        className="bg-white mb-8"
                        style={{ width: '850px' }}
                    >
                        <InvoiceRenderer 
                            invoice={inv} 
                            templateId={activeTemplate} 
                            company={company} 
                        />
                    </div>
                ))}
            </div>

        </div>
    );
}
