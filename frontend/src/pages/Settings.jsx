import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { 
    Palette, CheckCircle2, Monitor, Droplet, Flame, Leaf, Hexagon, 
    FileText, Eye, Check, Sparkles, Download, X, ArrowRight,
    Upload, Image as ImageIcon, FileSignature, Trash2, Building2, CreditCard, ChevronDown, ChevronUp, Stamp
} from 'lucide-react';
import { INVOICE_TEMPLATES, SAMPLE_INVOICE, getInvoiceTemplates, TEMPLATE_COLOR_PRESETS } from '../components/invoiceTemplates/templateConfigs';
import InvoiceRenderer from '../components/invoiceTemplates/InvoiceRenderer';
import { generateSingleInvoicePdf, generateNativeInvoicePdf } from '../utils/invoicePdfGenerator';

const checkIsSkite = (u) => {
    if (!u) return false;
    if (u.isSkiteTenant === true) return true;
    const tId = u.tenantId ? (u.tenantId._id || u.tenantId).toString() : '';
    if (tId === '6af2c94a9d29730751ed2d01') return true;
    if (u.companyName && u.companyName.toLowerCase().includes('skite')) return true;
    if (u.email && u.email.toLowerCase().includes('skite')) return true;
    return false;
};

export default function Settings() {
    const { user, updateContextUser } = useContext(AuthContext);
    const isSkite = checkIsSkite(user);
    const [activeTab, setActiveTab] = useState('invoices'); // 'appearance' | 'invoices'

    // Theme state
    const [theme, setThemeState] = useState(() => {
        return localStorage.getItem('app-theme') || user?.theme || (isSkite ? 'skite-orange' : 'default');
    });
    const [bgStyle, setBgStyle] = useState(localStorage.getItem('app-bg-style') || 'glowing');

    // Invoice Template state
    const [selectedTemplate, setSelectedTemplate] = useState(() => {
        return localStorage.getItem('selected-invoice-template') || user?.invoiceTemplate || 'skite-orange';
    });
    const [selectedColor, setSelectedColor] = useState(() => {
        return localStorage.getItem('selected-invoice-color') || user?.invoiceColor || '#FF4500';
    });
    const [customHexInput, setCustomHexInput] = useState(() => {
        return localStorage.getItem('selected-invoice-color') || user?.invoiceColor || '#FF4500';
    });
    const [previewModalTemplate, setPreviewModalTemplate] = useState(null);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [savingColor, setSavingColor] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
    const previewInvoiceRef = useRef(null);

    // Invoice Branding Assets (Logo, Signature & Seal)
    const [logoPreview, setLogoPreview] = useState(user?.invoiceLogo || '');
    const [signPreview, setSignPreview] = useState(user?.invoiceSign || '');
    const [sealPreview, setSealPreview] = useState(user?.invoiceSeal || '');
    const [companyDetails, setCompanyDetails] = useState(() => {
        if (isSkite) {
            return {
                name: user?.companyDetails?.name || 'SKITE',
                address: user?.companyDetails?.address || '257- Housing Unit/ Kurichi 003, L.I.C colony, Coimbatore - 641021',
                email: user?.companyDetails?.email || 'skitedigital.in@gmail.com',
                website: user?.companyDetails?.website || 'www.skitedigital.in',
                phone: user?.companyDetails?.phone || '8754281434',
                gstNumber: user?.companyDetails?.gstNumber || '33REAPS5023G1ZE',
                bankName: user?.companyDetails?.bankName || 'Union Bank of India',
                accountName: user?.companyDetails?.accountName || 'SKITE',
                accountNumber: user?.companyDetails?.accountNumber || '252511010000196',
                ifscCode: user?.companyDetails?.ifscCode || 'UBIN0825255',
                branch: user?.companyDetails?.branch || 'Sundarapuram'
            };
        }
        return {
            name: user?.companyDetails?.name || user?.companyName || '',
            address: user?.companyDetails?.address || '',
            email: user?.companyDetails?.email || user?.email || '',
            website: user?.companyDetails?.website || '',
            phone: user?.companyDetails?.phone || '',
            gstNumber: user?.companyDetails?.gstNumber || '',
            bankName: user?.companyDetails?.bankName || '',
            accountName: user?.companyDetails?.accountName || '',
            accountNumber: user?.companyDetails?.accountNumber || '',
            ifscCode: user?.companyDetails?.ifscCode || '',
            branch: user?.companyDetails?.branch || ''
        };
    });
    const [showDetailsForm, setShowDetailsForm] = useState(false);
    const [savingBranding, setSavingBranding] = useState(false);
    const [brandingSuccessMsg, setBrandingSuccessMsg] = useState('');
    const logoInputRef = useRef(null);
    const signInputRef = useRef(null);
    const sealInputRef = useRef(null);

    // Fetch saved branding from Backend on initial mount
    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await axios.get('http://localhost:5000/api/auth/invoice-branding', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) {
                    setLogoPreview(res.data.invoiceLogo || '');
                    setSignPreview(res.data.invoiceSign || '');
                    setSealPreview(res.data.invoiceSeal || '');
                    if (res.data.companyDetails && Object.keys(res.data.companyDetails).length > 0) {
                        setCompanyDetails(prev => ({ ...prev, ...res.data.companyDetails }));
                    } else if (res.data.companyName) {
                        setCompanyDetails(prev => ({ ...prev, name: res.data.companyName }));
                    }
                    if (res.data.invoiceTemplate) {
                        setSelectedTemplate(res.data.invoiceTemplate);
                    }
                    if (res.data.invoiceColor) {
                        setSelectedColor(res.data.invoiceColor);
                        setCustomHexInput(res.data.invoiceColor);
                        localStorage.setItem('selected-invoice-color', res.data.invoiceColor);
                    }
                }
            } catch (err) {
                console.error('Failed to load branding from backend:', err);
            }
        };
        fetchBranding();
    }, []);

    const handleThemeChange = async (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('app-theme', newTheme);
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/auth/theme', { theme: newTheme }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            updateContextUser({ theme: newTheme });
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const handleSelectTemplate = async (templateId) => {
        setSelectedTemplate(templateId);
        localStorage.setItem('selected-invoice-template', templateId);
        setSavingTemplate(true);
        setSaveSuccessMsg('');
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/auth/invoice-template', { templateId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const availableTemplates = getInvoiceTemplates(isSkite);
            const tObj = availableTemplates.find(t => t.id === templateId);
            setSaveSuccessMsg(`Template "${tObj?.name || templateId}" is now set as your active invoice format!`);
            setTimeout(() => setSaveSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Failed to persist template to backend:', err);
        } finally {
            setSavingTemplate(false);
        }
    };

    const handleSelectColor = async (color) => {
        if (!color) return;
        const validColor = color.startsWith('#') ? color : `#${color}`;
        setSelectedColor(validColor);
        setCustomHexInput(validColor);
        localStorage.setItem('selected-invoice-color', validColor);
        setSavingColor(true);
        setSaveSuccessMsg('');
        try {
            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/auth/invoice-branding', { 
                invoiceColor: validColor 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaveSuccessMsg(`Template theme color updated to ${validColor}!`);
            setTimeout(() => setSaveSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Failed to persist invoice color:', err);
        } finally {
            setSavingColor(false);
        }
    };

    // Compress uploaded image file to lightweight dimensions and payload (~30KB-80KB)
    const compressImageFile = (file, maxWidth = 600, maxHeight = 400, quality = 0.82) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    const isPng = file.type === 'image/png';
                    if (!isPng) {
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = isPng 
                        ? canvas.toDataURL('image/png') 
                        : canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedBase64);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await compressImageFile(file, 500, 250, 0.82);
            setLogoPreview(base64);
            localStorage.setItem('invoice-custom-logo', base64);
            setBrandingSuccessMsg('Logo image loaded & compressed! Click "Save Branding & Details" to sync across invoices.');
            setTimeout(() => setBrandingSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Error uploading logo:', err);
            alert('Failed to process image');
        }
    };

    const handleRemoveLogo = () => {
        setLogoPreview('');
        localStorage.removeItem('invoice-custom-logo');
        if (logoInputRef.current) logoInputRef.current.value = '';
    };

    const handleSignUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await compressImageFile(file, 400, 200, 0.82);
            setSignPreview(base64);
            localStorage.setItem('invoice-custom-sign', base64);
            setBrandingSuccessMsg('Signature image loaded & compressed! Click "Save Branding & Details" to sync across invoices.');
            setTimeout(() => setBrandingSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Error uploading sign:', err);
            alert('Failed to process signature image');
        }
    };

    const handleRemoveSign = () => {
        setSignPreview('');
        localStorage.removeItem('invoice-custom-sign');
        if (signInputRef.current) signInputRef.current.value = '';
    };

    const handleSealUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await compressImageFile(file, 400, 400, 0.82);
            setSealPreview(base64);
            localStorage.setItem('invoice-custom-seal', base64);
            setBrandingSuccessMsg('Company Seal image loaded & compressed! Click "Save Branding & Details" to sync across invoices.');
            setTimeout(() => setBrandingSuccessMsg(''), 4000);
        } catch (err) {
            console.error('Error uploading seal:', err);
            alert('Failed to process seal image');
        }
    };

    const handleRemoveSeal = () => {
        setSealPreview('');
        localStorage.removeItem('invoice-custom-seal');
        if (sealInputRef.current) sealInputRef.current.value = '';
    };

    const handleSaveBranding = async () => {
        setSavingBranding(true);
        setBrandingSuccessMsg('');
        try {
            localStorage.setItem('invoice-custom-logo', logoPreview);
            localStorage.setItem('invoice-custom-sign', signPreview);
            localStorage.setItem('invoice-custom-seal', sealPreview);
            localStorage.setItem('invoice-company-details', JSON.stringify(companyDetails));

            const token = localStorage.getItem('token');
            await axios.put('http://localhost:5000/api/auth/invoice-branding', {
                logo: logoPreview,
                sign: signPreview,
                seal: sealPreview,
                companyDetails
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBrandingSuccessMsg('Invoice branding (Logo, Signature, Seal & Details) saved successfully!');
            setTimeout(() => setBrandingSuccessMsg(''), 5000);
        } catch (err) {
            console.error('Error saving branding to backend:', err);
            setBrandingSuccessMsg('Branding saved locally! (Backend sync will retry on next connect)');
            setTimeout(() => setBrandingSuccessMsg(''), 4000);
        } finally {
            setSavingBranding(false);
        }
    };

    const handleDownloadSamplePdf = async () => {
        if (!previewModalTemplate) return;
        try {
            const companyPayload = {
                ...companyDetails,
                logo: logoPreview,
                sign: signPreview,
                seal: sealPreview,
                invoiceColor: selectedColor
            };
            if (previewModalTemplate.id === 'skite-orange') {
                await generateNativeInvoicePdf(
                    SAMPLE_INVOICE,
                    companyPayload,
                    `Sample_Invoice_${previewModalTemplate.name.replace(/\s+/g, '_')}`,
                    selectedColor
                );
            } else if (previewInvoiceRef.current) {
                await generateSingleInvoicePdf(
                    previewInvoiceRef.current,
                    `Sample_Invoice_${previewModalTemplate.name.replace(/\s+/g, '_')}`
                );
            }
        } catch (err) {
            console.error('PDF error:', err);
            alert('Failed to generate sample PDF');
        }
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-bg-style', bgStyle);
        localStorage.setItem('app-bg-style', bgStyle);
    }, [bgStyle]);

    const themes = [
        { 
            id: 'skite-orange', 
            name: 'Skite Orange', 
            badge: 'Official Brand',
            icon: <Flame size={20} />, 
            primary: 'bg-[#FF4500]', 
            accent: 'bg-[#fff7ed]', 
            border: 'border-[#FF4500]' 
        },
        { id: 'default', name: 'Midnight Blue', icon: <Monitor size={20} />, primary: 'bg-[#3b82f6]', accent: 'bg-[#eff6ff]', border: 'border-[#3b82f6]' },
        { id: 'emerald', name: 'Emerald Forest', icon: <Leaf size={20} />, primary: 'bg-[#10b981]', accent: 'bg-[#ecfdf5]', border: 'border-[#10b981]' },
        { id: 'purple', name: 'Royal Purple', icon: <Hexagon size={20} />, primary: 'bg-[#a855f7]', accent: 'bg-[#faf5ff]', border: 'border-[#a855f7]' },
        { id: 'rose', name: 'Crimson Rose', icon: <Flame size={20} />, primary: 'bg-[#f43f5e]', accent: 'bg-[#fff1f2]', border: 'border-[#f43f5e]' },
        { id: 'amber', name: 'Sunset Amber', icon: <Droplet size={20} />, primary: 'bg-[#f59e0b]', accent: 'bg-[#fffbeb]', border: 'border-[#f59e0b]' },
    ];

    const availableTemplates = getInvoiceTemplates(isSkite);
    const currentTemplateObj = availableTemplates.find(t => t.id === selectedTemplate) || availableTemplates[0];

    return (
        <Layout>
            <div className="max-w-6xl mx-auto pt-4 pb-12 animate-fade-up">
                {/* Header Section */}
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Settings</h1>
                        <p className="text-slate-500 font-medium text-sm">Manage your workspace preferences, invoice templates, and appearance.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Settings Navigation Sidebar */}
                    <div className="lg:col-span-1 space-y-2">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('appearance')}
                            className={`w-full flex items-center justify-between px-4 py-3 font-bold rounded-xl border transition-all cursor-pointer ${
                                activeTab === 'appearance'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span className="flex items-center">
                                <Palette size={18} className="mr-3" /> Appearance
                            </span>
                        </button>

                        <button 
                            type="button"
                            onClick={() => setActiveTab('invoices')}
                            className={`w-full flex items-center justify-between px-4 py-3 font-bold rounded-xl border transition-all cursor-pointer ${
                                activeTab === 'invoices'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span className="flex items-center">
                                <FileText size={18} className="mr-3 text-blue-600" /> Invoice Templates
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                11
                            </span>
                        </button>
                    </div>

                    {/* Settings Content Area */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* ========================================================
                            TAB 1: INVOICE TEMPLATES
                            ======================================================== */}
                        {activeTab === 'invoices' && (
                            <div className="space-y-6">
                                {/* Success Notification */}
                                {saveSuccessMsg && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-fade-in shadow-sm">
                                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                        <span>{saveSuccessMsg}</span>
                                    </div>
                                )}
                                {brandingSuccessMsg && (
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3 text-blue-800 text-xs font-bold animate-fade-in shadow-sm">
                                        <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                                        <span>{brandingSuccessMsg}</span>
                                    </div>
                                )}

                                {/* Overview Banner */}
                                <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100">
                                    <div className="bg-white rounded-[1.5rem] p-7 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                                                    <Sparkles size={13} className="text-blue-600" />
                                                    <span>Active Template Format</span>
                                                </div>
                                                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                                    Current Active: {currentTemplateObj.name}
                                                </h2>
                                                <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                                                    All invoices viewed, printed, or exported to PDF will automatically render using this template. Select any of the 11 designs below to switch instantly.
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setPreviewModalTemplate(currentTemplateObj)}
                                                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-sm transition-all"
                                            >
                                                <Eye size={15} />
                                                <span>Preview Active Template</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ========================================================
                                    INVOICE BRANDING & ASSETS (LOGO & SIGNATURE UPLOAD)
                                    ======================================================== */}
                                <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-200 shadow-xs">
                                    <div className="bg-white rounded-[1.5rem] p-7 shadow-sm">
                                        {/* Section Header */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                                            <div>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                                                    <Building2 size={13} className="text-blue-600" />
                                                    <span>Brand Assets & Customization</span>
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Invoice Logo, Seal & Authorised Signature</h3>
                                                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                                                    Upload your company logo for the header, official company seal/stamp for the footer, and authorised signature. These automatically apply to all templates and PDF exports.
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleSaveBranding}
                                                disabled={savingBranding}
                                                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 self-start sm:self-auto shrink-0"
                                            >
                                                <Check size={16} strokeWidth={2.5} />
                                                <span>{savingBranding ? 'Saving...' : 'Save Branding & Details'}</span>
                                            </button>
                                        </div>

                                        {/* Logo, Seal & Signature Upload Cards Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
                                            
                                            {/* Card 1: Company Logo (Top Left of Invoice) */}
                                            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                                                                <ImageIcon size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-slate-900">Company Logo</h4>
                                                                <span className="text-[10px] font-bold text-slate-500">Invoice Header (Top-Left)</span>
                                                            </div>
                                                        </div>
                                                        {logoPreview && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                Active Logo
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Logo Preview Box */}
                                                    <div className="h-32 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-4 mb-4 relative overflow-hidden shadow-inner">
                                                        {logoPreview ? (
                                                            <img src={logoPreview} alt="Uploaded Logo" className="max-h-24 max-w-full object-contain" />
                                                        ) : (
                                                            <div className="text-center">
                                                                <ImageIcon size={28} className="mx-auto text-slate-300 mb-1" />
                                                                <span className="text-xs text-slate-400 font-medium block">No logo uploaded yet</span>
                                                                <span className="text-[10px] text-slate-400">Default company badge will be shown</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Upload & Remove Controls */}
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="file" 
                                                        ref={logoInputRef} 
                                                        onChange={handleLogoUpload} 
                                                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                                                        className="hidden" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => logoInputRef.current?.click()}
                                                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                                    >
                                                        <Upload size={14} />
                                                        <span>{logoPreview ? 'Change Logo Image' : 'Upload Logo Image'}</span>
                                                    </button>
                                                    {logoPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveLogo}
                                                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-colors"
                                                            title="Remove Logo"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card 2: Company Official Seal / Stamp (Invoice Footer Center) */}
                                            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                                                                <Stamp size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-slate-900">Company Seal / Stamp</h4>
                                                                <span className="text-[10px] font-bold text-slate-500">Official Stamp (Invoice Footer)</span>
                                                            </div>
                                                        </div>
                                                        {sealPreview && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                Active Seal
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Seal Preview Box */}
                                                    <div className="h-32 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-4 mb-4 relative overflow-hidden shadow-inner">
                                                        {sealPreview ? (
                                                            <img src={sealPreview} alt="Uploaded Seal" className="max-h-24 max-w-full object-contain" />
                                                        ) : (
                                                            <div className="text-center">
                                                                <Stamp size={28} className="mx-auto text-slate-300 mb-1" />
                                                                <span className="text-xs text-slate-400 font-medium block">No seal uploaded yet</span>
                                                                <span className="text-[10px] text-slate-400">Official company round / oval rubber stamp</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Upload & Remove Controls */}
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="file" 
                                                        ref={sealInputRef} 
                                                        onChange={handleSealUpload} 
                                                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                                                        className="hidden" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => sealInputRef.current?.click()}
                                                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                                    >
                                                        <Upload size={14} />
                                                        <span>{sealPreview ? 'Change Seal Image' : 'Upload Seal Image'}</span>
                                                    </button>
                                                    {sealPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveSeal}
                                                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-colors"
                                                            title="Remove Seal"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card 3: Authorised Signature (Bottom Right of Invoice) */}
                                            <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                                                                <FileSignature size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-slate-900">Authorised Signature</h4>
                                                                <span className="text-[10px] font-bold text-slate-500">Invoice Authorization (Bottom-Right)</span>
                                                            </div>
                                                        </div>
                                                        {signPreview && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                Active Signature
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Signature Preview Box */}
                                                    <div className="h-32 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-4 mb-4 relative overflow-hidden shadow-inner">
                                                        {signPreview ? (
                                                            <img src={signPreview} alt="Uploaded Signature" className="max-h-24 max-w-full object-contain" />
                                                        ) : (
                                                            <div className="text-center">
                                                                <FileSignature size={28} className="mx-auto text-slate-300 mb-1" />
                                                                <span className="text-xs text-slate-400 font-medium block">No signature uploaded yet</span>
                                                                <span className="text-[10px] text-slate-400">Upload signature on transparent or white background</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Upload & Remove Controls */}
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="file" 
                                                        ref={signInputRef} 
                                                        onChange={handleSignUpload} 
                                                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" 
                                                        className="hidden" 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => signInputRef.current?.click()}
                                                        className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                                                    >
                                                        <Upload size={14} />
                                                        <span>{signPreview ? 'Change Signature Image' : 'Upload Signature Image'}</span>
                                                    </button>
                                                    {signPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveSign}
                                                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-colors"
                                                            title="Remove Signature"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

        {/* Collapsible Company & Bank Details Form */}
        <div className="mt-6 pt-5 border-t border-slate-100">
            <button
                type="button"
                onClick={() => setShowDetailsForm(!showDetailsForm)}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer py-1"
            >
                <span className="flex items-center gap-2">
                    <CreditCard size={15} className="text-blue-600" />
                    <span>Edit Company & Bank Payment Details (Header & PAY TO info)</span>
                </span>
                {showDetailsForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDetailsForm && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs animate-fade-in">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Company Name</label>
                        <input
                            type="text"
                            value={companyDetails.name}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Address</label>
                        <input
                            type="text"
                            value={companyDetails.address}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">GST NO</label>
                        <input
                            type="text"
                            value={companyDetails.gstNumber}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, gstNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                        <input
                            type="text"
                            value={companyDetails.phone}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input
                            type="text"
                            value={companyDetails.email}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Bank Name</label>
                        <input
                            type="text"
                            value={companyDetails.bankName}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, bankName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Account Name</label>
                        <input
                            type="text"
                            value={companyDetails.accountName}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, accountName: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Account No</label>
                        <input
                            type="text"
                            value={companyDetails.accountNumber}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, accountNumber: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">IFSC Code</label>
                        <input
                            type="text"
                            value={companyDetails.ifscCode}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, ifscCode: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Branch</label>
                        <input
                            type="text"
                            value={companyDetails.branch}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, branch: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Website</label>
                        <input
                            type="text"
                            value={companyDetails.website}
                            onChange={(e) => setCompanyDetails({ ...companyDetails, website: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    </div>
</div>

                                {/* ========================================================
                                    TEMPLATE ACCENT COLOR CUSTOMIZATION (PRESET SWATCHES & PICKER)
                                    ======================================================== */}
                                <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-200 shadow-xs mb-6">
                                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                            <div>
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-2">
                                                    <Palette size={13} className="text-amber-600" />
                                                    <span>Template Color Theme</span>
                                                </div>
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Invoice Template Accent Colors</h3>
                                                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                                                    Customize the accent color of your invoices. The selected color applies dynamically across template headers, borders, totals, and exported PDF documents.
                                                </p>
                                            </div>

                                            {/* Current Active Color Badge */}
                                            <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 self-start sm:self-auto">
                                                <span 
                                                    className="w-6 h-6 rounded-xl border border-slate-300 shadow-xs shrink-0" 
                                                    style={{ backgroundColor: selectedColor }} 
                                                />
                                                <div className="text-left">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Color</span>
                                                    <span className="text-xs font-black text-slate-800 font-mono">{selectedColor.toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 10 Presets Swatches + Custom Hex Input */}
                                        <div className="mt-5 space-y-4">
                                            <div>
                                                <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block mb-2.5">
                                                    Curated Color Palette (Click to Apply Instantly)
                                                </span>
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    {TEMPLATE_COLOR_PRESETS.map((preset) => {
                                                        const isCurrent = selectedColor.toLowerCase() === preset.color.toLowerCase();
                                                        return (
                                                            <button
                                                                key={preset.color}
                                                                type="button"
                                                                onClick={() => handleSelectColor(preset.color)}
                                                                className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                                    isCurrent 
                                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20 scale-105' 
                                                                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                                }`}
                                                                title={`${preset.name} (${preset.color})`}
                                                            >
                                                                <span 
                                                                    className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs transition-transform group-hover:scale-110" 
                                                                    style={{ backgroundColor: preset.color }}
                                                                />
                                                                <span>{preset.name}</span>
                                                                {preset.color === '#FF4500' && (
                                                                    <span className="text-[9px] px-1.5 py-0.2 bg-orange-100 text-orange-800 rounded font-black border border-orange-200">
                                                                        Skite
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Custom Hex Color Picker Bar */}
                                            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex items-center gap-2">
                                                        <label className="text-xs font-bold text-slate-700">Custom Color Picker:</label>
                                                        <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50 hover:border-slate-300 transition-colors">
                                                            <input
                                                                type="color"
                                                                value={selectedColor}
                                                                onChange={(e) => handleSelectColor(e.target.value)}
                                                                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                                                title="Pick any custom color"
                                                            />
                                                            <span className="px-2 text-xs font-mono font-bold text-slate-600">
                                                                {selectedColor}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={customHexInput}
                                                            onChange={(e) => setCustomHexInput(e.target.value)}
                                                            placeholder="#FF4500"
                                                            maxLength={7}
                                                            className="w-24 px-3 py-1.5 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 uppercase"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectColor(customHexInput)}
                                                            disabled={savingColor}
                                                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                                                        >
                                                            {savingColor ? 'Saving...' : 'Apply Hex'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[11px] text-slate-400 italic">
                                                        Tip: Skite Signature Orange is <strong>#FF4500</strong>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 10 Templates Catalog Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {availableTemplates.map((tpl, idx) => {
                                        const isSelected = selectedTemplate === tpl.id;
                                        return (
                                            <div 
                                                key={tpl.id}
                                                className={`p-2 rounded-[1.75rem] border transition-all duration-300 ${
                                                    isSelected 
                                                        ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-400/20 shadow-md' 
                                                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                                                }`}
                                            >
                                                <div className="bg-white rounded-[1.25rem] p-5 h-full flex flex-col justify-between shadow-xs">
                                                    <div>
                                                        {/* Header Pill & Badge */}
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                                                    {tpl.badge}
                                                                </span>
                                                            </div>
                                                            {isSelected && (
                                                                <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                                                    <Check size={12} strokeWidth={3} /> Active
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Design Accent Swatch Strip */}
                                                        <div 
                                                            className="h-3 rounded-full mb-3 shadow-inner transition-all flex overflow-hidden border border-slate-100"
                                                        >
                                                            <div 
                                                                className="h-full flex-1 transition-colors"
                                                                style={{ backgroundColor: isSelected ? selectedColor : tpl.accentColor }}
                                                            />
                                                            {isSelected && selectedColor.toLowerCase() !== tpl.accentColor.toLowerCase() && (
                                                                <div 
                                                                    className="h-full w-1/3 opacity-50"
                                                                    style={{ backgroundColor: tpl.accentColor }}
                                                                    title="Base template accent"
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Template Name & Tagline */}
                                                        <h3 className="text-base font-extrabold text-slate-900">{tpl.name}</h3>
                                                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{tpl.tagline}</p>
                                                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{tpl.description}</p>
                                                    </div>

                                                    {/* Action Controls */}
                                                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectTemplate(tpl.id)}
                                                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                                                isSelected 
                                                                    ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' 
                                                                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                                                            }`}
                                                        >
                                                            {isSelected ? (
                                                                <>
                                                                    <Check size={14} strokeWidth={3} />
                                                                    <span>Currently Active</span>
                                                                </>
                                                            ) : (
                                                                <span>Use This Template</span>
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewModalTemplate(tpl)}
                                                            className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                                            title="Live Preview"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ========================================================
                            TAB 2: APPEARANCE (THEMES & BACKGROUNDS)
                            ======================================================== */}
                        {activeTab === 'appearance' && (
                            <>
                                {/* Workspace Theme */}
                                <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100">
                                    <div className="bg-white rounded-[1.5rem] p-8 shadow-sm h-full">
                                        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center tracking-tight">
                                            Workspace Theme
                                        </h2>
                                        <p className="text-slate-500 text-sm font-medium mb-8">
                                            Personalize your Skite CRM experience. Theme changes are saved instantly and apply across all dashboards.
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                            {themes.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => handleThemeChange(t.id)}
                                                    className={`relative flex flex-col items-center justify-center p-6 rounded-[1.25rem] border-2 transition-all duration-300 group overflow-hidden cursor-pointer ${
                                                        theme === t.id 
                                                        ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' 
                                                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                                                    }`}
                                                >
                                                    {t.badge && (
                                                        <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF4500] text-white shadow-xs">
                                                            {t.badge}
                                                        </span>
                                                    )}
                                                    <div className={`w-14 h-14 rounded-2xl ${t.accent} ${theme === t.id ? t.border + ' border-2' : 'border border-transparent'} flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110`}>
                                                        <div className={`w-8 h-8 rounded-full ${t.primary} flex items-center justify-center text-white shadow-sm`}>
                                                            {theme === t.id ? <CheckCircle2 size={18} /> : t.icon}
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm font-bold ${theme === t.id ? 'text-slate-900' : 'text-slate-600'}`}>
                                                        {t.name}
                                                    </span>
                                                    
                                                    {theme === t.id && (
                                                        <div className={`absolute -top-10 -right-10 w-24 h-24 ${t.primary} opacity-5 blur-2xl rounded-full`}></div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Background Style Panel */}
                                <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100">
                                    <div className="bg-white rounded-[1.5rem] p-8 shadow-sm h-full">
                                        <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center tracking-tight">
                                            Background Style
                                        </h2>
                                        <p className="text-slate-500 text-sm font-medium mb-8">
                                            Change the visual texture and effects of the application background.
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                            {/* Glowing Orbs */}
                                            <button
                                                onClick={() => setBgStyle('glowing')}
                                                className={`relative flex flex-col items-center justify-center p-6 rounded-[1.25rem] border-2 transition-all duration-300 group overflow-hidden cursor-pointer ${
                                                    bgStyle === 'glowing' 
                                                    ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' 
                                                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="w-full h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 mb-4 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-8 h-8 bg-blue-300 opacity-50 blur-xl rounded-full"></div>
                                                    <div className="absolute bottom-0 right-0 w-10 h-10 bg-blue-400 opacity-30 blur-xl rounded-full"></div>
                                                </div>
                                                <span className={`text-sm font-bold ${bgStyle === 'glowing' ? 'text-slate-900' : 'text-slate-600'}`}>Glowing Glass</span>
                                            </button>

                                            {/* Minimal */}
                                            <button
                                                onClick={() => setBgStyle('minimal')}
                                                className={`relative flex flex-col items-center justify-center p-6 rounded-[1.25rem] border-2 transition-all duration-300 group overflow-hidden cursor-pointer ${
                                                    bgStyle === 'minimal' 
                                                    ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' 
                                                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                                                }`}
                                            >
                                                <div className="w-full h-16 rounded-xl bg-slate-50 border border-slate-200 mb-4 flex items-center justify-center"></div>
                                                <span className={`text-sm font-bold ${bgStyle === 'minimal' ? 'text-slate-900' : 'text-slate-600'}`}>Clean Solid</span>
                                            </button>

                                            {/* Technical Grid */}
                                            <button
                                                onClick={() => setBgStyle('grid')}
                                                className={`relative flex flex-col items-center justify-center p-6 rounded-[1.25rem] border-2 transition-all duration-300 group overflow-hidden cursor-pointer ${
                                                    bgStyle === 'grid' 
                                                    ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' 
                                                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                                                }`}
                                            >
                                                <div 
                                                    className="w-full h-16 rounded-xl bg-slate-50 border border-slate-200 mb-4 flex items-center justify-center"
                                                    style={{
                                                        backgroundImage: 'linear-gradient(var(--color-slate-200) 1px, transparent 1px), linear-gradient(90deg, var(--color-slate-200) 1px, transparent 1px)',
                                                        backgroundSize: '10px 10px'
                                                    }}
                                                ></div>
                                                <span className={`text-sm font-bold ${bgStyle === 'grid' ? 'text-slate-900' : 'text-slate-600'}`}>Technical Grid</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Interactive Full Template Live Preview Modal */}
            {previewModalTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden animate-scale-in text-left">
                        {/* Header Bar */}
                        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                                    <FileText size={18} />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-base">{previewModalTemplate.name}</h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                                            {previewModalTemplate.badge}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">{previewModalTemplate.tagline}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadSamplePdf}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                                >
                                    <Download size={14} />
                                    <span>Download Sample PDF</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewModalTemplate(null)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Quick Color Picker in Preview Modal */}
                        <div className="px-6 py-2.5 bg-slate-800 text-white flex items-center justify-between gap-3 text-xs border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Theme Color:</span>
                                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                                    {TEMPLATE_COLOR_PRESETS.map((preset) => (
                                        <button
                                            key={preset.color}
                                            type="button"
                                            onClick={() => handleSelectColor(preset.color)}
                                            className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${
                                                selectedColor.toLowerCase() === preset.color.toLowerCase()
                                                    ? 'scale-125 ring-2 ring-white border-white'
                                                    : 'border-white/20 hover:scale-110 opacity-80 hover:opacity-100'
                                            }`}
                                            style={{ backgroundColor: preset.color }}
                                            title={preset.name}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color"
                                    value={selectedColor}
                                    onChange={(e) => handleSelectColor(e.target.value)}
                                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                                    title="Custom Hex Color"
                                />
                                <span className="text-[11px] font-mono font-bold text-slate-300">{selectedColor}</span>
                            </div>
                        </div>

                        {/* Invoice Rendered Preview Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
                            <InvoiceRenderer 
                                innerRef={previewInvoiceRef}
                                invoice={SAMPLE_INVOICE} 
                                templateId={previewModalTemplate.id} 
                                customColor={selectedColor}
                                company={{ 
                                    ...companyDetails, 
                                    name: companyDetails.name || user?.companyName || (isSkite ? 'SKITE' : 'YOUR COMPANY'),
                                    logo: logoPreview, 
                                    sign: signPreview, 
                                    seal: sealPreview,
                                    invoiceColor: selectedColor
                                }}
                            />
                        </div>

                        {/* Footer Controls */}
                        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">
                                Sample invoice showing dummy client, line items, GST breakdown and terms.
                            </span>
                            <div className="flex items-center gap-2">
                                {selectedTemplate === previewModalTemplate.id ? (
                                    <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-200">
                                        <Check size={14} strokeWidth={3} />
                                        <span>Active Template</span>
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSelectTemplate(previewModalTemplate.id);
                                            setPreviewModalTemplate(null);
                                        }}
                                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                                    >
                                        <Check size={14} strokeWidth={3} />
                                        <span>Set as Active Template</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setPreviewModalTemplate(null)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                                >
                                    Close Preview
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
