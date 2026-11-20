import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Plus, Search, FileText, Trash2, X, Edit2, 
    FileCheck, Check, Sparkles, AlertCircle, Building2,
    Calendar, CheckCircle2, ArrowRight, Layers, Hash,
    Percent, DollarSign, MapPin, ShieldCheck, RefreshCw,
    Repeat
} from 'lucide-react';

export default function FixedTemplates({ onSelectForQuote, onSelectForInvoice }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [taxFilter, setTaxFilter] = useState('ALL'); // 'ALL' | 'GST' | 'NONGST'

    // Modal state for Add / Edit
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        clientDetails: {
            name: '',
            addressLine1: '',
            addressLine2: '',
            location: '',
            gstNo: '',
            phone: '',
            email: ''
        },
        items: [{ description: '', hsn: '998314', price: '', qty: 1 }],
        taxRate: 9, // 9% CGST + 9% SGST = 18%
        notes: ''
    });

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/fixed-templates', {
                headers: getHeaders()
            });
            setTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching fixed templates:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleOpenAdd = () => {
        setFormData({
            name: '',
            clientDetails: {
                name: '',
                addressLine1: '',
                addressLine2: '',
                location: '',
                gstNo: '',
                phone: '',
                email: ''
            },
            items: [{ description: '', hsn: '998314', price: '', qty: 1 }],
            taxRate: 9,
            notes: ''
        });
        setEditId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (t) => {
        setFormData({
            name: t.name || '',
            clientDetails: {
                name: t.clientDetails?.name || '',
                addressLine1: t.clientDetails?.addressLine1 || '',
                addressLine2: t.clientDetails?.addressLine2 || '',
                location: t.clientDetails?.location || '',
                gstNo: t.clientDetails?.gstNo || '',
                phone: t.clientDetails?.phone || '',
                email: t.clientDetails?.email || ''
            },
            items: t.items && t.items.length > 0 ? t.items.map(it => ({
                description: it.description || '',
                hsn: it.hsn || '',
                price: it.price || '',
                qty: it.qty || 1
            })) : [{ description: '', hsn: '998314', price: '', qty: 1 }],
            taxRate: t.taxRate !== undefined ? t.taxRate : 9,
            notes: t.notes || ''
        });
        setEditId(t._id);
        setShowModal(true);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete the fixed template "${name}"?`)) return;
        try {
            await axios.delete(`http://localhost:5000/api/fixed-templates/${id}`, {
                headers: getHeaders()
            });
            setSuccessMessage(`Deleted template "${name}"`);
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchTemplates();
        } catch (err) {
            console.error('Error deleting template:', err);
            alert('Failed to delete template');
        }
    };

    // Modal Form handlers
    const handleItemChange = (index, field, value) => {
        const next = [...formData.items];
        next[index][field] = value;
        setFormData({ ...formData, items: next });
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', hsn: '998314', price: '', qty: 1 }]
        });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length <= 1) return;
        const next = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: next });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.clientDetails.name.trim()) {
            alert('Please fill template title and client name');
            return;
        }

        try {
            setSaving(true);
            if (editId) {
                await axios.put(`http://localhost:5000/api/fixed-templates/${editId}`, formData, {
                    headers: getHeaders()
                });
                setSuccessMessage('Fixed template updated successfully!');
            } else {
                await axios.post('http://localhost:5000/api/fixed-templates', formData, {
                    headers: getHeaders()
                });
                setSuccessMessage('Fixed template created successfully!');
            }
            setShowModal(false);
            setEditId(null);
            setTimeout(() => setSuccessMessage(''), 3500);
            fetchTemplates();
        } catch (err) {
            console.error('Error saving template:', err);
            alert('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    // Filter templates
    const filteredTemplates = templates.filter(t => {
        const titleMatch = t.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const clientMatch = t.clientDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const gstMatch = t.clientDetails?.gstNo?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = !searchTerm || titleMatch || clientMatch || gstMatch;

        if (!matchesSearch) return false;
        if (taxFilter === 'GST') return t.taxRate > 0;
        if (taxFilter === 'NONGST') return t.taxRate === 0;
        return true;
    });

    // Helper to calculate totals for card
    const calculateTotals = (template) => {
        const subtotal = (template.items || []).reduce((sum, it) => sum + (Number(it.price || 0) * Number(it.qty || 1)), 0);
        const isGst = template.taxRate > 0;
        const taxRatePercent = isGst ? (template.taxRate === 9 ? 18 : template.taxRate * 2) : 0;
        const taxAmount = (subtotal * taxRatePercent) / 100;
        const grandTotal = subtotal + taxAmount;
        return { subtotal, isGst, taxRatePercent, taxAmount, grandTotal };
    };

    // Overall stats
    const totalTemplatesCount = templates.length;
    const gstTemplatesCount = templates.filter(t => t.taxRate > 0).length;
    const nonGstTemplatesCount = templates.filter(t => t.taxRate === 0).length;
    const totalMonthlyValue = templates.reduce((sum, t) => sum + calculateTotals(t).grandTotal, 0);

    return (
        <div className="space-y-6 text-slate-800">

            {/* TOP HEADER & STATS CARDS */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-orange-100 text-[#FF4500]">
                            <Repeat size={20} />
                        </span>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                Fixed Client Templates
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF4500] border border-orange-200 font-bold">
                                    Monthly Recurring
                                </span>
                            </h2>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Pre-saved client billing templates for instant 1-click Quotation & Invoice generation
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-right min-w-[120px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Clients</span>
                        <h4 className="text-lg font-black text-slate-900 font-mono">{totalTemplatesCount}</h4>
                    </div>

                    <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-right min-w-[130px]">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">GST (18%)</span>
                        <h4 className="text-lg font-black text-emerald-950 font-mono">{gstTemplatesCount} Clients</h4>
                    </div>

                    <div className="px-4 py-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-right min-w-[130px]">
                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Non-GST (0%)</span>
                        <h4 className="text-lg font-black text-purple-950 font-mono">{nonGstTemplatesCount} Clients</h4>
                    </div>

                    <button 
                        type="button"
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF4500] to-orange-600 hover:from-orange-600 hover:to-[#FF4500] text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Add New Template</span>
                    </button>
                </div>
            </div>

            {/* SUCCESS NOTICE */}
            {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-up">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* SEARCH & TAX FILTER BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative w-full sm:w-80">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search template title, client name, GSTIN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-[#FF4500] focus:bg-white transition-all"
                    />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button 
                        type="button"
                        onClick={() => setTaxFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            taxFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        All ({templates.length})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTaxFilter('GST')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            taxFilter === 'GST' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        GST 18% ({gstTemplatesCount})
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTaxFilter('NONGST')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            taxFilter === 'NONGST' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Non-GST ({nonGstTemplatesCount})
                    </button>
                </div>
            </div>

            {/* TEMPLATES GRID */}
            {loading ? (
                <div className="py-20 text-center text-xs text-slate-400 font-medium">
                    Loading fixed templates...
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                    <Repeat size={36} className="mx-auto text-slate-300 mb-2" />
                    <h3 className="font-bold text-slate-700 text-sm">No templates found</h3>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search or add a new fixed client template.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredTemplates.map(template => {
                        const { subtotal, isGst, taxAmount, grandTotal } = calculateTotals(template);
                        return (
                            <div 
                                key={template._id}
                                className="bg-white rounded-3xl border border-slate-200/90 hover:border-orange-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                            >
                                {/* Top Bar with Color Accent */}
                                <div className={`h-1.5 w-full ${isGst ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`} />

                                <div className="p-5 space-y-4 flex-1">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 group-hover:text-[#FF4500] transition-colors">
                                                {template.name}
                                            </h3>
                                            <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                                                {template.clientDetails?.name}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isGst ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    GST 18%
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                                    Non-GST
                                                </span>
                                            )}

                                            <button 
                                                type="button"
                                                onClick={() => handleOpenEdit(template)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                title="Edit Template"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handleDelete(template._id, template.name)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="Delete Template"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Client Address & GST info */}
                                    <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                                        {(template.clientDetails?.addressLine1 || template.clientDetails?.location) && (
                                            <div className="flex items-start gap-1.5">
                                                <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                                <span className="line-clamp-2">
                                                    {[
                                                        template.clientDetails?.addressLine1,
                                                        template.clientDetails?.addressLine2,
                                                        template.clientDetails?.location
                                                    ].filter(Boolean).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                        {template.clientDetails?.gstNo && (
                                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                                                <ShieldCheck size={13} className="text-emerald-600" />
                                                <span>GSTIN: <strong className="text-slate-800">{template.clientDetails.gstNo}</strong></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Items List Preview */}
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                                            Fixed Services ({template.items?.length || 0})
                                        </span>
                                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                            {(template.items || []).map((item, i) => (
                                                <div 
                                                    key={i} 
                                                    className="p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                                                        <span className="font-bold text-slate-800 truncate" title={item.description}>
                                                            {item.description}
                                                        </span>
                                                        {item.hsn && (
                                                            <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                                                {item.hsn}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-mono text-slate-700 font-bold shrink-0 ml-2">
                                                        {item.qty > 1 && <span className="text-slate-400 text-[11px] font-normal mr-1">{item.qty} ×</span>}
                                                        ₹{(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString('en-IN')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Pricing & Dual 1-Click Action Buttons */}
                                <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500">Monthly Total</span>
                                        <div className="text-right">
                                            <span className="text-lg font-black font-mono text-slate-900 block">
                                                ₹{grandTotal.toLocaleString('en-IN')}
                                            </span>
                                            {isGst && (
                                                <span className="text-[10px] text-slate-400 block font-medium">
                                                    Incl. 18% GST (₹{taxAmount.toLocaleString('en-IN')})
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dual Action Buttons */}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button 
                                            type="button"
                                            onClick={() => onSelectForQuote && onSelectForQuote(template)}
                                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                                            title="Generate Quotation with this template"
                                        >
                                            <FileCheck size={14} />
                                            <span>Create Quote</span>
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={() => onSelectForInvoice && onSelectForInvoice(template)}
                                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                                            title="Generate Invoice with this template"
                                        >
                                            <FileText size={14} />
                                            <span>Create Invoice</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ========================================================
               ADD / EDIT MODAL
            ======================================================== */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-fade-up">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    {editId ? 'Edit Fixed Template' : 'Add New Fixed Template'}
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">
                                    Set up recurring client details and default services
                                </p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Template Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Template Identifier Title *
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. SR AUTOMATION, SEASON 6"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#FF4500] focus:bg-white"
                                />
                            </div>

                            {/* Client Details Section */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                                    <Building2 size={14} className="text-[#FF4500]" />
                                    <span>Client Details</span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Client / Business Name *</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="Official Client Name"
                                            value={formData.clientDetails.name}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                clientDetails: { ...formData.clientDetails, name: e.target.value } 
                                            })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-[#FF4500]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">GST No (Optional)</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 33BWDPS2896E2ZA"
                                            value={formData.clientDetails.gstNo}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                clientDetails: { ...formData.clientDetails, gstNo: e.target.value } 
                                            })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 outline-none focus:border-[#FF4500]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Address Line 1</label>
                                        <input 
                                            type="text" 
                                            placeholder="Door No, Street"
                                            value={formData.clientDetails.addressLine1}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                clientDetails: { ...formData.clientDetails, addressLine1: e.target.value } 
                                            })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#FF4500]"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Address Line 2</label>
                                        <input 
                                            type="text" 
                                            placeholder="Area / Landmark"
                                            value={formData.clientDetails.addressLine2}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                clientDetails: { ...formData.clientDetails, addressLine2: e.target.value } 
                                            })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#FF4500]"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Location / City / Pin</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Coimbatore - 641021, Tamil Nadu"
                                            value={formData.clientDetails.location}
                                            onChange={(e) => setFormData({ 
                                                ...formData, 
                                                clientDetails: { ...formData.clientDetails, location: e.target.value } 
                                            })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-[#FF4500]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                                        <Layers size={14} className="text-[#FF4500]" />
                                        <span>Fixed Line Items</span>
                                    </h4>
                                    <button 
                                        type="button" 
                                        onClick={handleAddItem}
                                        className="text-[11px] font-bold text-[#FF4500] hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} />
                                        <span>Add Item</span>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="Service Description"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                className="flex-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#FF4500]"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="HSN"
                                                value={item.hsn}
                                                onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                                                className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:border-[#FF4500]"
                                            />
                                            <input 
                                                type="number" 
                                                required
                                                min="0"
                                                placeholder="Price ₹"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#FF4500]"
                                            />
                                            <input 
                                                type="number" 
                                                required
                                                min="1"
                                                placeholder="Qty"
                                                value={item.qty}
                                                onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                className="w-14 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#FF4500]"
                                            />
                                            {formData.items.length > 1 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <X size={15} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tax Rate Setting */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tax Setting (GST vs Non-GST)
                                </label>
                                <select 
                                    value={formData.taxRate}
                                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#FF4500]"
                                >
                                    <option value={9}>18% GST (9% CGST + 9% SGST)</option>
                                    <option value={0}>0% Non-GST (No Tax)</option>
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 rounded-xl bg-[#FF4500] hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : (editId ? 'Update Template' : 'Save Fixed Template')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
