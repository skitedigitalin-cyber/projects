import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
    Plus, Search, FileText, Download, Trash2, X, FilePlus, Pencil, 
    Eye, Printer, History, ArrowRight, ArrowLeft, Loader2, Layers, Check, Sparkles,
    ChevronDown, ChevronLeft, ChevronRight, MessageCircle, Mail, Save, Building2, User,
    Calendar, CheckCircle, Clock, AlertCircle, Repeat
} from 'lucide-react';
import InvoiceRenderer from './invoiceTemplates/InvoiceRenderer';
import { INVOICE_TEMPLATES } from './invoiceTemplates/templateConfigs';
import { generateSingleInvoicePdf, generateNativeInvoicePdf } from '../utils/invoicePdfGenerator';

// Quick Preset Services for Digital & Creative Agencies
const SERVICES_LIST = [
    { name: 'UX/UI DESIGN', hsn: '998314' },
    { name: 'WEB DEVELOPMENT', hsn: '998314' },
    { name: 'META ADS', hsn: '998365' },
    { name: 'VIDEO SHOOT', hsn: '998382' },
    { name: 'VIDEO EDITING', hsn: '998386' },
    { name: 'CONTENT WRITING', hsn: '999612' },
    { name: 'SOCIAL MEDIA MANAGEMENT', hsn: '998313' },
    { name: 'LINKEDIN CONTENT CREATION', hsn: '998361' },
    { name: 'SEO', hsn: '998319' },
    { name: 'GRAPHIC DESIGN', hsn: '998392' },
    { name: 'APP DEVELOPMENT', hsn: '998314' }
];

export default function InvoiceManagement({ onNavigateToHistory, initialTemplate, onClearInitialTemplate }) {
    const { user } = useAuth();
    // Mode: 'list' (invoices table) or 'editor' (50/50 split workspace)
    const [viewMode, setViewMode] = useState('list');
    
    // Core Invoices Data
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [fixedTemplates, setFixedTemplates] = useState([]);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const templateDropdownRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [savingInvoice, setSavingInvoice] = useState(false);
    const [saveSuccessNotice, setSaveSuccessNotice] = useState('');

    // List Search & Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [gstFilter, setGstFilter] = useState('ALL'); // 'ALL' | 'GST' | 'NONGST'
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 15;

    // Active Template state (synced with settings / tenant)
    const [activeTemplate, setActiveTemplate] = useState(
        localStorage.getItem('selected-invoice-template') || 'skite-orange'
    );
    const [editorTemplate, setEditorTemplate] = useState(activeTemplate);

    // Company Profile
    const [company, setCompany] = useState(() => ({
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

    // View Modal (Quick popup preview from list)
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [modalTemplate, setModalTemplate] = useState(activeTemplate);
    const previewModalRef = useRef(null);
    const [rowDownloadingId, setRowDownloadingId] = useState(null);

    // ========================================================
    // EDITOR FORM STATES (2-Column 50/50 Workspace)
    // ========================================================
    const [editId, setEditId] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('Unpaid');

    // Customer info
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerGst, setCustomerGst] = useState('');
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [locationCity, setLocationCity] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const clientDropdownRef = useRef(null);

    // Line items
    const [items, setItems] = useState([
        { description: '', hsn: '', price: '', qty: 1 }
    ]);
    const [activeServiceDropdownIndex, setActiveServiceDropdownIndex] = useState(null);
    const serviceDropdownRef = useRef(null);

    // Tax & Notes
    const [taxRate, setTaxRate] = useState(9); // 9% CGST + 9% SGST = 18%
    const [discount, setDiscount] = useState(0);
    const [notes, setNotes] = useState('');
    const [termsAndConditions, setTermsAndConditions] = useState(
        '1. 50% advance payment required to start the project.\n2. Final balance on project completion before live handover.\n3. Preview will be deployed on staging URL for approval before production release.'
    );

    // PDF Ref for Live Preview in Editor
    const editorPreviewRef = useRef(null);

    const fetchFixedTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/fixed-templates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFixedTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Error fetching fixed templates in invoice:', e);
        }
    };

    // Load Pre-saved Fixed Template into Invoice Editor
    const loadTemplateIntoInvoice = (tmpl) => {
        const rate = tmpl.taxRate !== undefined ? tmpl.taxRate : 9;
        const nextNo = generateNextInvoiceNo(invoices, rate);
        setEditId(null);
        setInvoiceNumber(nextNo);
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setPaymentStatus('Unpaid');

        setCustomerId('');
        setCustomerName(tmpl.clientDetails?.name || tmpl.name || '');
        setCompanyName(tmpl.clientDetails?.name || tmpl.name || '');
        setCustomerPhone(tmpl.clientDetails?.phone || '');
        setCustomerEmail(tmpl.clientDetails?.email || '');
        setCustomerGst(tmpl.clientDetails?.gstNo || '');
        setAddressLine1(tmpl.clientDetails?.addressLine1 || '');
        setAddressLine2(tmpl.clientDetails?.addressLine2 || '');
        setLocationCity(tmpl.clientDetails?.location || '');

        if (tmpl.items && tmpl.items.length > 0) {
            setItems(tmpl.items.map(it => ({
                description: it.description || '',
                hsn: it.hsn || '',
                price: it.price || '',
                qty: it.qty || 1
            })));
        }
        setTaxRate(rate);
        setDiscount(0);
        setNotes(tmpl.notes || '');
        setShowTemplateDropdown(false);
        setSaveSuccessNotice('');
        setViewMode('editor');
    };

    // Auto-load template if passed from parent
    useEffect(() => {
        if (initialTemplate) {
            loadTemplateIntoInvoice(initialTemplate);
            if (onClearInitialTemplate) onClearInitialTemplate();
        }
    }, [initialTemplate]);

    // ========================================================
    // LIFECYCLE & API CALLS
    // ========================================================
    useEffect(() => {
        fetchInvoices();
        fetchCustomers();
        fetchTenantProfile();
        fetchFixedTemplates();
    }, []);

    useEffect(() => {
        if (viewingInvoice) {
            setModalTemplate(activeTemplate);
        }
    }, [viewingInvoice, activeTemplate]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)) {
                setActiveServiceDropdownIndex(null);
            }
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
                setShowClientDropdown(false);
            }
            if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target)) {
                setShowTemplateDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
                setEditorTemplate(res.data.invoiceTemplate);
            }
            const cd = res.data?.companyDetails || {};
            setCompany({
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
            console.error("Error fetching tenant profile", error);
        }
    };

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/invoices', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setInvoices(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching invoices", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/customers', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setCustomers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error fetching customers", error);
        }
    };

    // Auto-generate invoice number respecting GST vs Without GST
    const generateNextInvoiceNo = (currentInvoices = invoices, currentTaxRate = taxRate) => {
        try {
            const isWithoutGst = parseFloat(currentTaxRate) === 0;
            let maxNum = 0;

            const isSkite = user?.isSkiteTenant || user?.companyName?.toLowerCase().includes('skite') || user?.email?.includes('skite') || company?.name?.toLowerCase().includes('skite');
            const compName = user?.companyName || company?.name || '';
            const rawPrefix = compName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
            const companyPrefix = isSkite ? 'SKT' : (rawPrefix || 'INV');

            const filteredInvs = currentInvoices.filter(inv => {
                const invTax = parseFloat(inv.taxRate) || 0;
                if (isWithoutGst) return invTax === 0;
                return invTax > 0 && (inv.invoiceNumber || '').includes('26-27');
            });

            if (filteredInvs.length > 0) {
                filteredInvs.forEach(inv => {
                    const numMatch = (inv.invoiceNumber || '').match(/\d+$/);
                    if (numMatch) {
                        const n = parseInt(numMatch[0], 10);
                        if (n > maxNum) maxNum = n;
                    }
                });
                const nextNum = maxNum + 1;
                if (isWithoutGst) return `${companyPrefix}/25-26/N${nextNum}`;
                return `${companyPrefix}/26-27/${nextNum.toString().padStart(3, '0')}`;
            } else {
                return isWithoutGst 
                    ? (isSkite ? 'SKT/25-26/N47' : `${companyPrefix}/25-26/N001`) 
                    : (isSkite ? 'SKT/26-27/047' : `${companyPrefix}/26-27/001`);
            }
        } catch (e) {
            return `INV/26-27/001`;
        }
    };

    // Re-generate invoice number when taxRate changes (GST vs Non-GST) in new invoice mode
    useEffect(() => {
        if (!editId && viewMode === 'editor') {
            const nextNo = generateNextInvoiceNo(invoices, taxRate);
            setInvoiceNumber(nextNo);
        }
    }, [taxRate, invoices, user, viewMode]);

    // Reset Form for New Invoice
    const startNewInvoice = () => {
        const nextNo = generateNextInvoiceNo(invoices, 9);
        setEditId(null);
        setInvoiceNumber(nextNo);
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate('');
        setPaymentStatus('Unpaid');
        setCustomerId('');
        setCustomerName('');
        setCompanyName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerGst('');
        setAddressLine1('');
        setAddressLine2('');
        setLocationCity('');
        setItems([{ description: '', hsn: '', price: '', qty: 1 }]);
        setTaxRate(9);
        setDiscount(0);
        setNotes('');
        setTermsAndConditions(
            '1. 50% advance payment required to start the project.\n2. Final balance on project completion before live handover.\n3. Preview will be deployed on staging URL for approval before production release.'
        );
        setViewMode('editor');
    };

    // Edit Existing Invoice
    const handleEditClick = (inv) => {
        setEditId(inv._id);
        setInvoiceNumber(inv.invoiceNumber || '');
        setInvoiceDate(inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '');
        setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '');
        setPaymentStatus(inv.paymentStatus || 'Unpaid');

        // Customer details
        const cust = inv.customerId || {};
        setCustomerId(cust._id || cust.id || (typeof inv.customerId === 'string' ? inv.customerId : ''));
        setCustomerName(cust.customerName || cust.name || '');
        setCompanyName(cust.companyName || '');
        setCustomerPhone(cust.phone || '');
        setCustomerEmail(cust.email || '');
        setCustomerGst(cust.gstNumber || cust.gstNo || '');
        setAddressLine1(cust.billingAddress || cust.addressLine1 || '');
        setAddressLine2(cust.addressLine2 || '');
        setLocationCity(cust.location || '');

        // Items
        if (Array.isArray(inv.items) && inv.items.length > 0) {
            setItems(inv.items.map(it => ({
                description: it.itemName || it.description || '',
                hsn: it.hsn || it.hsnCode || '998314',
                price: it.rate !== undefined ? it.rate : (it.price !== undefined ? it.price : 0),
                qty: it.quantity !== undefined ? it.quantity : (it.qty !== undefined ? it.qty : 1)
            })));
        } else {
            setItems([{ description: '', hsn: '', price: '', qty: 1 }]);
        }

        setDiscount(inv.discount || 0);
        setNotes(inv.notes || '');
        setTermsAndConditions(inv.termsAndConditions || '');
        setViewMode('editor');
    };

    // Customer Selection Handler
    const handleSelectCustomer = (cust) => {
        setCustomerId(cust._id);
        setCustomerName(cust.customerName || '');
        setCompanyName(cust.companyName || cust.customerName || '');
        setCustomerPhone(cust.phone || '');
        setCustomerEmail(cust.email || '');
        setCustomerGst(cust.gstNumber || '');
        setAddressLine1(cust.billingAddress || '');
        setAddressLine2('');
        setLocationCity('');
        setShowClientDropdown(false);
    };

    // Line Item Handlers
    const handleItemChange = (index, field, value) => {
        const updated = [...items];
        updated[index][field] = value;
        setItems(updated);
    };

    const handleSelectServicePreset = (index, srv) => {
        const updated = [...items];
        updated[index].description = srv.name;
        updated[index].hsn = srv.hsn;
        setItems(updated);
        setActiveServiceDropdownIndex(null);
    };

    const addItem = () => setItems([...items, { description: '', hsn: '', price: '', qty: 1 }]);
    const removeItem = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    // ========================================================
    // LIVE TOTALS CALCULATION
    // ========================================================
    const calculateTotals = () => {
        const subtotal = items.reduce((acc, item) => {
            return acc + ((parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0));
        }, 0);
        const disc = parseFloat(discount) || 0;
        const taxable = Math.max(0, subtotal - disc);
        const rate = parseFloat(taxRate) || 0;
        const cgst = (taxable * rate) / 100;
        const sgst = (taxable * rate) / 100;
        const grandTotal = Math.round(taxable + cgst + sgst);
        return { subtotal, discount: disc, taxable, cgst, sgst, taxGstAmount: cgst + sgst, grandTotal };
    };

    const totals = calculateTotals();

    // ========================================================
    // ASSEMBLE LIVE INVOICE OBJECT FOR PREVIEW
    // ========================================================
    const liveInvoiceData = {
        _id: editId || 'live-preview-id',
        invoiceNumber: invoiceNumber || 'SKT/26-27/001',
        invoiceDate: invoiceDate || new Date().toISOString(),
        dueDate: dueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
        paymentStatus: paymentStatus,
        customerId: {
            customerName: customerName || 'Client Name',
            companyName: companyName || customerName || 'Client Company',
            phone: customerPhone,
            email: customerEmail,
            gstNumber: customerGst,
            billingAddress: [addressLine1, addressLine2, locationCity].filter(Boolean).join(', ') || 'Client Address'
        },
        clientDetails: {
            name: customerName || companyName || 'Client Name',
            phone: customerPhone,
            email: customerEmail,
            gstNo: customerGst,
            addressLine1: addressLine1,
            addressLine2: addressLine2,
            location: locationCity
        },
        items: items.map(it => ({
            description: it.description || 'Service Description',
            itemName: it.description || 'Service Description',
            hsn: it.hsn || '998314',
            hsnCode: it.hsn || '998314',
            price: parseFloat(it.price) || 0,
            rate: parseFloat(it.price) || 0,
            qty: parseFloat(it.qty) || 1,
            quantity: parseFloat(it.qty) || 1,
            total: (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1),
            amount: (parseFloat(it.price) || 0) * (parseFloat(it.qty) || 1)
        })),
        subtotal: totals.subtotal,
        subTotal: totals.subtotal,
        discount: totals.discount,
        taxRate: parseFloat(taxRate) || 0,
        cgst: totals.cgst,
        sgst: totals.sgst,
        taxGstAmount: totals.taxGstAmount,
        taxAmount: totals.taxGstAmount,
        grandTotal: totals.grandTotal,
        totalAmount: totals.grandTotal,
        notes: notes,
        termsAndConditions: termsAndConditions
    };

    // ========================================================
    // SAVE INVOICE (API)
    // ========================================================
    const handleSaveInvoice = async (e) => {
        if (e) e.preventDefault();
        if (!customerName.trim() && !customerId) {
            alert('Please enter or select a Client Name.');
            return;
        }
        if (items.some(it => !it.description && !it.price)) {
            alert('Please provide item description and price for all rows.');
            return;
        }

        setSavingInvoice(true);
        setSaveSuccessNotice('');

        try {
            // Auto-create customer if new customer name is typed without an ID
            let targetCustomerId = customerId;
            if (!targetCustomerId && customerName.trim()) {
                try {
                    const newCustRes = await axios.post('http://localhost:5000/api/customers', {
                        customerName: customerName.trim(),
                        companyName: companyName.trim() || customerName.trim(),
                        email: customerEmail.trim(),
                        phone: customerPhone.trim(),
                        gstNumber: customerGst.trim(),
                        billingAddress: [addressLine1, addressLine2, locationCity].filter(Boolean).join(', ')
                    }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                    targetCustomerId = newCustRes.data._id;
                    setCustomerId(targetCustomerId);
                    fetchCustomers();
                } catch (err) {
                    console.error("Auto customer creation notice:", err);
                }
            }

            const payload = {
                customerId: targetCustomerId || undefined,
                clientDetails: {
                    name: customerName || companyName,
                    phone: customerPhone,
                    email: customerEmail,
                    gstNo: customerGst,
                    addressLine1: addressLine1,
                    addressLine2: addressLine2,
                    location: locationCity
                },
                invoiceNumber: invoiceNumber,
                invoiceDate: invoiceDate,
                dueDate: dueDate || undefined,
                items: items.map(it => ({
                    itemName: it.description || 'Service',
                    quantity: Number(it.qty) || 1,
                    rate: Number(it.price) || 0,
                    amount: (Number(it.qty) || 1) * (Number(it.price) || 0)
                })),
                subtotal: totals.subtotal,
                discount: totals.discount,
                taxGstAmount: totals.taxGstAmount,
                grandTotal: totals.grandTotal,
                paymentStatus: paymentStatus,
                notes: notes,
                termsAndConditions: termsAndConditions
            };

            const token = localStorage.getItem('token');
            if (editId) {
                await axios.put(`http://localhost:5000/api/invoices/${editId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSaveSuccessNotice('Invoice Updated Successfully!');
            } else {
                await axios.post('http://localhost:5000/api/invoices', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSaveSuccessNotice('Invoice Created & Saved Successfully!');
            }

            fetchInvoices();
            setTimeout(() => {
                setSaveSuccessNotice('');
                setViewMode('list');
            }, 1500);
        } catch (error) {
            console.error("Error saving invoice", error);
            alert(error.response?.data?.message || "Error saving invoice to database.");
        } finally {
            setSavingInvoice(false);
        }
    };

    // WhatsApp Action
    const handleWhatsApp = () => {
        const rawPhone = (customerPhone || '').replace(/\D/g, '');
        if (!rawPhone) {
            alert("Phone number not entered for this client!");
            return;
        }
        const senderName = company.name || 'our company';
        const msg = encodeURIComponent(`Hello ${customerName || ''}, please find your invoice ${invoiceNumber || ''} for ₹${totals.grandTotal.toLocaleString('en-IN')}.\nThank you,\n${senderName}`);
        window.open(`https://wa.me/91${rawPhone}?text=${msg}`, '_blank');
    };

    // Email Action
    const handleEmail = () => {
        if (!customerEmail) {
            alert("Email address not entered for this client!");
            return;
        }
        const senderName = company.name || 'our company';
        const subject = encodeURIComponent(`Invoice ${invoiceNumber || ''} from ${senderName}`);
        const body = encodeURIComponent(`Hello ${customerName || ''},\n\nPlease find your invoice ${invoiceNumber || ''} for ₹${totals.grandTotal.toLocaleString('en-IN')}.\n\nThank you,\n${senderName}`);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${customerEmail}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
    };

    // PDF Download Action
    const handleDownloadEditorPdf = async () => {
        try {
            setSavingInvoice(true);
            await generateNativeInvoicePdf(
                liveInvoiceData,
                company,
                `Invoice_${(invoiceNumber || 'Draft').replace(/[\/\\]/g, '-')}`
            );
        } catch (e) {
            console.error("PDF generation error", e);
            alert("Failed to generate PDF");
        } finally {
            setSavingInvoice(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this invoice?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/invoices/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchInvoices();
        } catch (error) {
            console.error("Error deleting invoice", error);
        }
    };

    // Helper to identify GST vs Non-GST
    const isGSTInvoice = (inv) => {
        if (inv.taxRate !== undefined && Number(inv.taxRate) > 0) return true;
        if (inv.taxGstAmount !== undefined && Number(inv.taxGstAmount) > 0) return true;
        const invNum = inv.invoiceNumber || '';
        if (invNum.includes('26-27')) return true;
        if (invNum.includes('/N')) return false;
        return false;
    };

    const gstCount = invoices.filter(isGSTInvoice).length;
    const nonGstCount = invoices.length - gstCount;

    // Filter invoices for list view
    const filteredInvoices = invoices.filter(inv => {
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch = !q || (
            (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) || 
            (inv.customerId?.customerName && inv.customerId.customerName.toLowerCase().includes(q)) ||
            (inv.customerId?.companyName && inv.customerId.companyName.toLowerCase().includes(q)) ||
            (inv.customerId?.gstNumber && inv.customerId.gstNumber.toLowerCase().includes(q))
        );
        if (!matchesSearch) return false;
        if (statusFilter !== 'ALL' && inv.paymentStatus !== statusFilter) return false;

        const isGst = isGSTInvoice(inv);
        if (gstFilter === 'GST' && !isGst) return false;
        if (gstFilter === 'NONGST' && isGst) return false;

        return true;
    });

    const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE) || 1;
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // ========================================================
    // RENDER: 2-COLUMN SPLIT WORKSPACE (EDITOR MODE)
    // ========================================================
    if (viewMode === 'editor') {
        return (
            <div className="space-y-6 animate-fade-in text-slate-800">
                {/* Top Sticky Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#e6e6e3] shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#e6e6e3] bg-white hover:bg-[#f5f5f3] text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Invoices</span>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-[#111111] tracking-tight">
                                {editId ? 'View / Edit Invoice' : 'Create New Invoice'}
                            </h2>
                            <p className="text-xs text-slate-400 font-medium">
                                Two-column split workspace • Real-time live preview
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Quick Load Fixed Template Dropdown */}
                        {fixedTemplates.length > 0 && (
                            <div className="relative inline-block" ref={templateDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-[#f0f0ee] hover:bg-[#e6e6e3] text-[#3f3f3f] border border-[#e6e6e3] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                    title="Pre-fill with recurring monthly client template"
                                >
                                    <Repeat size={13} />
                                    <span className="hidden sm:inline">Load Fixed Template</span>
                                    <ChevronDown size={13} />
                                </button>
                                {showTemplateDropdown && (
                                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl border border-[#e6e6e3] shadow-xl z-50 p-1.5 space-y-1 animate-fade-up">
                                        <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                            Select Fixed Template ({fixedTemplates.length})
                                        </div>
                                        {fixedTemplates.map(tmpl => (
                                            <button
                                                key={tmpl._id}
                                                type="button"
                                                onClick={() => loadTemplateIntoInvoice(tmpl)}
                                                className="w-full text-left px-2.5 py-2 hover:bg-[#f0f0ee] rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
                                            >
                                                <div>
                                                    <span className="font-bold text-xs text-slate-800 group-hover:text-[#3f3f3f] block">
                                                        {tmpl.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                                                        {tmpl.clientDetails?.name}
                                                    </span>
                                                </div>
                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded font-mono ${
                                                    tmpl.taxRate > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {tmpl.taxRate > 0 ? 'GST 18%' : 'Non-GST'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {onNavigateToHistory && (
                            <button
                                type="button"
                                onClick={onNavigateToHistory}
                                className="flex items-center gap-1.5 px-3 py-2 bg-[#f0f0ee] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                <History size={14} />
                                <span>History</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                            <MessageCircle size={14} />
                            <span>WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleEmail}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A73E8] hover:bg-[#155fc0] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                            <Mail size={14} />
                            <span>Email</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadEditorPdf}
                            disabled={savingInvoice}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                            <Download size={14} />
                            <span>Download PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveInvoice}
                            disabled={savingInvoice}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {savingInvoice ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            <span>{editId ? 'Update Invoice' : 'Save Invoice'}</span>
                        </button>
                    </div>
                </div>

                {/* Save Notification Banner */}
                {saveSuccessNotice && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-fade-in shadow-xs">
                        <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                        <span>{saveSuccessNotice}</span>
                    </div>
                )}

                {/* ========================================================
                    TWO COLUMN WORKSPACE: 50% LEFT INPUTS | 50% RIGHT PREVIEW
                    ======================================================== */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    
                    {/* LEFT COLUMN: FORM INPUTS */}
                    <div className="space-y-6">
                        
                        {/* Section 1: Invoice Meta */}
                        <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                            <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <FileText size={16} />
                                <span>Invoice Details</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Invoice Number</label>
                                    <input 
                                        type="text" 
                                        value={invoiceNumber} 
                                        onChange={(e) => setInvoiceNumber(e.target.value)} 
                                        placeholder="e.g. INV/26-27/001" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] font-bold focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Invoice Date</label>
                                    <input 
                                        type="date" 
                                        value={invoiceDate} 
                                        onChange={(e) => setInvoiceDate(e.target.value)} 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Issued To (Customer Details) */}
                        <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                            <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                <User size={16} />
                                <span>Issued To (Client Details)</span>
                            </h3>

                            {/* Client Name with Autocomplete Dropdown */}
                            <div className="relative text-xs" ref={clientDropdownRef}>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                    Client / Company Name *
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={customerName} 
                                        onChange={(e) => {
                                             setCustomerName(e.target.value);
                                             setShowClientDropdown(true);
                                        }} 
                                        onFocus={() => setShowClientDropdown(true)}
                                        placeholder="Type or select client name..." 
                                        className="w-full pl-3 pr-10 py-2.5 border border-[#e6e6e3] rounded-xl font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                    <ChevronDown aria-hidden="true" className="workspace-autocomplete-chevron" />
                                </div>

                                {showClientDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-30 bg-white border border-[#e6e6e3] rounded-xl mt-1 max-h-52 overflow-y-auto shadow-xl">
                                        {customers
                                            .filter(c => (c.customerName || '').toLowerCase().includes(customerName.toLowerCase()) || 
                                                         (c.companyName || '').toLowerCase().includes(customerName.toLowerCase()))
                                            .map((c, i) => (
                                                <div 
                                                    key={i} 
                                                    onMouseDown={() => handleSelectCustomer(c)}
                                                    className="p-3 cursor-pointer border-b border-slate-100 hover:bg-[#f0f0ee]/50 transition-colors"
                                                >
                                                    <div className="font-bold text-[#111111] text-xs">{c.customerName}</div>
                                                    <div className="text-[11px] text-slate-500">{c.companyName} {c.gstNumber && `• GST: ${c.gstNumber}`}</div>
                                                </div>
                                            ))}
                                        {customers.filter(c => (c.customerName || '').toLowerCase().includes(customerName.toLowerCase())).length === 0 && (
                                            <div className="p-3 text-slate-400 text-xs italic">
                                                No saved customer matches. Continue typing to create fresh.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Client GST Number</label>
                                    <input 
                                        type="text" 
                                        value={customerGst} 
                                        onChange={(e) => setCustomerGst(e.target.value)} 
                                        placeholder="e.g. 33AAAAA0000A1Z5" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        value={customerPhone} 
                                        onChange={(e) => setCustomerPhone(e.target.value)} 
                                        placeholder="e.g. 9876543210" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={customerEmail} 
                                        onChange={(e) => setCustomerEmail(e.target.value)} 
                                        placeholder="e.g. client@company.com" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Billing Address</label>
                                    <input 
                                        type="text" 
                                        value={addressLine1} 
                                        onChange={(e) => setAddressLine1(e.target.value)} 
                                        placeholder="Address Line 1" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] mb-2"
                                    />
                                    <input 
                                        type="text" 
                                        value={addressLine2} 
                                        onChange={(e) => setAddressLine2(e.target.value)} 
                                        placeholder="Address Line 2 (Optional)" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] mb-2"
                                    />
                                    <input 
                                        type="text" 
                                        value={locationCity} 
                                        onChange={(e) => setLocationCity(e.target.value)} 
                                        placeholder="City / State / Pincode" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Line Items */}
                        <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2">
                                    <FilePlus size={16} />
                                    <span>Invoice Items</span>
                                </h3>
                                <button 
                                    type="button"
                                    onClick={addItem} 
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0f0ee] hover:bg-[#e6e6e3] text-[#3f3f3f] font-bold text-xs cursor-pointer transition-colors"
                                >
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="p-4 rounded-xl border border-[#e6e6e3] bg-[#f5f5f3]/50 space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                            {/* Description with preset dropdown */}
                                            <div className="sm:col-span-2 relative" ref={activeServiceDropdownIndex === index ? serviceDropdownRef : null}>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Service / Item Description</label>
                                                <div className="relative">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Type or select service preset..." 
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            handleItemChange(index, 'description', e.target.value);
                                                            setActiveServiceDropdownIndex(index);
                                                        }}
                                                        onFocus={() => setActiveServiceDropdownIndex(index)}
                                                        className="w-full pl-3 pr-9 py-2 bg-white border border-[#e6e6e3] rounded-lg text-[#111111] font-semibold focus:outline-none focus:border-[#111111]"
                                                    />
                                                    <ChevronDown aria-hidden="true" className="workspace-autocomplete-chevron" />
                                                </div>

                                                {activeServiceDropdownIndex === index && (
                                                    <div className="absolute top-full left-0 right-0 z-30 bg-white border border-[#e6e6e3] rounded-xl mt-1 max-h-48 overflow-y-auto shadow-xl">
                                                        {SERVICES_LIST
                                                            .filter(s => s.name.toLowerCase().includes((item.description || '').toLowerCase()))
                                                            .map((srv, i) => (
                                                                <div 
                                                                    key={i} 
                                                                    onMouseDown={() => handleSelectServicePreset(index, srv)}
                                                                    className="p-2.5 cursor-pointer border-b border-slate-100 hover:bg-[#f0f0ee]/50 flex justify-between items-center text-xs"
                                                                >
                                                                    <span className="font-bold text-slate-800">{srv.name}</span>
                                                                    <span className="font-mono text-[10px] text-slate-400">HSN: {srv.hsn}</span>
                                                                </div>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* HSN Code */}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">HSN Code</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. 998314" 
                                                    value={item.hsn} 
                                                    onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-lg font-mono text-[#111111] focus:outline-none focus:border-[#111111]"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Price (₹)</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="0.00" 
                                                    value={item.price} 
                                                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-lg font-mono font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-center">Qty</label>
                                                <input 
                                                    type="number" 
                                                    placeholder="1" 
                                                    value={item.qty} 
                                                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-lg font-mono font-bold text-[#111111] text-center focus:outline-none focus:border-[#111111]"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 text-right">Row Total</label>
                                                <div className="py-2 px-3 bg-[#f0f0ee] rounded-lg font-mono font-black text-[#111111] text-right">
                                                    ₹{((parseFloat(item.price) || 0) * (parseFloat(item.qty) || 0)).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="pt-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => removeItem(index)}
                                                    disabled={items.length === 1}
                                                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 disabled:opacity-30 cursor-pointer transition-colors"
                                                    title="Remove Item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                type="button"
                                onClick={addItem} 
                                className="w-full py-3 rounded-xl border border-dashed border-[#111111] text-[#3f3f3f] bg-[#f0f0ee]/50 hover:bg-[#f0f0ee] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                            >
                                <Plus size={16} /> Add Another Item
                            </button>
                        </div>

                        {/* Section 4: Taxes, Discounts & Notes */}
                        <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                            <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider border-b border-slate-100 pb-2">
                                Tax Rates & Terms
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Tax Rate (CGST % + SGST %)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={taxRate} 
                                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)} 
                                            className="w-24 px-3 py-2 border border-[#e6e6e3] rounded-xl font-bold font-mono text-[#111111] focus:outline-none focus:border-[#111111]"
                                        />
                                        <span className="text-slate-500 font-medium">% each (Total: {(parseFloat(taxRate) || 0) * 2}%)</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                        Discount (₹)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={discount} 
                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} 
                                        placeholder="0.00" 
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                            </div>

                            <div className="text-xs space-y-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Client Notes</label>
                                    <textarea 
                                        rows="2"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional notes for client..."
                                        className="w-full p-2.5 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Terms & Conditions</label>
                                    <textarea 
                                        rows="3"
                                        value={termsAndConditions}
                                        onChange={(e) => setTermsAndConditions(e.target.value)}
                                        className="w-full p-2.5 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111]"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: LIVE REAL-TIME PREVIEW */}
                    <div className="space-y-4 lg:sticky lg:top-4">
                        <div className="p-3 bg-[#111111] text-white rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="text-xs font-black tracking-wide uppercase">Live Interactive Preview</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={editorTemplate}
                                    onChange={(e) => setEditorTemplate(e.target.value)}
                                    className="workspace-select-dark px-2.5 py-1 bg-[#303030] text-white rounded-lg text-[11px] font-bold border border-slate-700 outline-none"
                                >
                                    {INVOICE_TEMPLATES.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Printable Live Invoice Card */}
                        <div className="bg-white rounded-2xl shadow-xl border border-[#e6e6e3] overflow-hidden">
                            <InvoiceRenderer 
                                innerRef={editorPreviewRef}
                                invoice={liveInvoiceData} 
                                templateId={editorTemplate} 
                                company={company} 
                            />
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // ========================================================
    // RENDER: INVOICES LIST TABLE (VIEW MODE = 'LIST')
    // ========================================================
    return (
        <div className="space-y-6">

            {/* Header: Clean & Neat */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-2xl font-black text-[#111111] tracking-tight">Invoices</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Create invoices, view status, and manage client billings.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Link to Invoice History page */}
                    {onNavigateToHistory && (
                        <button
                            onClick={onNavigateToHistory}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#f0f0ee] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-[#e6e6e3]"
                        >
                            <History size={16} className="text-[#3f3f3f]" />
                            <span>Invoice History & Filter</span>
                            <ArrowRight size={14} className="text-slate-400" />
                        </button>
                    )}

                    {/* Quick Load Fixed Template in List view */}
                    {fixedTemplates.length > 0 && (
                        <div className="relative inline-block" ref={templateDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                                className="px-3.5 py-2.5 bg-[#f0f0ee] hover:bg-[#e6e6e3] text-[#3f3f3f] border border-[#e6e6e3] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
                                title="Instantly create invoice from recurring client template"
                            >
                                <Repeat size={14} />
                                <span>Load Template</span>
                                <ChevronDown size={14} />
                            </button>
                            {showTemplateDropdown && (
                                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl border border-[#e6e6e3] shadow-xl z-50 p-1.5 space-y-1 animate-fade-up">
                                    <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        Fixed Monthly Clients ({fixedTemplates.length})
                                    </div>
                                    {fixedTemplates.map(tmpl => (
                                        <button
                                            key={tmpl._id}
                                            type="button"
                                            onClick={() => loadTemplateIntoInvoice(tmpl)}
                                            className="w-full text-left px-2.5 py-2 hover:bg-[#f0f0ee] rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
                                        >
                                            <div>
                                                <span className="font-bold text-xs text-slate-800 group-hover:text-[#3f3f3f] block">
                                                    {tmpl.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                                                    {tmpl.clientDetails?.name}
                                                </span>
                                            </div>
                                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded font-mono ${
                                                tmpl.taxRate > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                                            }`}>
                                                {tmpl.taxRate > 0 ? 'GST 18%' : 'Non-GST'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Create Invoice Button: Switches directly to 2-Column Workspace! */}
                    <button 
                        onClick={startNewInvoice}
                        className="flex items-center gap-2 bg-[#111111] hover:bg-[#303030] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Create Invoice</span>
                    </button>
                </div>
            </div>

            {/* Quick GST vs Non-GST Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => { setGstFilter('ALL'); setCurrentPage(1); }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        gstFilter === 'ALL'
                            ? 'bg-[#111111] text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-[#f0f0ee] border border-[#e6e6e3]'
                    }`}
                >
                    <Layers size={14} />
                    <span>All Invoices</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        gstFilter === 'ALL' ? 'bg-[#303030] text-slate-200' : 'bg-[#f0f0ee] text-slate-600'
                    }`}>
                        {invoices.length}
                    </span>
                </button>

                <button
                    onClick={() => { setGstFilter('GST'); setCurrentPage(1); }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        gstFilter === 'GST'
                            ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                            : 'bg-white text-slate-600 hover:bg-[#f0f0ee] border border-[#e6e6e3]'
                    }`}
                >
                    <FileText size={14} />
                    <span>GST Invoices</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        gstFilter === 'GST' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 font-bold'
                    }`}>
                        {gstCount}
                    </span>
                </button>

                <button
                    onClick={() => { setGstFilter('NONGST'); setCurrentPage(1); }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        gstFilter === 'NONGST'
                            ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                            : 'bg-white text-slate-600 hover:bg-[#f0f0ee] border border-[#e6e6e3]'
                    }`}
                >
                    <FileText size={14} />
                    <span>Without GST</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        gstFilter === 'NONGST' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700 font-bold'
                    }`}>
                        {nonGstCount}
                    </span>
                </button>
            </div>

            {/* Clean Minimal Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#f5f5f3]/80 rounded-2xl border border-[#e6e6e3]/80">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search invoices by number or customer..." 
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-[#e6e6e3] rounded-xl outline-none focus:border-[#111111] text-xs font-medium"
                    />
                    {searchTerm && (
                        <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto">
                    {['ALL', 'Paid', 'Unpaid', 'Partial'].map(st => (
                        <button
                            key={st}
                            onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                statusFilter === st
                                    ? 'bg-[#111111] text-white shadow-xs'
                                    : 'bg-white text-slate-600 border border-[#e6e6e3] hover:bg-[#f5f5f3]'
                            }`}
                        >
                            {st === 'ALL' ? 'All' : st}
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#e6e6e3] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f5f5f3] border-b border-[#e6e6e3] text-[11px] uppercase text-slate-400 font-bold tracking-wider">
                                <th className="py-4 px-6">Invoice #</th>
                                <th className="py-4 px-6">Customer</th>
                                <th className="py-4 px-6">Date</th>
                                <th className="py-4 px-6">Amount</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-16 text-center text-slate-500">
                                        <div className="flex flex-col items-center max-w-sm mx-auto">
                                            <FileText size={44} className="text-slate-300 mb-2" />
                                            <p className="text-base font-bold text-slate-800">No invoices found</p>
                                            <p className="text-xs text-slate-400 mt-1">Click "Create Invoice" to open the 2-column workspace.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-[#f5f5f3]/70 transition-colors">
                                        <td className="py-4 px-6 font-mono font-bold text-[#111111] text-sm">
                                            {inv.invoiceNumber}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-[#111111] text-sm">
                                                {inv.customerId?.customerName || inv.customerId?.companyName || 'Unknown Customer'}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {inv.customerId?.companyName && inv.customerId?.companyName !== inv.customerId?.customerName ? inv.customerId.companyName : (inv.customerId?.email || '')}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-600 font-medium">
                                            {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </td>
                                        <td className="py-4 px-6 font-bold text-[#111111] font-mono text-sm">
                                            ₹{(inv.grandTotal || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                inv.paymentStatus === 'Paid' 
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                    : inv.paymentStatus === 'Partial'
                                                    ? 'bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3]'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {inv.paymentStatus || 'Unpaid'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* Quick View Button */}
                                                <button 
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="p-1.5 text-slate-400 hover:text-[#111111] hover:bg-[#f0f0ee] rounded-lg transition-colors cursor-pointer"
                                                    title="Quick View"
                                                >
                                                    <Eye size={16} />
                                                </button>

                                                {/* Edit in 2-Column Workspace */}
                                                <button 
                                                    onClick={() => handleEditClick(inv)}
                                                    className="p-1.5 text-slate-400 hover:text-[#3f3f3f] hover:bg-[#f0f0ee] rounded-lg transition-colors cursor-pointer"
                                                    title="Edit in Split Workspace"
                                                >
                                                    <Pencil size={16} />
                                                </button>

                                                {/* Download PDF */}
                                                <button 
                                                    onClick={() => setViewingInvoice(inv)}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Download PDF"
                                                >
                                                    <Download size={16} />
                                                </button>

                                                {/* Delete */}
                                                <button 
                                                    onClick={() => handleDelete(inv._id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 15 Records Pagination */}
                {filteredInvoices.length > PAGE_SIZE && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <span>
                            Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length} invoices
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-[#e6e6e3] bg-white hover:bg-[#f5f5f3] disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 font-bold cursor-pointer"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <span className="font-bold text-slate-700 px-2">Page {currentPage} of {totalPages}</span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-[#e6e6e3] bg-white hover:bg-[#f5f5f3] disabled:opacity-40 disabled:hover:bg-white flex items-center gap-1 font-bold cursor-pointer"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick View Modal (Rendered via Portal to body) */}
            {viewingInvoice && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setViewingInvoice(null);
                    }}
                >
                    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#e6e6e3] h-[92vh] max-h-[92vh] flex flex-col overflow-hidden animate-scale-in text-left">
                        {/* Header Bar */}
                        <div className="shrink-0 px-6 py-4 bg-[#111111] text-white flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-[#303030] text-emerald-400">
                                    <FileText size={18} />
                                </span>
                                <div>
                                    <h3 className="font-extrabold text-base">Invoice {viewingInvoice.invoiceNumber}</h3>
                                    <p className="text-xs text-slate-400">
                                        Client: {viewingInvoice.customerId?.customerName || 'Customer'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (viewingInvoice) {
                                            await generateNativeInvoicePdf(
                                                viewingInvoice,
                                                company,
                                                `Invoice_${viewingInvoice.invoiceNumber || 'Export'}`
                                            );
                                        }
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#111111] hover:bg-[#303030] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                                >
                                    <Download size={14} />
                                    <span>Download PDF</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const target = viewingInvoice;
                                        setViewingInvoice(null);
                                        handleEditClick(target);
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#111111] hover:bg-[#303030] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                    <Pencil size={14} />
                                    <span>Edit</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewingInvoice(null)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#303030] transition-colors cursor-pointer"
                                    title="Close (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Invoice Rendered Preview Body */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#f0f0ee]/60 flex justify-center">
                            <div 
                                id="printable-invoice-modal-content"
                                ref={previewModalRef} 
                                className="w-full max-w-4xl bg-white shadow-xl rounded-xl overflow-hidden border border-[#e6e6e3] my-auto"
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
        </div>
    );
}
