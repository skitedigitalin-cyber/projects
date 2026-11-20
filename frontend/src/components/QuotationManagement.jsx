import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
    Plus, Search, FileText, Download, Trash2, X, Pencil, 
    Eye, Printer, ArrowLeft, Loader2, Check, Sparkles,
    ChevronDown, ChevronLeft, ChevronRight, MessageCircle, Mail, Save, User,
    Calendar, CheckCircle, Clock, AlertCircle, Columns, FileEdit, Building2,
    DollarSign, FileCheck, Repeat
} from 'lucide-react';
import QuoteRenderer from './quoteTemplates/QuoteRenderer';
import { generateNativeQuotePdf } from '../utils/quotePdfGenerator';

// Quick Preset Services & Packages for Digital Agencies
const PRESET_SERVICES = [
    { name: 'UX/UI DESIGN', hsn: '998314', defaultSub: '• Wireframes & High-fidelity Prototype\n• Design System & Component Library\n• Mobile & Desktop Responsive Screens' },
    { name: 'WEB DEVELOPMENT', hsn: '998314', defaultSub: '• Responsive Modern Frontend\n• Scalable Backend & Database Integration\n• SEO Meta Tags & Fast Cloudflare Setup' },
    { name: 'FULL STACK APP DEVELOPMENT', hsn: '998314', defaultSub: '• Cross-platform React / Flutter App\n• User Authentication & Secure APIs\n• Push Notifications & App Store Ready' },
    { name: 'META ADS CAMPAIGN', hsn: '998365', defaultSub: '• Target Audience Research & Setup\n• Ad Creatives & Copywriting\n• Weekly Optimization & ROAS Tracking' },
    { name: 'SOCIAL MEDIA MANAGEMENT', hsn: '998313', defaultSub: '• 12 Premium Posts & 8 Stories / Month\n• Content Calendar & Caption Strategy\n• Community Engagement & Growth' },
    { name: 'VIDEO SHOOT & REELS', hsn: '998382', defaultSub: '• On-site 4K Camera & Lighting Setup\n• Product / Brand Cinematic B-Rolls\n• Scripting & Storyboard Planning' },
    { name: 'VIDEO EDITING', hsn: '998386', defaultSub: '• Color Grading & Sound Design\n• Trendy Transitions & Dynamic Subtitles\n• Optimized for Reels & YouTube' },
    { name: 'SEO & LOCAL CITATIONS', hsn: '998319', defaultSub: '• On-Page & Technical SEO Audit\n• Google Business Profile Optimization\n• High DA Backlinks & Keyword Ranking' },
    { name: 'BRAND IDENTITY & LOGO', hsn: '998392', defaultSub: '• 3 Unique Logo Concepts & Vector Assets\n• Color Palette & Typography Guidelines\n• Business Card & Letterhead Stationery' }
];

export default function QuotationManagement({ initialTemplate, onClearInitialTemplate }) {
    const { user } = useAuth();
    // Mode: 'list' (quotes table) or 'editor' (workspace)
    const [viewMode, setViewMode] = useState('list');
    
    // Editor Workspace Tab: 'split' (side-by-side) | 'input' (form only) | 'preview' (preview only)
    const [editorTab, setEditorTab] = useState('split');

    // Data States
    const [quotes, setQuotes] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [fixedTemplates, setFixedTemplates] = useState([]);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const templateDropdownRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [savingQuote, setSavingQuote] = useState(false);
    const [saveSuccessNotice, setSaveSuccessNotice] = useState('');

    // List Search & Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [gstFilter, setGstFilter] = useState('ALL'); // 'ALL' | 'GST' | 'NONGST'
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 15;

    // Company Profile & Assets
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

    // Quick View Modal
    const [viewingQuote, setViewingQuote] = useState(null);
    const [rowDownloadingId, setRowDownloadingId] = useState(null);

    // ========================================================
    // EDITOR FORM STATES
    // ========================================================
    const [editId, setEditId] = useState(null);
    const [quoteNo, setQuoteNo] = useState('');
    const [refNo, setRefNo] = useState('');
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [validUntil, setValidUntil] = useState('');
    const [quoteStatus, setQuoteStatus] = useState('Sent');

    // Client Info
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerGst, setCustomerGst] = useState('');
    const [address, setAddress] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const clientDropdownRef = useRef(null);

    // Line Items
    const [items, setItems] = useState([
        { description: '', subDescription: '', hsn: '998314', price: '', qty: 1 }
    ]);
    const [activeServiceDropdownIndex, setActiveServiceDropdownIndex] = useState(null);
    const serviceDropdownRef = useRef(null);

    // Tax & Terms
    const [taxRate, setTaxRate] = useState(18); // 18% (9% + 9%)
    const [terms, setTerms] = useState(
        '1. 50% advance payment required to initiate the project.\n2. Balance 50% upon project completion and staging approval prior to final handover/launch.\n3. The complete project will be hosted on our staging server for client preview and revisions.\n4. Quotation is valid for 15 days from the date of issue.'
    );
    const [notes, setNotes] = useState('');

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    };

    // ========================================================
    // LIFECYCLE & DATA FETCH
    // ========================================================
    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/quotes', { headers: getHeaders() });
            setQuotes(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/customers', { headers: getHeaders() });
            setCustomers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchTenantProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('http://localhost:5000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
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
        } catch (e) {
            console.error('Tenant fetch error:', e);
        }
    };

    const fetchFixedTemplates = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/fixed-templates', { headers: getHeaders() });
            setFixedTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Error fetching fixed templates in quote:', e);
        }
    };

    useEffect(() => {
        fetchQuotes();
        fetchCustomers();
        fetchTenantProfile();
        fetchFixedTemplates();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, gstFilter]);

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

    // Generate Next Quote Number Helper
    const generateNextQuoteNo = (quotesList) => {
        let maxNum = 0;
        const isSkite = user?.isSkiteTenant || user?.companyName?.toLowerCase().includes('skite') || user?.email?.includes('skite') || company?.name?.toLowerCase().includes('skite');
        const compName = user?.companyName || company?.name || '';
        const rawPrefix = compName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
        const companyPrefix = isSkite ? 'SKT' : (rawPrefix || 'QT');

        (quotesList || []).forEach(q => {
            if (!q.quoteNo) return;
            const match = q.quoteNo.match(/(\d+)/g);
            if (match && match.length > 0) {
                const num = parseInt(match[match.length - 1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : (quotesList.length + 1);
        return `${companyPrefix}-Q${String(nextNum).padStart(3, '0')}`;
    };

    // Load Pre-saved Fixed Template into Quote Editor
    const loadTemplateIntoQuote = (tmpl) => {
        const nextNo = generateNextQuoteNo(quotes);
        setEditId(null);
        setQuoteNo(nextNo);
        setRefNo('');
        setQuoteDate(new Date().toISOString().split('T')[0]);
        const valDate = new Date();
        valDate.setDate(valDate.getDate() + 15);
        setValidUntil(valDate.toISOString().split('T')[0]);
        setQuoteStatus('Sent');

        setCustomerId('');
        setCustomerName(tmpl.clientDetails?.name || tmpl.name || '');
        setCustomerPhone(tmpl.clientDetails?.phone || '');
        setCustomerEmail(tmpl.clientDetails?.email || '');
        setCustomerGst(tmpl.clientDetails?.gstNo || '');

        const addr = [
            tmpl.clientDetails?.addressLine1,
            tmpl.clientDetails?.addressLine2,
            tmpl.clientDetails?.location
        ].filter(Boolean).join(', ');
        setAddress(addr);

        if (tmpl.items && tmpl.items.length > 0) {
            setItems(tmpl.items.map(it => ({
                description: it.description || '',
                subDescription: '',
                hsn: it.hsn || '998314',
                price: it.price || '',
                qty: it.qty || 1
            })));
        }
        // In FixedTemplate, taxRate 9 means 18% GST (9% CGST + 9% SGST), 0 means Non-GST
        setTaxRate(tmpl.taxRate === 9 ? 18 : (Number(tmpl.taxRate) || 0));
        setNotes(tmpl.notes || '');
        setShowTemplateDropdown(false);
        setSaveSuccessNotice('');
        setViewMode('editor');
    };

    // Auto-load template if passed from parent
    useEffect(() => {
        if (initialTemplate) {
            loadTemplateIntoQuote(initialTemplate);
            if (onClearInitialTemplate) onClearInitialTemplate();
        }
    }, [initialTemplate]);

    // Open Editor for Creating New Quote
    const handleOpenCreateEditor = () => {
        const nextNo = generateNextQuoteNo(quotes);
        setEditId(null);
        setQuoteNo(nextNo);
        setRefNo('');
        setQuoteDate(new Date().toISOString().split('T')[0]);
        // Default valid for 15 days
        const valDate = new Date();
        valDate.setDate(valDate.getDate() + 15);
        setValidUntil(valDate.toISOString().split('T')[0]);
        setQuoteStatus('Sent');

        setCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerGst('');
        setAddress('');

        setItems([
            { 
                description: 'UX/UI DESIGN & WEB DEVELOPMENT', 
                subDescription: '• Complete Brand UI/UX Design System\n• High-performance Fullstack Web App\n• Free Domain, SSL & 1 Year Cloud Hosting', 
                hsn: '998314', 
                price: 25000, 
                qty: 1 
            }
        ]);
        setTaxRate(18);
        setTerms(
            '1. 50% advance payment required to initiate the project.\n2. Balance 50% upon project completion and staging approval prior to final handover/launch.\n3. The complete project will be hosted on our staging server for client preview and revisions.\n4. Quotation is valid for 15 days from the date of issue.'
        );
        setNotes('');
        setSaveSuccessNotice('');
        setViewMode('editor');
    };

    // Open Editor for Editing an Existing Quote
    const handleOpenEditEditor = (quote) => {
        setEditId(quote._id);
        setQuoteNo(quote.quoteNo || '');
        setRefNo(quote.refNo || '');
        setQuoteDate(quote.date ? new Date(quote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setValidUntil(quote.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : '');
        setQuoteStatus(quote.status || 'Sent');

        const client = quote.clientDetails || {};
        setCustomerName(client.name || client.customerName || '');
        setCustomerPhone(client.phone || '');
        setCustomerEmail(client.email || '');
        setCustomerGst(client.gst || '');
        setAddress(client.address || '');

        if (quote.items && quote.items.length > 0) {
            setItems(quote.items.map(it => ({
                description: it.description || '',
                subDescription: it.subDescription || '',
                hsn: it.hsn || '',
                price: it.price !== undefined ? it.price : '',
                qty: it.qty !== undefined ? it.qty : 1
            })));
        } else {
            setItems([{ description: '', subDescription: '', hsn: '', price: '', qty: 1 }]);
        }

        setTaxRate(quote.taxRate !== undefined ? Number(quote.taxRate) : 18);
        setTerms(quote.terms || '');
        setNotes(quote.notes || '');
        setSaveSuccessNotice('');
        setViewMode('editor');
    };

    // Customer Selection
    const handleSelectCustomer = (cust) => {
        setCustomerId(cust._id || '');
        setCustomerName(cust.customerName || cust.companyName || '');
        setCustomerPhone(cust.phone || '');
        setCustomerEmail(cust.email || '');
        setCustomerGst(cust.gstNumber || cust.gstNo || '');

        let fullAddr = [cust.addressLine1, cust.addressLine2, cust.city].filter(Boolean).join(', ');
        if (!fullAddr && cust.address) fullAddr = cust.address;
        setAddress(fullAddr);

        setShowClientDropdown(false);
    };

    // Items Manipulation
    const handleItemChange = (index, field, value) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSelectPresetService = (index, service) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                description: service.name,
                hsn: service.hsn || '998314',
                subDescription: service.defaultSub || ''
            };
            return updated;
        });
        setActiveServiceDropdownIndex(null);
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { description: '', subDescription: '', hsn: '998314', price: '', qty: 1 }
        ]);
    };

    const handleRemoveItem = (index) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Calculate Form Totals
    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => {
            const p = Number(item.price) || 0;
            const q = Number(item.qty) || 0;
            return sum + (p * q);
        }, 0);

        const currentTax = Number(taxRate) || 0;
        const halfRate = currentTax / 2;
        const cgst = currentTax === 0 ? 0 : Math.round(subtotal * (halfRate / 100));
        const sgst = currentTax === 0 ? 0 : Math.round(subtotal * (halfRate / 100));
        const taxAmount = cgst + sgst;
        const grandTotal = subtotal + taxAmount;

        return { subtotal, cgst, sgst, taxAmount, grandTotal };
    };

    // Live Quotation Object for Preview & PDF
    const totals = calculateTotals();
    const currentPreviewData = {
        _id: editId || 'live-preview-id',
        quoteNo: quoteNo || 'SKT-Q001',
        refNo: refNo || '',
        date: quoteDate || new Date().toISOString().split('T')[0],
        validUntil: validUntil || '',
        status: quoteStatus || 'Sent',
        clientDetails: {
            name: customerName || 'Client / Business Name',
            address: address || '',
            gst: customerGst || '',
            phone: customerPhone || '',
            email: customerEmail || ''
        },
        items: items.map(it => ({
            description: it.description || '',
            subDescription: it.subDescription || '',
            hsn: it.hsn || '',
            price: Number(it.price) || 0,
            qty: Number(it.qty) || 1,
            total: (Number(it.price) || 0) * (Number(it.qty) || 1)
        })),
        taxRate: Number(taxRate),
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        terms,
        notes
    };

    // Save Quotation Handler
    const handleSaveQuote = async () => {
        if (!customerName || customerName.trim() === '') {
            alert('Please enter or select a Client / Company Name.');
            return;
        }

        const validItems = items.filter(it => it.description && it.description.trim() !== '');
        if (validItems.length === 0) {
            alert('Please add at least one quotation item with a description.');
            return;
        }

        try {
            setSavingQuote(true);
            const payload = {
                quoteNo: quoteNo || generateNextQuoteNo(quotes),
                refNo: refNo ? refNo.trim() : '',
                date: quoteDate ? new Date(quoteDate) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null,
                clientDetails: {
                    name: customerName.trim(),
                    address: (address || '').trim(),
                    gst: (customerGst || '').trim(),
                    phone: (customerPhone || '').trim(),
                    email: (customerEmail || '').trim()
                },
                items: validItems.map(it => ({
                    description: it.description.trim(),
                    subDescription: (it.subDescription || '').trim(),
                    hsn: (it.hsn || '').trim(),
                    price: Number(it.price) || 0,
                    qty: Number(it.qty) || 1,
                    total: (Number(it.price) || 0) * (Number(it.qty) || 1)
                })),
                taxRate: Number(taxRate) || 0,
                subtotal: Number(totals.subtotal) || 0,
                cgst: Number(totals.cgst) || 0,
                sgst: Number(totals.sgst) || 0,
                taxAmount: Number(totals.taxAmount) || 0,
                grandTotal: Number(totals.grandTotal) || 0,
                terms: terms || '',
                status: quoteStatus || 'Sent',
                notes: notes || ''
            };

            let res;
            if (editId) {
                res = await axios.put(`http://localhost:5000/api/quotes/${editId}`, payload, { headers: getHeaders() });
            } else {
                res = await axios.post('http://localhost:5000/api/quotes', payload, { headers: getHeaders() });
            }

            setSaveSuccessNotice(editId ? 'Quotation updated successfully!' : 'Quotation created successfully!');
            await fetchQuotes();
            setTimeout(() => {
                setViewMode('list');
            }, 700);
        } catch (error) {
            console.error('Error saving quotation:', error);
            alert(error.response?.data?.message || 'Failed to save quotation');
        } finally {
            setSavingQuote(false);
        }
    };

    // Delete Quotation
    const handleDeleteQuote = async (id) => {
        if (!window.confirm('Are you sure you want to delete this quotation?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/quotes/${id}`, { headers: getHeaders() });
            fetchQuotes();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete quotation');
        }
    };

    // Update Status from Quick View or Table
    const handleUpdateStatus = async (quote, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/quotes/${quote._id}`, { status: newStatus }, { headers: getHeaders() });
            setQuotes(prev => prev.map(q => q._id === quote._id ? { ...q, status: newStatus } : q));
            if (viewingQuote && viewingQuote._id === quote._id) {
                setViewingQuote(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            alert('Failed to update status');
        }
    };

    // PDF Download for Editor
    const handleDownloadEditorPdf = async () => {
        try {
            setSavingQuote(true);
            const safeName = (customerName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
            const safeQuoteNo = (quoteNo || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `${safeQuoteNo}_${safeName}`;
            await generateNativeQuotePdf(currentPreviewData, company, fileName);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setSavingQuote(false);
        }
    };

    // PDF Download from Table Row or Modal
    const handleDownloadRowPdf = async (quote) => {
        try {
            setRowDownloadingId(quote._id);
            const safeName = (quote.clientDetails?.name || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
            const safeQuoteNo = (quote.quoteNo || 'Quotation').replace(/[^a-zA-Z0-9_-]/g, '_');
            const fileName = `${safeQuoteNo}_${safeName}`;
            await generateNativeQuotePdf(quote, company, fileName);
        } catch (err) {
            console.error('PDF generation error:', err);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setRowDownloadingId(null);
        }
    };

    // WhatsApp Share
    const handleWhatsApp = () => {
        if (!customerPhone) {
            alert('Please enter a client phone number first.');
            return;
        }
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const senderName = company.name || 'Company';
        const msg = `*QUOTATION FROM ${senderName}*\n\n` +
            `Quote No: *${quoteNo}*\n` +
            `Client: *${customerName || 'Valued Client'}*\n` +
            `Date: *${quoteDate}*\n` +
            `Total Quoted Value: *₹${totals.grandTotal.toLocaleString('en-IN')}*\n\n` +
            `Thank you for your interest! A formal quotation PDF is ready for your review. Please let us know if you need any customizations.`;
        window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // Email Share
    const handleEmail = () => {
        if (!customerEmail) {
            alert('Please enter a client email address first.');
            return;
        }
        const senderName = company.name || 'Company';
        const subject = `Quotation ${quoteNo} from ${senderName}`;
        const body = `Dear ${customerName || 'Client'},\n\nPlease find the quotation details below:\n\n` +
            `Quote No: ${quoteNo}\n` +
            `Date: ${quoteDate}\n` +
            `Total Amount: ₹${totals.grandTotal.toLocaleString('en-IN')}\n\n` +
            `Kindly let us know if you have any questions or require any adjustments.\n\n` +
            `Best regards,\n${senderName}`;
        window.open(`mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    // GST vs Non-GST Detector
    const isGSTQuote = (quote) => {
        if (!quote) return false;
        if (quote.taxRate !== undefined && Number(quote.taxRate) > 0) return true;
        if (quote.taxAmount !== undefined && Number(quote.taxAmount) > 0) return true;
        if (quote.cgst !== undefined && Number(quote.cgst) > 0) return true;
        const num = quote.quoteNo || '';
        if (num.includes('/N') || num.includes('-N')) return false;
        return false;
    };

    const gstQuotes = quotes.filter(isGSTQuote);
    const nonGstQuotes = quotes.filter(q => !isGSTQuote(q));
    const gstCount = gstQuotes.length;
    const nonGstCount = nonGstQuotes.length;
    const totalRevenue = quotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const gstRevenue = gstQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);
    const nonGstRevenue = nonGstQuotes.reduce((sum, q) => sum + (q.grandTotal || 0), 0);

    // Filtered Quotes for List Table
    const filteredQuotes = quotes.filter(q => {
        const matchesSearch = !searchTerm || 
            q.quoteNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.clientDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.clientDetails?.gst?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.items?.some(i => i.description?.toLowerCase().includes(searchTerm.toLowerCase()));

        const isGst = isGSTQuote(q);
        if (gstFilter === 'GST' && !isGst) return false;
        if (gstFilter === 'NONGST' && isGst) return false;

        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredQuotes.length / PAGE_SIZE) || 1;
    const validPage = Math.min(currentPage, totalPages);
    const paginatedQuotes = filteredQuotes.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    const getTaxBadge = (quote) => {
        const isGst = isGSTQuote(quote);
        if (isGst) {
            const rate = quote.taxRate !== undefined ? quote.taxRate : 18;
            return (
                <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-600 border border-blue-200">
                    GST {rate}%
                </span>
            );
        }
        return (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Non-GST
            </span>
        );
    };

    // ========================================================
    // RENDER: EDITOR WORKSPACE (WITH INPUT & PREVIEW TABS)
    // ========================================================
    if (viewMode === 'editor') {
        return (
            <div className="space-y-6 animate-fade-in text-slate-800">
                {/* Top Sticky Header Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Quotations</span>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {editId ? `Edit Quotation #${quoteNo}` : 'Create New Quotation'}
                            </h2>
                            <p className="text-xs text-slate-400 font-medium">
                                Two-column split workspace • Real-time live interactive preview
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* View Switcher: Split View / Input Tab / Preview Tab */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold mr-1">
                            <button
                                type="button"
                                onClick={() => setEditorTab('split')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    editorTab === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Split view: Form on left, live preview on right"
                            >
                                <Columns size={14} />
                                <span className="hidden sm:inline">Split View</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorTab('input')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    editorTab === 'input' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Show input form full width"
                            >
                                <FileEdit size={14} />
                                <span>Input Tab</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditorTab('preview')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    editorTab === 'preview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                }`}
                                title="Show live interactive preview full width"
                            >
                                <Eye size={14} />
                                <span>Preview Tab</span>
                            </button>
                        </div>

                        {/* Quick Load Fixed Template Dropdown */}
                        {fixedTemplates.length > 0 && (
                            <div className="relative inline-block" ref={templateDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                                    title="Pre-fill with recurring monthly client template"
                                >
                                    <Repeat size={13} />
                                    <span className="hidden sm:inline">Load Fixed Template</span>
                                    <ChevronDown size={13} />
                                </button>
                                {showTemplateDropdown && (
                                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5 space-y-1 animate-fade-up">
                                        <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                            Select Fixed Template ({fixedTemplates.length})
                                        </div>
                                        {fixedTemplates.map(tmpl => (
                                            <button
                                                key={tmpl._id}
                                                type="button"
                                                onClick={() => loadTemplateIntoQuote(tmpl)}
                                                className="w-full text-left px-2.5 py-2 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
                                            >
                                                <div>
                                                    <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 block">
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

                        {/* Communication Actions */}
                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                            title="Share quote summary on WhatsApp"
                        >
                            <MessageCircle size={14} />
                            <span className="hidden md:inline">WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleEmail}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A73E8] hover:bg-[#155fc0] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                            title="Send quotation email"
                        >
                            <Mail size={14} />
                            <span className="hidden md:inline">Email</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadEditorPdf}
                            disabled={savingQuote}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            title="Generate crisp vector PDF (~150KB)"
                        >
                            <Download size={14} />
                            <span>Download PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveQuote}
                            disabled={savingQuote}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {savingQuote ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                            <span>{editId ? 'Update Quotation' : 'Save Quotation'}</span>
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
                    WORKSPACE CONTENT BASED ON SELECTED TAB
                    ======================================================== */}
                <div className={`grid gap-8 items-start ${
                    editorTab === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                }`}>
                    
                    {/* LEFT COLUMN: FORM INPUTS (Visible when editorTab is 'split' or 'input') */}
                    {(editorTab === 'split' || editorTab === 'input') && (
                        <div className={`space-y-6 ${editorTab === 'input' ? 'max-w-4xl mx-auto w-full' : ''}`}>
                            
                            {/* Section 1: Quotation Meta */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                                <h3 className="text-sm font-black text-blue-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <FileText size={16} />
                                    <span>Quotation Details</span>
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Quote Number</label>
                                        <input 
                                            type="text" 
                                            value={quoteNo} 
                                            onChange={(e) => setQuoteNo(e.target.value)} 
                                            placeholder="e.g. QT-001" 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Reference No (R.NO)</label>
                                        <input 
                                            type="text" 
                                            value={refNo} 
                                            onChange={(e) => setRefNo(e.target.value)} 
                                            placeholder="Optional (e.g. R1)" 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Quote Date</label>
                                        <input 
                                            type="date" 
                                            value={quoteDate} 
                                            onChange={(e) => setQuoteDate(e.target.value)} 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Valid Until</label>
                                        <input 
                                            type="date" 
                                            value={validUntil} 
                                            onChange={(e) => setValidUntil(e.target.value)} 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Quoted To (Client Details) */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                                <h3 className="text-sm font-black text-blue-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <User size={16} />
                                    <span>Quote To (Client Details)</span>
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
                                            className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                                        />
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>

                                    {showClientDropdown && (
                                        <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl mt-1 max-h-52 overflow-y-auto shadow-xl">
                                            {customers
                                                .filter(c => (c.customerName || '').toLowerCase().includes(customerName.toLowerCase()) || 
                                                             (c.companyName || '').toLowerCase().includes(customerName.toLowerCase()))
                                                .map((c, i) => (
                                                    <div 
                                                        key={c._id || i}
                                                        onClick={() => handleSelectCustomer(c)}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 text-xs transition-colors"
                                                    >
                                                        <div className="font-bold text-slate-900">{c.customerName || c.companyName}</div>
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                            {c.gstNumber && <span className="font-mono text-blue-600">GST: {c.gstNumber}</span>}
                                                            {c.phone && <span>Ph: {c.phone}</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            {customers.length === 0 && (
                                                <div className="p-3 text-slate-400 text-xs italic">No customers found</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Client GST Number</label>
                                        <input 
                                            type="text" 
                                            value={customerGst} 
                                            onChange={(e) => setCustomerGst(e.target.value)} 
                                            placeholder="e.g. 33AAAAA0000A1Z5" 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-slate-900 uppercase focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                        <input 
                                            type="text" 
                                            value={customerPhone} 
                                            onChange={(e) => setCustomerPhone(e.target.value)} 
                                            placeholder="e.g. 9876543210" 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                        <input 
                                            type="email" 
                                            value={customerEmail} 
                                            onChange={(e) => setCustomerEmail(e.target.value)} 
                                            placeholder="e.g. client@company.com" 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="text-xs">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Full Billing Address</label>
                                    <textarea 
                                        rows={2} 
                                        value={address} 
                                        onChange={(e) => setAddress(e.target.value)} 
                                        placeholder="Street, Area, City, Pincode" 
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed"
                                    />
                                </div>
                            </div>

                            {/* Section 3: Quotation Items & Packages */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                        <Sparkles size={16} />
                                        <span>Packages & Services</span>
                                    </h3>
                                    <button 
                                        type="button" 
                                        onClick={handleAddItem}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <Plus size={14} />
                                        <span>Add Package / Item</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group">
                                            {/* Item Header & Quick Service Presets */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-700">Package / Service #{idx + 1}</span>
                                                </div>

                                                {/* Preset Services Dropdown */}
                                                <div className="relative" ref={activeServiceDropdownIndex === idx ? serviceDropdownRef : null}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveServiceDropdownIndex(activeServiceDropdownIndex === idx ? null : idx)}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                                    >
                                                        <Sparkles size={12} className="text-blue-500" />
                                                        <span>Quick Pick Service</span>
                                                        <ChevronDown size={12} />
                                                    </button>

                                                    {activeServiceDropdownIndex === idx && (
                                                        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto text-xs py-1">
                                                            {PRESET_SERVICES.map((srv, sIdx) => (
                                                                <div
                                                                    key={sIdx}
                                                                    onClick={() => handleSelectPresetService(idx, srv)}
                                                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                                                                >
                                                                    <div className="font-bold text-slate-800">{srv.name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">HSN: {srv.hsn}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Description Input */}
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                                                <div className="sm:col-span-8">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                        Main Package / Service Title *
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={item.description} 
                                                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)} 
                                                        placeholder="e.g. ULTRA FAST WORDPRESS & REACT WEBSITE" 
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="sm:col-span-4">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                                        HSN / Frequency
                                                    </label>
                                                    <input 
                                                        type="text" 
                                                        value={item.hsn} 
                                                        onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)} 
                                                        placeholder="998314 or Monthly" 
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-700 text-xs focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Sub-description Textarea for Features / Bullets */}
                                            <div className="text-xs">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                                                    <span>Included Features / Bullet Points (One per line)</span>
                                                    <span className="text-slate-400 font-normal">Renders with bullet points (•)</span>
                                                </label>
                                                <textarea 
                                                    rows={3} 
                                                    value={item.subDescription} 
                                                    onChange={(e) => handleItemChange(idx, 'subDescription', e.target.value)} 
                                                    placeholder="• 5 Custom Designed Responsive Pages&#10;• Cloudflare CDN & SSL Certificate&#10;• WhatsApp Chat & Contact Form Integration" 
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-700 text-xs leading-relaxed focus:outline-none focus:border-blue-500"
                                                />
                                            </div>

                                            {/* Pricing & Qty */}
                                            <div className="grid grid-cols-12 gap-3 text-xs items-end pt-1">
                                                <div className="col-span-4">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rate (₹)</label>
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        value={item.price} 
                                                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)} 
                                                        placeholder="0" 
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qty</label>
                                                    <input 
                                                        type="number" 
                                                        min="1"
                                                        value={item.qty} 
                                                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} 
                                                        placeholder="1" 
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-center text-slate-900 focus:outline-none focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total</label>
                                                    <div className="w-full px-3 py-2 bg-orange-50/50 border border-orange-100 rounded-xl font-mono font-black text-slate-900 text-xs">
                                                        ₹{((Number(item.price) || 0) * (Number(item.qty) || 1)).toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveItem(idx)}
                                                        disabled={items.length <= 1}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                                                        title="Remove item"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Summary, Taxes & Terms */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                                <h3 className="text-sm font-black text-blue-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                    <DollarSign size={16} />
                                    <span>Taxes & Terms & Conditions</span>
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Terms and Conditions */}
                                    <div className="text-xs space-y-2">
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase">
                                            Terms & Conditions
                                        </label>
                                        <textarea 
                                            rows={5} 
                                            value={terms} 
                                            onChange={(e) => setTerms(e.target.value)} 
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-medium text-xs leading-relaxed focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Calculations Box */}
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                                        <div className="flex justify-between items-center text-slate-600 font-semibold">
                                            <span>Subtotal</span>
                                            <span className="font-mono text-slate-900 font-bold">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-slate-600 font-semibold pt-2 border-t border-slate-200">
                                            <span>GST Tax Rate</span>
                                            <select 
                                                value={taxRate} 
                                                onChange={(e) => setTaxRate(Number(e.target.value))}
                                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="18">18% (9% CGST + 9% SGST)</option>
                                                <option value="12">12% (6% CGST + 6% SGST)</option>
                                                <option value="5">5% (2.5% CGST + 2.5% SGST)</option>
                                                <option value="0">0% (Non-GST / Exempt)</option>
                                            </select>
                                        </div>

                                        {taxRate > 0 && (
                                            <>
                                                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                                                    <span>CGST ({taxRate / 2}%)</span>
                                                    <span className="font-mono font-semibold">₹{totals.cgst.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-slate-500 text-[11px]">
                                                    <span>SGST ({taxRate / 2}%)</span>
                                                    <span className="font-mono font-semibold">₹{totals.sgst.toLocaleString('en-IN')}</span>
                                                </div>
                                            </>
                                        )}

                                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                                            <span className="text-blue-600">TOTAL QUOTED VALUE</span>
                                            <span className="text-blue-600 font-mono text-base">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RIGHT COLUMN: LIVE REAL-TIME PREVIEW (Visible when editorTab is 'split' or 'preview') */}
                    {(editorTab === 'split' || editorTab === 'preview') && (
                        <div className={`space-y-4 ${
                            editorTab === 'split' 
                                ? 'sticky top-6' 
                                : 'max-w-4xl mx-auto w-full'
                        }`}>
                            {/* Preview Control Header */}
                            <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl shadow-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-xs font-black tracking-wide uppercase">Live Interactive Preview</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadEditorPdf}
                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                        <Download size={12} />
                                        <span>PDF</span>
                                    </button>
                                </div>
                            </div>

                            {/* Rendered Card */}
                            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50/50 p-2 sm:p-4">
                                <QuoteRenderer 
                                    quote={currentPreviewData} 
                                    company={company} 
                                />
                            </div>
                        </div>
                    )}

                </div>
            </div>
        );
    }

    // ========================================================
    // RENDER: QUOTATIONS LIST TABLE (VIEW MODE = 'LIST')
    // ========================================================
    return (
        <div className="space-y-6">
            {/* Top Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quotations</div>
                        <div className="text-2xl font-black text-slate-900 mt-1">{quotes.length}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <FileCheck size={20} />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quoted Value</div>
                        <div className="text-2xl font-black text-slate-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <DollarSign size={20} />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">GST Quotes</div>
                        <div className="text-2xl font-black text-blue-600 mt-1">{gstCount}</div>
                        <div className="text-[11px] text-slate-500 font-medium">₹{gstRevenue.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        <FileText size={20} />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Non-GST Quotes</div>
                        <div className="text-2xl font-black text-slate-800 mt-1">{nonGstCount}</div>
                        <div className="text-[11px] text-slate-500 font-medium">₹{nonGstRevenue.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                        <CheckCircle size={20} />
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search quote no, client..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                            onClick={() => setGstFilter('ALL')}
                            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                gstFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            All Quotes ({quotes.length})
                        </button>
                        <button
                            onClick={() => setGstFilter('GST')}
                            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                                gstFilter === 'GST' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>GST Quotes</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                gstFilter === 'GST' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {gstCount}
                            </span>
                        </button>
                        <button
                            onClick={() => setGstFilter('NONGST')}
                            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                                gstFilter === 'NONGST' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>Non-GST Quotes</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                gstFilter === 'NONGST' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {nonGstCount}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Quick Load Fixed Template in List view */}
                    {fixedTemplates.length > 0 && (
                        <div className="relative inline-block" ref={templateDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
                                title="Instantly create quotation from recurring client template"
                            >
                                <Repeat size={14} />
                                <span>Load Template</span>
                                <ChevronDown size={14} />
                            </button>
                            {showTemplateDropdown && (
                                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5 space-y-1 animate-fade-up">
                                    <div className="px-2.5 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        Fixed Monthly Clients ({fixedTemplates.length})
                                    </div>
                                    {fixedTemplates.map(tmpl => (
                                        <button
                                            key={tmpl._id}
                                            type="button"
                                            onClick={() => loadTemplateIntoQuote(tmpl)}
                                            className="w-full text-left px-2.5 py-2 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
                                        >
                                            <div>
                                                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 block">
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

                    {/* Create Quotation Button: Opens Workspace! */}
                    <button 
                        onClick={handleOpenCreateEditor}
                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                        <Plus size={16} className="mr-1.5" /> Create Quotation
                    </button>
                </div>
            </div>

            {/* Quotations Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">Quote No</th>
                                <th className="py-3 px-4">Client Name</th>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Items</th>
                                <th className="py-3 px-4">Subtotal</th>
                                <th className="py-3 px-4">Tax (GST)</th>
                                <th className="py-3 px-4">Grand Total</th>
                                <th className="py-3 px-4">Tax Type</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">Loading quotations...</td>
                                </tr>
                            ) : paginatedQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                                        <p>No quotations found.</p>
                                        <p className="text-xs text-slate-400 mt-1">Click "Create Quotation" to open the split workspace.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedQuotes.map(quote => (
                                    <tr key={quote._id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                                            {quote.quoteNo}
                                            {quote.refNo && <span className="ml-1 text-[10px] text-slate-400">({quote.refNo})</span>}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-900">{quote.clientDetails?.name || 'N/A'}</div>
                                            {quote.clientDetails?.gst && (
                                                <div className="text-[10px] text-slate-400 font-mono">GST: {quote.clientDetails.gst}</div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-600">
                                            {quote.date ? new Date(quote.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                                                {quote.items?.length || 0} Items
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-600">
                                            ₹{(quote.subtotal || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-500">
                                            ₹{(quote.taxAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                                            ₹{(quote.grandTotal || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {getTaxBadge(quote)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end space-x-1.5">
                                                {/* View Modal */}
                                                <button 
                                                    onClick={() => setViewingQuote(quote)}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                                    title="Quick View Quotation"
                                                >
                                                    <Eye size={14} />
                                                </button>

                                                {/* Direct PDF Download */}
                                                <button 
                                                    onClick={() => handleDownloadRowPdf(quote)}
                                                    disabled={rowDownloadingId === quote._id}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-40"
                                                    title="Download Vector PDF"
                                                >
                                                    {rowDownloadingId === quote._id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                                </button>

                                                {/* Edit in Workspace */}
                                                <button 
                                                    onClick={() => handleOpenEditEditor(quote)}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                    title="Edit in Workspace"
                                                >
                                                    <Pencil size={14} />
                                                </button>

                                                {/* Delete */}
                                                <button 
                                                    onClick={() => handleDeleteQuote(quote._id)}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                    title="Delete Quotation"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredQuotes.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-800">{(validPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-slate-800">{Math.min(validPage * PAGE_SIZE, filteredQuotes.length)}</strong> of <strong className="text-slate-800">{filteredQuotes.length}</strong> quotations
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

            {/* =========================================================================
               QUICK VIEW / PRINT / EXPORT MODAL (PORTAL)
            ========================================================================= */}
            {viewingQuote && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[92vh]">
                        {/* Modal Header */}
                        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">Quotation #{viewingQuote.quoteNo}</h3>
                                    <p className="text-xs text-slate-400">Vector Quotation Preview</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => handleDownloadRowPdf(viewingQuote)}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                                >
                                    <Download size={14} className="mr-1.5" /> Download PDF
                                </button>
                                <button 
                                    onClick={() => window.print()}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer"
                                >
                                    <Printer size={14} className="mr-1.5" /> Print
                                </button>
                                <button 
                                    onClick={() => {
                                        const q = viewingQuote;
                                        setViewingQuote(null);
                                        handleOpenEditEditor(q);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer"
                                >
                                    <Pencil size={14} className="mr-1.5" /> Edit
                                </button>
                                <button 
                                    onClick={() => setViewingQuote(null)}
                                    className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: QuoteRenderer */}
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/60">
                            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-xs bg-white">
                                <QuoteRenderer 
                                    quote={viewingQuote} 
                                    company={company} 
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-slate-500">Quotation Category:</span>
                                {getTaxBadge(viewingQuote)}
                            </div>
                            <button
                                onClick={() => setViewingQuote(null)}
                                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
