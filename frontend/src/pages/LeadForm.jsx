import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { ArrowLeft, Users, Building, Phone, Mail, MapPin, Target, CheckCircle, Save, Briefcase } from 'lucide-react';

const MASTER_SERVICES = [
    'Paid Campaigns',
    'Personal Branding',
    'Web Development',
    'SEO',
    'Full Digital Marketing'
];

const LEAD_SOURCES = ['Cold Leads', 'Meta Leads'];
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Appointment', 'Proposal Sent', 'Converted', 'Lost'];
const LEAD_TEMPS = ['Hot', 'Warm', 'Cold'];

export default function LeadForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const emptyForm = {
        customerName: '', companyName: '', mobileNumber: '', email: '',
        location: '', industry: '', leadSource: 'Meta Leads',
        serviceType: 'Web Development',
        productServiceInterested: 'Web Development',
        customService: '',
        leadValue: '', leadStatus: 'New',
        leadTemperature: 'Cold', nextFollowUpDate: '', notes: ''
    };

    const [formData, setFormData] = useState({ ...emptyForm });

    useEffect(() => {
        if (isEditMode) {
            fetchLeadData();
        } else if (location.state) {
            const preSource = location.state.leadSource || 'Meta Leads';
            const rawService = location.state.serviceType || 'Web Development';
            const matchedMaster = MASTER_SERVICES.find(m => m.toLowerCase() === rawService.toLowerCase());
            const isCustom = rawService && !matchedMaster;

            setFormData(prev => ({
                ...prev,
                leadSource: preSource,
                serviceType: isCustom ? 'Other' : (matchedMaster || 'Web Development'),
                productServiceInterested: matchedMaster || rawService || 'Web Development',
                customService: isCustom ? rawService : ''
            }));
        }
    }, [id, isEditMode, location.state]);

    const fetchLeadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/leads', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const lead = res.data.find(l => l._id === id);
            if (lead) {
                const rawSource = lead.leadSource || 'Meta Leads';
                const normSource = (rawSource === 'Cold' || rawSource === 'Cold Call')
                    ? 'Cold Leads'
                    : (rawSource === 'Meta' || rawSource === 'Meta Ads')
                        ? 'Meta Leads'
                        : rawSource;

                const serv = (lead.serviceType || lead.productServiceInterested || '').trim();
                const matchedMaster = MASTER_SERVICES.find(m => m.toLowerCase() === serv.toLowerCase());
                const isCustom = serv && !matchedMaster;

                setFormData({
                    customerName: lead.customerName || '',
                    companyName: lead.companyName || '',
                    mobileNumber: lead.mobileNumber || '',
                    email: lead.email || '',
                    location: lead.location || '',
                    industry: lead.industry || '',
                    leadSource: normSource,
                    serviceType: isCustom ? 'Other' : (matchedMaster || 'Web Development'),
                    productServiceInterested: matchedMaster || serv || 'Web Development',
                    customService: isCustom ? serv : '',
                    leadValue: lead.leadValue || '',
                    leadStatus: lead.leadStatus || 'New',
                    leadTemperature: lead.leadTemperature || 'Cold',
                    nextFollowUpDate: lead.nextFollowUpDate ? lead.nextFollowUpDate.split('T')[0] : '',
                    notes: lead.notes || ''
                });
            }
        } catch (error) {
            console.error('Error fetching lead details:', error);
            alert('Failed to load lead details');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const finalService = formData.serviceType === 'Other'
                ? (formData.customService || 'General')
                : (formData.serviceType || formData.productServiceInterested || 'Web Development');

            const payload = {
                ...formData,
                serviceType: finalService,
                productServiceInterested: finalService
            };

            if (isEditMode) {
                await axios.put(`http://localhost:5000/api/leads/${id}`, payload, { headers });
            } else {
                await axios.post('http://localhost:5000/api/leads', payload, { headers });
            }
            navigate('/sales');
        } catch (error) {
            console.error('Error saving lead:', error);
            alert('Error saving lead details');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto w-full animate-fade-up">
                
                {/* Sticky Header Action Bar */}
                <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200 py-4 px-6 flex items-center justify-between rounded-t-3xl shadow-sm mb-8 -mx-2 mt-2">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => navigate('/sales')} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{isEditMode ? 'Edit Lead' : 'Create New Lead'}</h1>
                            <p className="text-sm font-medium text-slate-500">{isEditMode ? 'Update existing lead information' : 'Add a new prospect to your pipeline'}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button type="button" onClick={() => navigate('/sales')} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" form="leadForm" disabled={saving || loading} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 flex items-center disabled:opacity-50 cursor-pointer">
                            {saving ? 'Saving...' : <><Save size={18} className="mr-2" /> Save Lead</>}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <form id="leadForm" onSubmit={handleSubmit} className="space-y-8 pb-12">
                        
                        {/* Block 1: Basic Info */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 rounded-l-[2rem]"></div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
                                <Users size={16} className="mr-2" /> Primary Contact
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Customer Name *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Users size={18} /></div>
                                        <input required type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" placeholder="e.g. John Doe" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Company Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Building size={18} /></div>
                                        <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" placeholder="e.g. Acme Corp" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Mobile Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Phone size={18} /></div>
                                        <input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" placeholder="+1 234 567 890" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" placeholder="john@example.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Location</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><MapPin size={18} /></div>
                                        <input type="text" name="location" value={formData.location} onChange={handleInputChange} 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" placeholder="City, Country" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Industry</label>
                                    <input type="text" name="industry" value={formData.industry} onChange={handleInputChange} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" placeholder="e.g. Tech, Retail" />
                                </div>
                            </div>
                        </div>

                        {/* Block 2: Business Needs & Pipeline */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 rounded-l-[2rem]"></div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center">
                                <Target size={16} className="mr-2" /> Pipeline Configuration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Lead Source</label>
                                    <select name="leadSource" value={formData.leadSource} onChange={handleInputChange} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 appearance-none">
                                        {LEAD_SOURCES.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Lead Status</label>
                                    <select name="leadStatus" value={formData.leadStatus} onChange={handleInputChange} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 appearance-none">
                                        {LEAD_STATUSES.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Temperature</label>
                                    <select name="leadTemperature" value={formData.leadTemperature} onChange={handleInputChange} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 appearance-none">
                                        {LEAD_TEMPS.map(o => <option key={o}>{o}</option>)}
                                    </select>
                                </div>
                                
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                                        <span className="flex items-center">
                                            <Briefcase size={16} className="mr-1.5 text-emerald-600" />
                                            Service Interested *
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-400">Select master service or custom</span>
                                    </label>
                                    <div className="space-y-2.5">
                                        <select 
                                            name="serviceType" 
                                            value={formData.serviceType} 
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    serviceType: val,
                                                    productServiceInterested: val === 'Other' ? (prev.customService || '') : val
                                                }));
                                            }} 
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-slate-800 cursor-pointer"
                                        >
                                            {MASTER_SERVICES.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                            <option value="Other">Other / Custom Service...</option>
                                        </select>

                                        {formData.serviceType === 'Other' && (
                                            <input 
                                                type="text" 
                                                name="customService" 
                                                value={formData.customService} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        customService: val,
                                                        productServiceInterested: val
                                                    }));
                                                }} 
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800" 
                                                placeholder="Type your custom service name..." 
                                                required={formData.serviceType === 'Other'}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Estimated Value ($)</label>
                                    <input type="number" name="leadValue" value={formData.leadValue} onChange={handleInputChange} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-emerald-600" placeholder="0.00" />
                                </div>
                                
                                <div className="space-y-2 md:col-span-1">
                                    <label className="text-sm font-bold text-slate-700">Next Follow-up Date</label>
                                    <input type="date" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleInputChange} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700">Additional Notes</label>
                                    <textarea name="notes" rows="3" value={formData.notes} onChange={handleInputChange} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 resize-none" placeholder="Add any background context, objections, or pain points..."></textarea>
                                </div>
                            </div>
                        </div>

                    </form>
                )}
            </div>
        </Layout>
    );
}
