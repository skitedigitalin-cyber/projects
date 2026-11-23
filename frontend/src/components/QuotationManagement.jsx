import './FinanceDocuments.css';
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
import LetterheadQuotationPreview, { DEFAULT_ROBOTRIQ_TERMS } from './quoteTemplates/LetterheadQuotationPreview';
import { generateLetterheadQuotePdf } from '../utils/letterheadQuotePdfGenerator';
import { topImage as defaultTopImage, bottomImage as defaultBottomImage, sealImage as defaultSealImage, signImage as defaultSignImage } from '../assets/robotriqImages';

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

    const tenantId = String(user?.tenantId?._id || user?.tenantId || '');
    const isSkite = user?.isSkiteTenant === true || tenantId === '6af2c94a9d29730751ed2d01' ||
        Boolean(user?.companyName?.toLowerCase().includes('skite'));

    // Detect Robotriq tenant
    const rawStored = typeof window !== 'undefined' ? (localStorage.getItem('user') || '') : '';
    const isRobotriq = !isSkite && (
        user?.subDomain === 'robotriq' ||
        tenantId === '6afd35731172da4b0de9a48e' ||
        (user?.companyName && user.companyName.toLowerCase().includes('robotriq')) ||
        (user?.name && user.name.toLowerCase().includes('robotriq')) ||
        (user?.email && user.email.toLowerCase().includes('robotriq')) ||
        rawStored.toLowerCase().includes('robotriq')
    );

    const [internalQuoteFormat, setQuoteFormat] = useState('letterhead');
    const quoteFormat = isRobotriq ? 'letterhead' : internalQuoteFormat;

    const [branding, setBranding] = useState({
        quotationHeaderImage: '',
        quotationFooterImage: '',
        quotationSeal: '',
        quotationSign: '',
        quotationBankDetails: {}
    });

    // Letterhead quotation state
    const [letterheadData, setLetterheadData] = useState({
        date: new Date().toLocaleDateString('en-GB'),
        quotationNo: '',
        customerName: '',
        reference: '',
        application: '',
        phone: '',
        specNote: 'All Items Included as per your Spec.',
        totalAmount: 0,
        totalAmountStr: '0.00',
        transportLabel: 'Transport',
        transportPercent: 1,
        transportAmount: 0,
        transportAmountStr: '0.00',
        gstLabel: 'GST 18%',
        gstPercent: 18,
        gstAmount: 0,
        gstAmountStr: '0.00',
        validityLabel: 'Quote Validity(days)',
        validityDays: '15',
        netAmountLabel: 'NET AMOUNT',
        netAmount: 0,
        netAmountStr: '0.00',
        bankName: 'ACC NAME : ROBOTRIQ AUTOMATION PRIVATE LIMITED',
        branch: 'BRANCH : UNION BANK,SUNDHARAPURAM,COIMBATORE.',
        bobAc: 'ACC NO : 252511010000242',
        ifsc: 'IFSC CODE : UBIN0825255',
        sigThanks: 'Thanking you,',
        sigFor: 'For ROBOTRIQ AUTOMATION PRIVATE LIMITED',
        sigName: 'Authorised Signatory',
        terms: DEFAULT_ROBOTRIQ_TERMS,
        items: [
            {
                sno: 1,
                componentText: 'DELTA PLC DVP12SE11T 8DI/4DO - 1NOS.\nDELTA DVP16SP11R - 8DI/8DO - 1NOS.\nMULTISPAN SMPS PS24 - 5A - 1NOS.\nDELTA HMI DOP107EV - 1NOS.\nPROGRAMMING, WIRING AND INSTALLATION',
                make: 'DELTA',
                specifics: '440VAC',
                qty: 1,
                price: '65012.00',
                amountStr: '65012.00'
            }
        ]
    });

    const recalculateLetterheadTotals = (updatedData) => {
        const cData = { ...updatedData };
        const itemsList = cData.items || [];
        let totalAmt = 0;
        itemsList.forEach((row, i) => {
            row.sno = i + 1;
            const parsedPrice = parseFloat(row.price);
            const effectivePrice = isNaN(parsedPrice) ? (row.salePrice || 0) : parsedPrice;
            const qty = parseFloat(row.qty) || 1;
            const calcAmount = effectivePrice * qty;
            totalAmt += calcAmount;
            row.amount = calcAmount;
            row.amountStr = calcAmount.toFixed(2);
        });

        const parsedTransport = cData.transportAmountStr !== undefined && !isNaN(parseFloat(cData.transportAmountStr))
            ? parseFloat(cData.transportAmountStr)
            : (parseFloat(cData.transportAmount) || ((totalAmt * (cData.transportPercent || 0)) / 100));

        const gstP = cData.gstPercent !== undefined ? cData.gstPercent : 18;
        const taxableAmt = totalAmt + parsedTransport;
        const gstAmt = (taxableAmt * gstP) / 100;
        const netAmt = totalAmt + parsedTransport + gstAmt;

        cData.totalAmount = totalAmt;
        cData.totalAmountStr = totalAmt.toFixed(2);
        cData.transportAmount = parsedTransport;
        cData.transportAmountStr = parsedTransport.toFixed(2);
        cData.gstPercent = gstP;
        cData.gstAmount = gstAmt;
        cData.gstLabel = `GST ${gstP}%`;
        cData.gstAmountStr = gstAmt.toFixed(2);
        cData.netAmount = netAmt;
        cData.netAmountStr = netAmt.toFixed(2);
        return cData;
    };

    const handleLetterheadChange = (field, val) => {
        setLetterheadData(prev => {
            const next = { ...prev, [field]: val };
            if (field === 'transportAmountStr' || field === 'gstPercent') {
                return recalculateLetterheadTotals(next);
            }
            return next;
        });
    };

    const handleLetterheadItemChange = (idx, field, val) => {
        setLetterheadData(prev => {
            const newItems = [...(prev.items || [])];
            newItems[idx] = { ...newItems[idx], [field]: val };
            return recalculateLetterheadTotals({ ...prev, items: newItems });
        });
    };

    const handleAddLetterheadItem = () => {
        setLetterheadData(prev => {
            const newItems = [
                ...(prev.items || []),
                {
                    sno: (prev.items?.length || 0) + 1,
                    componentText: '',
                    make: '',
                    specifics: '',
                    qty: 1,
                    price: '',
                    amountStr: '0.00'
                }
            ];
            return recalculateLetterheadTotals({ ...prev, items: newItems });
        });
    };

    const handleRemoveLetterheadItem = (idx) => {
        if ((letterheadData.items || []).length <= 1) return;
        setLetterheadData(prev => {
            const newItems = prev.items.filter((_, i) => i !== idx);
            return recalculateLetterheadTotals({ ...prev, items: newItems });
        });
    };

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

            // Set Quotation Letterhead Branding
            const qHeader = res.data?.quotationHeaderImage || localStorage.getItem('quotation-header-image') || defaultTopImage;
            const qFooter = res.data?.quotationFooterImage || localStorage.getItem('quotation-footer-image') || defaultBottomImage;
            const qSeal = res.data?.quotationSeal || res.data?.invoiceSeal || localStorage.getItem('quotation-seal-image') || defaultSealImage;
            const qSign = res.data?.quotationSign || res.data?.invoiceSign || localStorage.getItem('quotation-sign-image') || defaultSignImage;
            const qBank = res.data?.quotationBankDetails || {};

            setBranding({
                quotationHeaderImage: qHeader,
                quotationFooterImage: qFooter,
                quotationSeal: qSeal,
                quotationSign: qSign,
                quotationBankDetails: qBank
            });

            if (qBank && Object.keys(qBank).length > 0) {
                setLetterheadData(prev => ({
                    ...prev,
                    bankName: qBank.bankName || prev.bankName,
                    branch: qBank.branch || prev.branch,
                    bobAc: qBank.bobAc || prev.bobAc,
                    ifsc: qBank.ifsc || prev.ifsc,
                    sigThanks: qBank.sigThanks || prev.sigThanks,
                    sigFor: qBank.sigFor || prev.sigFor,
                    sigName: qBank.sigName || prev.sigName
                }));
            }
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
        if (isRobotriq) {
            setQuoteFormat('letterhead');
        }
    }, [isRobotriq]);

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
        const currentYear = new Date().getFullYear();

        if (isRobotriq) {
            (quotesList || []).forEach(q => {
                if (!q.quoteNo) return;
                const match = q.quoteNo.match(/RQ\/(\d{4})\/(\d+)/i) || q.quoteNo.match(/(\d+)/g);
                if (match) {
                    const num = parseInt(match[match.length - 1], 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            const nextNum = maxNum > 0 ? maxNum + 1 : 101;
            return `RQ/${currentYear}/${nextNum}`;
        }

        const compName = user?.companyName || company?.name || '';
        const rawPrefix = compName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase();
        const companyPrefix = rawPrefix || 'QT';

        (quotesList || []).forEach(q => {
            if (!q.quoteNo) return;
            const match = q.quoteNo.match(/(\d+)/g);
            if (match && match.length > 0) {
                const num = parseInt(match[match.length - 1], 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : quotesList.length + 1;
        if (isSkite) return `SKT${nextNum}`;
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
    const handleOpenCreateEditor = (formatOverride) => {
        const chosenFormat = (typeof formatOverride === 'string' && (formatOverride === 'letterhead' || formatOverride === 'standard'))
            ? formatOverride
            : (isRobotriq ? 'letterhead' : 'standard');

        setQuoteFormat(chosenFormat);

        if (chosenFormat === 'letterhead') {
            const nextNo = generateNextQuoteNo(quotes);
            setEditId(null);
            setLetterheadData(recalculateLetterheadTotals({
                date: new Date().toLocaleDateString('en-GB'),
                quotationNo: nextNo,
                customerName: '',
                reference: '',
                application: '',
                phone: '',
                specNote: 'All Items Included as per your Spec.',
                totalAmount: 0,
                totalAmountStr: '0.00',
                transportLabel: 'Transport',
                transportPercent: 1,
                transportAmount: 0,
                transportAmountStr: '0.00',
                gstLabel: 'GST 18%',
                gstPercent: 18,
                gstAmount: 0,
                gstAmountStr: '0.00',
                validityLabel: 'Quote Validity(days)',
                validityDays: '15',
                netAmountLabel: 'NET AMOUNT',
                netAmount: 0,
                netAmountStr: '0.00',
                bankName: branding.quotationBankDetails?.bankName || 'ACC NAME : ROBOTRIQ AUTOMATION PRIVATE LIMITED',
                branch: branding.quotationBankDetails?.branch || 'BRANCH : UNION BANK,SUNDHARAPURAM,COIMBATORE.',
                bobAc: branding.quotationBankDetails?.bobAc || 'ACC NO : 252511010000242',
                ifsc: branding.quotationBankDetails?.ifsc || 'IFSC CODE : UBIN0825255',
                sigThanks: branding.quotationBankDetails?.sigThanks || 'Thanking you,',
                sigFor: branding.quotationBankDetails?.sigFor || 'For ROBOTRIQ AUTOMATION PRIVATE LIMITED',
                sigName: branding.quotationBankDetails?.sigName || 'Authorised Signatory',
                terms: DEFAULT_ROBOTRIQ_TERMS,
                items: [
                    {
                        sno: 1,
                        componentText: '',
                        make: '',
                        specifics: '',
                        qty: 1,
                        price: '',
                        amountStr: '0.00'
                    }
                ]
            }));
            setSaveSuccessNotice('');
            setViewMode('editor');
            return;
        }

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

    // Switch between Letterhead and Standard formats inside editor
    const handleSwitchFormat = (newFormat) => {
        setQuoteFormat(newFormat);
        if (newFormat === 'letterhead') {
            const nextNo = generateNextQuoteNo(quotes);
            setLetterheadData(prev => recalculateLetterheadTotals({
                ...prev,
                quotationNo: prev.quotationNo || quoteNo || nextNo,
                customerName: prev.customerName || customerName || '',
                reference: prev.reference || refNo || customerName || '',
                phone: prev.phone || customerPhone || '',
                terms: prev.terms && prev.terms.length > 0 ? prev.terms : DEFAULT_ROBOTRIQ_TERMS
            }));
        }
    };

    // Open Editor for Editing an Existing Quote
    const handleOpenEditEditor = (quote) => {
        setEditId(quote._id);

        if (quote.templateType === 'letterhead' || (quote.customData && Object.keys(quote.customData).length > 0) || isRobotriq) {
            setQuoteFormat('letterhead');
            const cData = quote.customData || {};
            setLetterheadData(recalculateLetterheadTotals({
                ...cData,
                quotationNo: quote.quoteNo || cData.quotationNo || '',
                date: cData.date || (quote.date ? new Date(quote.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')),
                customerName: cData.customerName || quote.clientDetails?.name || '',
                reference: cData.reference || quote.refNo || '',
                phone: cData.phone || quote.clientDetails?.phone || '',
                application: cData.application || '',
                specNote: cData.specNote || quote.notes || 'All Items Included as per your Spec.',
                totalAmountStr: cData.totalAmountStr || String(quote.subtotal || ''),
                transportAmountStr: cData.transportAmountStr || '0.00',
                gstPercent: cData.gstPercent || quote.taxRate || 18,
                gstAmountStr: cData.gstAmountStr || String(quote.taxAmount || '0.00'),
                validityDays: cData.validityDays || 15,
                netAmountStr: cData.netAmountStr || String(quote.grandTotal || ''),
                bankName: cData.bankName || branding.quotationBankDetails?.bankName || 'ACC NAME : ROBOTRIQ AUTOMATION PRIVATE LIMITED',
                branch: cData.branch || branding.quotationBankDetails?.branch || 'BRANCH : UNION BANK,SUNDHARAPURAM,COIMBATORE.',
                bobAc: cData.bobAc || branding.quotationBankDetails?.bobAc || 'ACC NO : 252511010000242',
                ifsc: cData.ifsc || branding.quotationBankDetails?.ifsc || 'IFSC CODE : UBIN0825255',
                sigThanks: cData.sigThanks || branding.quotationBankDetails?.sigThanks || 'Thanking you,',
                sigFor: cData.sigFor || branding.quotationBankDetails?.sigFor || 'For ROBOTRIQ AUTOMATION PRIVATE LIMITED',
                sigName: cData.sigName || branding.quotationBankDetails?.sigName || 'Authorised Signatory',
                terms: cData.terms && cData.terms.length > 0 ? cData.terms : DEFAULT_ROBOTRIQ_TERMS,
                items: cData.items && cData.items.length > 0 ? cData.items : (quote.items || []).map((it, idx) => ({
                    sno: idx + 1,
                    componentText: it.description || '',
                    make: it.hsn || '',
                    specifics: it.subDescription || '',
                    qty: it.qty || 1,
                    price: String(it.price || 0),
                    amountStr: String(it.total || 0)
                }))
            }));
            setSaveSuccessNotice('');
            setViewMode('editor');
            return;
        }

        setQuoteFormat('standard');
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
        quoteNo: quoteNo || generateNextQuoteNo(quotes),
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
        if (quoteFormat === 'letterhead') {
            if (!letterheadData.customerName && !letterheadData.reference) {
                alert('Please enter a Customer Name or Company Name.');
                return;
            }
            try {
                setSavingQuote(true);
                const payload = {
                    quoteNo: letterheadData.quotationNo || generateNextQuoteNo(quotes),
                    refNo: letterheadData.reference || '',
                    date: new Date(),
                    clientDetails: {
                        name: letterheadData.customerName || letterheadData.reference || 'Customer',
                        phone: letterheadData.phone || '',
                        address: '',
                        gst: '',
                        email: ''
                    },
                    items: (letterheadData.items || []).map((it, idx) => ({
                        description: (it.componentText || '').split('\n')[0] || `Component ${idx + 1}`,
                        subDescription: (it.componentText || '').split('\n').slice(1).join('\n').trim(),
                        hsn: it.make || '',
                        price: Number(it.price) || 0,
                        qty: Number(it.qty) || 1,
                        total: Number(it.amountStr) || ((Number(it.price) || 0) * (Number(it.qty) || 1))
                    })),
                    subtotal: Number(letterheadData.totalAmount) || 0,
                    taxRate: Number(letterheadData.gstPercent) || 18,
                    cgst: Math.round((Number(letterheadData.gstAmount) || 0) / 2),
                    sgst: Math.round((Number(letterheadData.gstAmount) || 0) / 2),
                    taxAmount: Number(letterheadData.gstAmount) || 0,
                    grandTotal: Number(letterheadData.netAmount) || 0,
                    templateType: 'letterhead',
                    customData: letterheadData,
                    notes: letterheadData.specNote || '',
                    status: quoteStatus || 'Sent'
                };

                if (editId) {
                    await axios.put(`http://localhost:5000/api/quotes/${editId}`, payload, { headers: getHeaders() });
                } else {
                    await axios.post('http://localhost:5000/api/quotes', payload, { headers: getHeaders() });
                }

                setSaveSuccessNotice(editId ? 'Quotation updated successfully!' : 'Quotation created successfully!');
                await fetchQuotes();
                setTimeout(() => setViewMode('list'), 700);
            } catch (err) {
                console.error('Error saving quotation:', err);
                alert(err.response?.data?.message || 'Failed to save quotation');
            } finally {
                setSavingQuote(false);
            }
            return;
        }

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
            if (quoteFormat === 'letterhead') {
                await generateLetterheadQuotePdf(letterheadData, branding);
                return;
            }
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
            if (isRobotriq || quote.templateType === 'letterhead' || (quote.customData && Object.keys(quote.customData).length > 0)) {
                await generateLetterheadQuotePdf(quote.customData || quote, branding);
                return;
            }
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
            <div className="finance-document-editor">
                {/* Top Sticky Header Bar */}
                <div className="finance-document-toolbar flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#e6e6e3] bg-white hover:bg-[#f5f5f3] text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Quotations</span>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-[#111111] tracking-tight">
                                {editId ? `Edit Quotation #${quoteNo}` : 'Create New Quotation'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Format Switcher (Only for non-Robotriq tenants) */}
                        {!isRobotriq && (
                            <div className="flex items-center bg-[#f0f0ee] p-1 rounded-xl text-xs font-bold mr-1">
                                <button
                                    type="button"
                                    onClick={() => handleSwitchFormat('letterhead')}
                                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                        quoteFormat === 'letterhead' ? 'bg-[#111111] text-white shadow-xs font-black' : 'text-slate-600 hover:text-[#111111]'
                                    }`}
                                    title="2-Page Robotriq Letterhead Format"
                                >
                                    <span>Letterhead</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSwitchFormat('standard')}
                                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                        quoteFormat === 'standard' ? 'bg-white text-[#111111] shadow-xs font-black' : 'text-slate-600 hover:text-[#111111]'
                                    }`}
                                    title="Standard Agency / GST Quotation Template"
                                >
                                    <span>Standard</span>
                                </button>
                            </div>
                        )}

                        {/* View Switcher: Split View / Input Tab / Preview Tab */}
                        <div className="flex items-center bg-[#f0f0ee] p-1 rounded-xl text-xs font-bold mr-1">
                            <button
                                type="button"
                                onClick={() => setEditorTab('split')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    editorTab === 'split' ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-600 hover:text-[#111111]'
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
                                    editorTab === 'input' ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-600 hover:text-[#111111]'
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
                                    editorTab === 'preview' ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-600 hover:text-[#111111]'
                                }`}
                                title="Show live interactive preview full width"
                            >
                                <Eye size={14} />
                                <span>Preview Tab</span>
                            </button>
                        </div>

                        {/* Quick Load Fixed Template Dropdown (Non-Robotriq only) */}
                        {fixedTemplates.length > 0 && !isRobotriq && (
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
                                                onClick={() => loadTemplateIntoQuote(tmpl)}
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

                        {/* Communication Actions */}
                        <button
                            type="button"
                            onClick={handleWhatsApp}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f0f0ee] hover:bg-[#e6e6e3] text-[#111111] rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                            title="Share quote summary on WhatsApp"
                        >
                            <MessageCircle size={14} />
                            <span className="hidden md:inline">WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleEmail}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f0f0ee] hover:bg-[#e6e6e3] text-[#111111] rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                            title="Send quotation email"
                        >
                            <Mail size={14} />
                            <span className="hidden md:inline">Email</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadEditorPdf}
                            disabled={savingQuote}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            title="Generate crisp vector PDF (~150KB)"
                        >
                            <Download size={14} />
                            <span>Download PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveQuote}
                            disabled={savingQuote}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#303030] text-white rounded-full text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
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
                    WORKSPACE CONTENT BASED ON SELECTED TAB & FORMAT
                    ======================================================== */}
                {quoteFormat === 'letterhead' ? (
                    <div className={`grid gap-8 items-start ${
                        editorTab === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
                    }`}>
                        {/* LEFT COLUMN: Letterhead Form Controls (Visible when editorTab is 'split' or 'input') */}
                        {(editorTab === 'split' || editorTab === 'input') && (
                            <div className={`finance-document-inputs space-y-6 min-w-0 ${editorTab === 'split' ? 'lg:col-span-5' : 'max-w-4xl mx-auto w-full'}`}>
                                {/* Card 1: Quotation & Client Details */}
                                <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2">
                                            <Building2 size={16} />
                                            <span>Quotation & Client Details</span>
                                        </h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                                            2-Page Letterhead
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Quotation No</label>
                                            <input 
                                                type="text" 
                                                value={letterheadData.quotationNo || ''} 
                                                onChange={(e) => handleLetterheadChange('quotationNo', e.target.value)} 
                                                placeholder={isSkite ? "e.g. SKT79" : undefined}
                                                className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] font-bold focus:outline-none focus:border-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Date</label>
                                            <input 
                                                type="text" 
                                                value={letterheadData.date || ''} 
                                                onChange={(e) => handleLetterheadChange('date', e.target.value)} 
                                                placeholder="DD/MM/YYYY" 
                                                className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Company Name (Ref)</label>
                                            <input 
                                                type="text" 
                                                value={letterheadData.reference || ''} 
                                                onChange={(e) => handleLetterheadChange('reference', e.target.value)} 
                                                placeholder="e.g. ATLAS MACHINE TOOLS" 
                                                className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-bold text-[#111111] focus:outline-none focus:border-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer / Attn</label>
                                            <input 
                                                type="text" 
                                                value={letterheadData.customerName || ''} 
                                                onChange={(e) => handleLetterheadChange('customerName', e.target.value)} 
                                                placeholder="e.g. Mr. Abilash" 
                                                className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Application</label>
                                            <input 
                                                type="text" 
                                                value={letterheadData.application || ''} 
                                                onChange={(e) => handleLetterheadChange('application', e.target.value)} 
                                                placeholder="e.g. DRILLING SPM" 
                                                className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                                            <input 
                                                type="text" 
                                                value={letterheadData.phone || ''} 
                                                onChange={(e) => handleLetterheadChange('phone', e.target.value)} 
                                                placeholder="e.g. 9876543210" 
                                                className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-teal-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Components & Items */}
                                <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2">
                                            <Columns size={16} />
                                            <span>Components Table ({letterheadData.items?.length || 0})</span>
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={handleAddLetterheadItem}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                                        >
                                            <Plus size={13} />
                                            <span>Add Component</span>
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {(letterheadData.items || []).map((item, idx) => (
                                            <div key={idx} className="p-3.5 bg-[#f5f5f3] rounded-xl border border-[#e6e6e3] space-y-2.5 relative group">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-slate-700">Component #{idx + 1}</span>
                                                    {letterheadData.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveLetterheadItem(idx)}
                                                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                                                            title="Delete component"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Component / Specification (Multiline)</label>
                                                    <textarea
                                                        rows={3}
                                                        value={item.componentText || ''}
                                                        onChange={(e) => handleLetterheadItemChange(idx, 'componentText', e.target.value)}
                                                        placeholder="DELTA PLC DVP12SE11T - 1NOS..."
                                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-lg text-xs font-medium text-[#111111] bg-white focus:outline-none focus:border-teal-500"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Make</label>
                                                        <input
                                                            type="text"
                                                            value={item.make || ''}
                                                            onChange={(e) => handleLetterheadItemChange(idx, 'make', e.target.value)}
                                                            placeholder="DELTA"
                                                            className="w-full px-2.5 py-1.5 border border-[#e6e6e3] rounded-lg text-xs text-[#111111] bg-white focus:outline-none focus:border-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Specifics</label>
                                                        <input
                                                            type="text"
                                                            value={item.specifics || ''}
                                                            onChange={(e) => handleLetterheadItemChange(idx, 'specifics', e.target.value)}
                                                            placeholder="440VAC"
                                                            className="w-full px-2.5 py-1.5 border border-[#e6e6e3] rounded-lg text-xs text-[#111111] bg-white focus:outline-none focus:border-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Unit / Qty</label>
                                                        <input
                                                            type="number"
                                                            value={item.qty != null ? item.qty : 1}
                                                            onChange={(e) => handleLetterheadItemChange(idx, 'qty', e.target.value)}
                                                            className="w-full px-2.5 py-1.5 border border-[#e6e6e3] rounded-lg text-xs text-[#111111] bg-white text-center font-bold focus:outline-none focus:border-teal-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Rate / Price (₹)</label>
                                                        <input
                                                            type="text"
                                                            value={item.price || ''}
                                                            onChange={(e) => handleLetterheadItemChange(idx, 'price', e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full px-2.5 py-1.5 border border-[#e6e6e3] rounded-lg text-xs text-[#111111] bg-white text-right font-bold focus:outline-none focus:border-teal-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Card 3: Commercials & Taxes */}
                                <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                                    <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <DollarSign size={16} />
                                        <span>Commercials & Taxes</span>
                                    </h3>

                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Special Specification Note</label>
                                            <input
                                                type="text"
                                                value={letterheadData.specNote || ''}
                                                onChange={(e) => handleLetterheadChange('specNote', e.target.value)}
                                                className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-bold text-red-600 focus:outline-none focus:border-teal-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Transport Amount (₹)</label>
                                                <input
                                                    type="text"
                                                    value={letterheadData.transportAmountStr || '0.00'}
                                                    onChange={(e) => handleLetterheadChange('transportAmountStr', e.target.value)}
                                                    className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] font-bold focus:outline-none focus:border-teal-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">GST Tax Rate (%)</label>
                                                <input
                                                    type="number"
                                                    value={letterheadData.gstPercent != null ? letterheadData.gstPercent : 18}
                                                    onChange={(e) => handleLetterheadChange('gstPercent', Number(e.target.value))}
                                                    className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] font-bold focus:outline-none focus:border-teal-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Quote Validity (Days)</label>
                                                <input
                                                    type="text"
                                                    value={letterheadData.validityDays || '15'}
                                                    onChange={(e) => handleLetterheadChange('validityDays', e.target.value)}
                                                    className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] font-bold text-center focus:outline-none focus:border-teal-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Summary Net Total */}
                                        <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                                            <div className="flex justify-between items-center text-slate-700 font-semibold">
                                                <span>Components Total:</span>
                                                <span className="font-mono font-bold text-[#111111]">₹{letterheadData.totalAmountStr || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-700 font-semibold">
                                                <span>Transport:</span>
                                                <span className="font-mono font-bold text-[#111111]">₹{letterheadData.transportAmountStr || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-700 font-semibold">
                                                <span>GST ({letterheadData.gstPercent || 18}%):</span>
                                                <span className="font-mono font-bold text-[#111111]">₹{letterheadData.gstAmountStr || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-base font-black text-teal-900 pt-2 border-t border-teal-200">
                                                <span>NET QUOTE AMOUNT:</span>
                                                <span className="font-mono text-lg text-teal-800">₹{letterheadData.netAmountStr || '0.00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RIGHT COLUMN: Live Interactive Letterhead Canvas (Visible when editorTab is 'split' or 'preview') */}
                        {(editorTab === 'split' || editorTab === 'preview') && (
                            <div className={`${editorTab === 'split' ? 'lg:col-span-7' : 'max-w-5xl mx-auto w-full'} flex flex-col items-center`}>
                                <div className="w-full flex items-center justify-between p-3.5 bg-[#111111] text-white rounded-2xl shadow-xs mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse"></div>
                                        <span className="text-xs font-black tracking-wide uppercase">2-Page Interactive Letterhead Canvas</span>
                                    </div>
                                    <div className="text-[11px] text-slate-300 font-medium hidden sm:block">
                                        Click directly on the letterhead fields to edit in-place
                                    </div>
                                </div>

                                <div className="w-full overflow-x-auto flex justify-center bg-slate-200/60 p-4 rounded-3xl border border-slate-300 shadow-inner">
                                    <LetterheadQuotationPreview 
                                        data={letterheadData}
                                        onChange={handleLetterheadChange}
                                        onItemChange={handleLetterheadItemChange}
                                        onAddItem={handleAddLetterheadItem}
                                        onRemoveItem={handleRemoveLetterheadItem}
                                        headerImage={branding.quotationHeaderImage}
                                        footerImage={branding.quotationFooterImage}
                                        sealImage={branding.quotationSeal}
                                        signImage={branding.quotationSign}
                                        readOnly={false}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                <div className={`grid gap-8 items-start ${
                    editorTab === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
                }`}>
                    
                    {/* LEFT COLUMN: FORM INPUTS (Visible when editorTab is 'split' or 'input') */}
                    {(editorTab === 'split' || editorTab === 'input') && (
                        <div className={`finance-document-inputs space-y-6 min-w-0 ${editorTab === 'input' ? 'max-w-4xl mx-auto w-full' : ''}`}>
                            
                            {/* Section 1: Quotation Meta */}
                            <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                                <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
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
                                            placeholder={isSkite ? "e.g. SKT79" : "e.g. QT-001"}
                                            className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] font-bold focus:outline-none focus:border-[#111111]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Reference No (R.NO)</label>
                                        <input 
                                            type="text" 
                                            value={refNo} 
                                            onChange={(e) => setRefNo(e.target.value)} 
                                            placeholder="Optional (e.g. R1)" 
                                            className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Quote Date</label>
                                        <input 
                                            type="date" 
                                            value={quoteDate} 
                                            onChange={(e) => setQuoteDate(e.target.value)} 
                                            className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Valid Until</label>
                                        <input 
                                            type="date" 
                                            value={validUntil} 
                                            onChange={(e) => setValidUntil(e.target.value)} 
                                            className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-medium text-[#111111] focus:outline-none focus:border-[#111111]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Quoted To (Client Details) */}
                            <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                                <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
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
                                            className="w-full pl-3 pr-10 py-2.5 border border-[#e6e6e3] rounded-xl font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                                        />
                                        <ChevronDown aria-hidden="true" className="workspace-autocomplete-chevron" />
                                    </div>

                                    {showClientDropdown && (
                                        <div className="absolute top-full left-0 right-0 z-30 bg-white border border-[#e6e6e3] rounded-xl mt-1 workspace-scroll-list max-h-52 shadow-xl">
                                            {customers
                                                .filter(c => (c.customerName || '').toLowerCase().includes(customerName.toLowerCase()) || 
                                                             (c.companyName || '').toLowerCase().includes(customerName.toLowerCase()))
                                                .map((c, i) => (
                                                    <div 
                                                        key={c._id || i}
                                                        onClick={() => handleSelectCustomer(c)}
                                                        className="p-3 hover:bg-[#f0f0ee] cursor-pointer border-b border-slate-100 last:border-0 text-xs transition-colors"
                                                    >
                                                        <div className="font-bold text-[#111111]">{c.customerName || c.companyName}</div>
                                                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                                            {c.gstNumber && <span className="font-mono text-[#3f3f3f]">GST: {c.gstNumber}</span>}
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
                                            className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl font-mono text-[#111111] uppercase focus:outline-none focus:border-[#111111]"
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
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                        <input 
                                            type="email" 
                                            value={customerEmail} 
                                            onChange={(e) => setCustomerEmail(e.target.value)} 
                                            placeholder="e.g. client@company.com" 
                                            className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111]"
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
                                        className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] focus:outline-none focus:border-[#111111] leading-relaxed"
                                    />
                                </div>
                            </div>

                            {/* Section 3: Quotation Items & Packages */}
                            <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2">
                                        <Sparkles size={16} />
                                        <span>Packages & Services</span>
                                    </h3>
                                    <button 
                                        type="button" 
                                        onClick={handleAddItem}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f0ee] hover:bg-[#e6e6e3] text-[#3f3f3f] rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <Plus size={14} />
                                        <span>Add Package / Item</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-[#e6e6e3] bg-[#f5f5f3]/50 space-y-3 relative group">
                                            {/* Item Header & Quick Service Presets */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-[#e6e6e3] text-[#3f3f3f] flex items-center justify-center font-bold text-[10px]">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-700">Package / Service #{idx + 1}</span>
                                                </div>

                                                {/* Preset Services Dropdown */}
                                                <div className="relative" ref={activeServiceDropdownIndex === idx ? serviceDropdownRef : null}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveServiceDropdownIndex(activeServiceDropdownIndex === idx ? null : idx)}
                                                        className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#e6e6e3] hover:border-blue-400 text-slate-700 rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                                                    >
                                                        <Sparkles size={12} className="text-blue-500" />
                                                        <span>Quick Pick Service</span>
                                                        <ChevronDown size={12} />
                                                    </button>

                                                    {activeServiceDropdownIndex === idx && (
                                                        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-[#e6e6e3] rounded-xl shadow-xl z-30 workspace-scroll-list max-h-56 text-xs py-1">
                                                            {PRESET_SERVICES.map((srv, sIdx) => (
                                                                <div
                                                                    key={sIdx}
                                                                    onClick={() => handleSelectPresetService(idx, srv)}
                                                                    className="px-3 py-2 hover:bg-[#f0f0ee] cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
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
                                                        className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
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
                                                        className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl font-mono text-slate-700 text-xs focus:outline-none focus:border-[#111111]"
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
                                                    className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl font-medium text-slate-700 text-xs leading-relaxed focus:outline-none focus:border-[#111111]"
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
                                                        className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl font-mono font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
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
                                                        className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-xl font-mono font-bold text-center text-[#111111] focus:outline-none focus:border-[#111111]"
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total</label>
                                                    <div className="w-full px-3 py-2 bg-orange-50/50 border border-orange-100 rounded-xl font-mono font-black text-[#111111] text-xs">
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
                            <div className="bg-white p-5 rounded-2xl border border-[#e6e6e3] shadow-xs space-y-4">
                                <h3 className="text-sm font-black text-[#3f3f3f] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
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
                                            className="w-full px-3 py-2 border border-[#e6e6e3] rounded-xl text-[#111111] font-medium text-xs leading-relaxed focus:outline-none focus:border-[#111111]"
                                        />
                                    </div>

                                    {/* Calculations Box */}
                                    <div className="p-4 bg-[#f5f5f3] rounded-2xl border border-[#e6e6e3]/80 space-y-3 text-xs">
                                        <div className="flex justify-between items-center text-slate-600 font-semibold">
                                            <span>Subtotal</span>
                                            <span className="font-mono text-[#111111] font-bold">₹{totals.subtotal.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-slate-600 font-semibold pt-2 border-t border-[#e6e6e3]">
                                            <span>GST Tax Rate</span>
                                            <select 
                                                value={taxRate} 
                                                onChange={(e) => setTaxRate(Number(e.target.value))}
                                                className="px-2.5 py-1 bg-white border border-[#e6e6e3] rounded-lg font-bold text-slate-800 text-xs focus:outline-none focus:border-[#111111]"
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

                                        <div className="pt-2 border-t border-[#e6e6e3] flex justify-between items-center text-sm font-black text-[#111111]">
                                            <span className="text-[#3f3f3f]">TOTAL QUOTED VALUE</span>
                                            <span className="text-[#3f3f3f] font-mono text-base">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
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
                                ? 'lg:sticky top-6 min-w-0'
                                : 'max-w-4xl mx-auto w-full'
                        }`}>
                            {/* Preview Control Header */}
                            <div className="flex items-center justify-between p-3.5 bg-[#111111] text-white rounded-2xl shadow-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-xs font-black tracking-wide uppercase">Live preview · A4</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownloadEditorPdf}
                                        className="px-2.5 py-1 bg-[#111111] hover:bg-[#303030] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                        <Download size={12} />
                                        <span>PDF</span>
                                    </button>
                                </div>
                            </div>

                            {/* Rendered Card */}
                            <div className="rounded-2xl border border-[#e6e6e3] overflow-hidden shadow-sm bg-[#f5f5f3]/50 p-2 sm:p-4">
                                <QuoteRenderer 
                                    quote={currentPreviewData} 
                                    company={company} 
                                />
                            </div>
                        </div>
                    )}

                </div>
                )}
            </div>
        );
    }

    // ========================================================
    // RENDER: QUOTATIONS LIST TABLE (VIEW MODE = 'LIST')
    // ========================================================
    return (
        <div className="finance-document-list">
            <header className="finance-document-heading">
                <h2>{quotes.length} {quotes.length === 1 ? 'quotation' : 'quotations'} <span>· ₹{totalRevenue.toLocaleString('en-IN')} quoted</span></h2>
            </header>
            <dl className="finance-receipt-summary finance-quote-summary">
                <div><dt>Total quotations</dt><dd>{quotes.length}</dd></div>
                <div><dt>Quoted value</dt><dd>₹{totalRevenue.toLocaleString('en-IN')}</dd></div>
                <div><dt>GST</dt><dd>{gstCount}</dd><small>₹{gstRevenue.toLocaleString('en-IN')}</small></div>
                <div><dt>Non-GST</dt><dd>{nonGstCount}</dd><small>₹{nonGstRevenue.toLocaleString('en-IN')}</small></div>
            </dl>
            {/* Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#e6e6e3] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            aria-label="Search quotations" placeholder="Search quotations"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111] transition-colors"
                        />
                    </div>

                    <div className="flex items-center bg-[#f0f0ee] p-1 rounded-xl text-xs font-bold">
                        <button
                            onClick={() => setGstFilter('ALL')}
                            className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                                gstFilter === 'ALL' ? 'bg-white text-[#111111] shadow-xs' : 'text-slate-600 hover:text-[#111111]'
                            }`}
                        >
                            All Quotes ({quotes.length})
                        </button>
                        <button
                            onClick={() => setGstFilter('GST')}
                            className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                                gstFilter === 'GST' ? 'bg-[#111111] text-white shadow-xs' : 'text-slate-600 hover:text-[#111111]'
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
                                gstFilter === 'NONGST' ? 'bg-[#111111] text-white shadow-xs' : 'text-slate-600 hover:text-[#111111]'
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
                    {/* Quick Load Fixed Template in List view (Non-Robotriq only) */}
                    {fixedTemplates.length > 0 && !isRobotriq && (
                        <div className="relative inline-block" ref={templateDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                                className="px-3.5 py-2.5 bg-[#f0f0ee] hover:bg-[#e6e6e3] text-[#3f3f3f] border border-[#e6e6e3] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
                                title="Instantly create quotation from recurring client template"
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
                                            onClick={() => loadTemplateIntoQuote(tmpl)}
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

                    {/* Create Quotation Button: Opens Workspace! */}
                    <button 
                        onClick={() => handleOpenCreateEditor(isRobotriq ? 'letterhead' : 'standard')}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#111111] hover:bg-[#303030] text-white rounded-full text-xs font-medium flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <Plus size={16} className="mr-1.5" /> Create Quotation
                    </button>
                </div>
            </div>

            {/* Quotations Table */}
            <div className="bg-white rounded-2xl border border-[#e6e6e3] shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-[#f5f5f3] text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-[#e6e6e3]">
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
                                    <tr key={quote._id} className="hover:bg-[#f5f5f3]/60 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-bold text-[#3f3f3f]">
                                            {quote.quoteNo}
                                            {quote.refNo && <span className="ml-1 text-[10px] text-slate-400">({quote.refNo})</span>}
                                            {quote.templateType === 'letterhead' && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-teal-100 text-teal-800">
                                                    Letterhead
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-[#111111]">
                                                {quote.clientDetails?.name || quote.customData?.reference || quote.customData?.customerName || 'N/A'}
                                            </div>
                                            {quote.customData?.reference && quote.customData?.customerName && (
                                                <div className="text-[11px] text-slate-500 font-medium">Attn: {quote.customData.customerName}</div>
                                            )}
                                            {quote.clientDetails?.gst && (
                                                <div className="text-[10px] text-slate-400 font-mono">GST: {quote.clientDetails.gst}</div>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-600">
                                            {quote.date ? new Date(quote.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="px-2 py-0.5 rounded-md bg-[#f0f0ee] text-slate-700 font-bold text-[10px]">
                                                {quote.items?.length || 0} Items
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-600">
                                            ₹{(quote.subtotal || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3.5 px-4 font-medium text-slate-500">
                                            ₹{(quote.taxAmount || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3.5 px-4 font-bold text-[#111111] text-sm">
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
                                                    className="p-1.5 rounded-lg border border-[#e6e6e3] text-slate-600 hover:text-[#3f3f3f] hover:bg-[#f0f0ee] transition-colors cursor-pointer"
                                                    title="Quick View Quotation"
                                                >
                                                    <Eye size={14} />
                                                </button>

                                                {/* Direct PDF Download */}
                                                <button 
                                                    onClick={() => handleDownloadRowPdf(quote)}
                                                    disabled={rowDownloadingId === quote._id}
                                                    className="p-1.5 rounded-lg border border-[#e6e6e3] text-slate-600 hover:text-[#3f3f3f] hover:bg-[#f0f0ee] transition-colors cursor-pointer disabled:opacity-40"
                                                    title="Download Vector PDF"
                                                >
                                                    {rowDownloadingId === quote._id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                                </button>

                                                {/* Edit in Workspace */}
                                                <button 
                                                    onClick={() => handleOpenEditEditor(quote)}
                                                    className="p-1.5 rounded-lg border border-[#e6e6e3] text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                                    title="Edit in Workspace"
                                                >
                                                    <Pencil size={14} />
                                                </button>

                                                {/* Delete */}
                                                <button 
                                                    onClick={() => handleDeleteQuote(quote._id)}
                                                    className="p-1.5 rounded-lg border border-[#e6e6e3] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
                    <div className="flex items-center justify-between p-4 border-t border-[#e6e6e3] bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-800">{(validPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-slate-800">{Math.min(validPage * PAGE_SIZE, filteredQuotes.length)}</strong> of <strong className="text-slate-800">{filteredQuotes.length}</strong> quotations
                        </span>
                        <div className="flex items-center space-x-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={validPage <= 1}
                                className="px-3.5 py-1.5 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <span className="px-2 text-xs font-bold text-slate-600">
                                Page {validPage} of {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={validPage >= totalPages}
                                className="px-3.5 py-1.5 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
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
                <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-[#111111]/70 backdrop-blur-xs overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-[#e6e6e3] my-8 overflow-hidden flex flex-col max-h-[92vh]">
                        {/* Modal Header */}
                        <div className="p-4 bg-[#111111] text-white flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-xl bg-blue-500/20 text-[#3f3f3f]">
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
                                    className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
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
                                    className="px-3 py-1.5 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer"
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

                        {/* Modal Body: QuoteRenderer / LetterheadQuotationPreview */}
                        <div className="p-6 overflow-y-auto flex-1 bg-[#f0f0ee]/60">
                            <div className="rounded-2xl border border-[#e6e6e3] overflow-hidden shadow-xs bg-white">
                                {isRobotriq || viewingQuote.templateType === 'letterhead' || (viewingQuote.customData && Object.keys(viewingQuote.customData).length > 0) ? (
                                    <div className="p-4 flex justify-center bg-slate-200/50 overflow-x-auto">
                                        <LetterheadQuotationPreview 
                                            data={viewingQuote.customData || viewingQuote}
                                            headerImage={branding.quotationHeaderImage}
                                            footerImage={branding.quotationFooterImage}
                                            sealImage={branding.quotationSeal}
                                            signImage={branding.quotationSign}
                                            readOnly={true}
                                        />
                                    </div>
                                ) : (
                                    <QuoteRenderer 
                                        quote={viewingQuote} 
                                        company={company} 
                                    />
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-[#f5f5f3] border-t border-[#e6e6e3] flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-slate-500">Quotation Category:</span>
                                {getTaxBadge(viewingQuote)}
                            </div>
                            <button
                                onClick={() => setViewingQuote(null)}
                                className="px-5 py-2 rounded-xl bg-[#111111] hover:bg-slate-800 text-xs font-bold text-white transition-colors cursor-pointer"
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
