import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import WorkspaceEditor from '../components/WorkspaceEditor';

const MASTER_SERVICES = [
    'Paid Campaigns',
    'Personal Branding',
    'Web Development',
    'SEO',
    'Full Digital Marketing'
];

const ROBOTRIQ_COURSES = [
    'DELTA INDUSTRIAL AUTOMATION',
    'SIEMENS INDUSTRIAL AUTOMATION',
    'ABB PROCESS AUTOMATION',
    'SCHNEIDER ELECTRIC INDUSTRIAL AUTOMATION',
    'INDUSTRIAL AUTOMATION 4.0',
    'MITSUBISHI ELECTRIC FACTORY AUTOMATION',
    'ALLEN BRADLEY - ROCKWELL AUTOMATION'
];

const LEAD_SOURCES = ['Cold Leads', 'Meta Leads'];
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Appointment', 'Proposal Sent', 'Converted', 'Lost'];
const LEAD_TEMPS = ['Hot', 'Warm', 'Cold'];
const followUpFormat = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
});
const followUpInput = value => value ? followUpFormat.format(new Date(value)).replace(' ', 'T') : '';

export default function LeadForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const salesSearch = location.state?.salesSearch;
    const salesPath = salesSearch ? '/sales?' + salesSearch : '/sales';
    const isEditMode = Boolean(id);

    const { user } = useAuth();
    const isRobotriq = Boolean(user?.email?.toLowerCase().includes('robotriq') || user?.companyName?.toLowerCase().includes('robotriq'));
    const activeMasterServices = useMemo(() => isRobotriq ? ROBOTRIQ_COURSES : MASTER_SERVICES, [isRobotriq]);
    const defaultService = activeMasterServices[0];

    const [loading, setLoading] = useState(isEditMode);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [owners, setOwners] = useState([]);
    const [owner, setOwner] = useState('');
    const [originalOwner, setOriginalOwner] = useState('');
    const [originalFollowUp, setOriginalFollowUp] = useState('');
    const canAssign = ['Admin', 'CEO'].includes(user?.role);

    useEffect(() => {
        if (!canAssign) return;
        const controller = new AbortController();
        axios.get('http://localhost:5000/api/leads/owners', { signal: controller.signal })
            .then(({ data }) => setOwners(Array.isArray(data) ? data : []))
            .catch(error => { if (!controller.signal.aborted) console.error('Lead owners unavailable:', error); });
        return () => controller.abort();
    }, [canAssign]);

    const emptyForm = {
        customerName: '', companyName: '', mobileNumber: '', whatsappNumber: '', email: '',
        location: '', industry: '', leadSource: 'Meta Leads',
        serviceType: defaultService,
        productServiceInterested: defaultService,
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
            const rawService = location.state.serviceType || defaultService;
            const matchedMaster = activeMasterServices.find(m => m.toLowerCase() === rawService.toLowerCase());
            const isCustom = rawService && !matchedMaster;

            setFormData(prev => ({
                ...prev,
                leadSource: preSource,
                serviceType: isCustom ? 'Other' : (matchedMaster || defaultService),
                productServiceInterested: matchedMaster || rawService || defaultService,
                customService: isCustom ? rawService : ''
            }));
        }
    }, [id, isEditMode, location.state, activeMasterServices, defaultService]);

    const fetchLeadData = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/leads', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const lead = res.data.find(l => l._id === id);
            if (lead) {
                const existingOwner = lead.assignedSalesperson?._id || lead.assignedSalesperson || '';
                setOwner(existingOwner);
                setOriginalOwner(existingOwner);
                setOriginalFollowUp(lead.nextFollowUpDate || '');
                const rawSource = lead.leadSource || 'Meta Leads';
                const normSource = (rawSource === 'Cold' || rawSource === 'Cold Call')
                    ? 'Cold Leads'
                    : (rawSource === 'Meta' || rawSource === 'Meta Ads')
                        ? 'Meta Leads'
                        : rawSource;

                const serv = (lead.serviceType || lead.productServiceInterested || '').trim();
                const matchedMaster = activeMasterServices.find(m => m.toLowerCase() === serv.toLowerCase());
                const isCustom = serv && !matchedMaster;

                setFormData({
                    customerName: lead.customerName || '',
                    companyName: lead.companyName || '',
                    mobileNumber: lead.mobileNumber || '',
                whatsappNumber: lead.whatsappNumber || '',
                    email: lead.email || '',
                    location: lead.location || '',
                    industry: lead.industry || '',
                    leadSource: normSource,
                    serviceType: isCustom ? 'Other' : (matchedMaster || defaultService),
                    productServiceInterested: matchedMaster || serv || defaultService,
                    customService: isCustom ? serv : '',
                    leadValue: lead.leadValue || '',
                    leadStatus: lead.leadStatus || 'New',
                    leadTemperature: lead.leadTemperature || 'Cold',
                    nextFollowUpDate: followUpInput(lead.nextFollowUpDate),
                    notes: lead.notes || ''
                });
            } else setLoadError('This lead could not be found.');
        } catch (error) {
            console.error('Error fetching lead details:', error);
            setLoadError('Failed to load lead details.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving || loading || loadError) return;
        setSaveError('');
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
                productServiceInterested: finalService,
                nextFollowUpDate: formData.nextFollowUpDate === followUpInput(originalFollowUp)
                    ? originalFollowUp || null
                    : formData.nextFollowUpDate ? new Date(`${formData.nextFollowUpDate}:00+05:30`).toISOString() : null,
                ...(canAssign && owner !== originalOwner && { assignedSalesperson: owner || null })
            };

            if (isEditMode) {
                await axios.put(`http://localhost:5000/api/leads/${id}`, payload, { headers });
            } else {
                await axios.post('http://localhost:5000/api/leads', payload, { headers });
            }
            navigate(salesPath);
        } catch (error) {
            console.error('Error saving lead:', error);
            setSaveError(error.response?.data?.message || 'Error saving lead details.');
        } finally {
            setSaving(false);
        }
    };

    const optionsFor = (values, current) => current && !values.includes(current) ? [...values, current] : values;

    return (
        <WorkspaceEditor backTo={salesPath} backLabel="Sales & Leads" label={isEditMode ? 'Edit lead' : 'New lead'}
            title="Who are we talking to?" formId="leadForm" saveLabel={saving ? 'Saving…' : 'Save lead'} disabled={saving || loading || !!loadError}>
                {loading ? <p role="status">Loading lead…</p> : loadError ? <p role="alert">{loadError}</p> : (
                    <form id="leadForm" onSubmit={handleSubmit} className="lead-editor-form">
                        <div className="lead-editor-fields">
                            {saveError && <p className="lead-save-error" role="alert">{saveError}</p>}
                            <section className="lead-editor-card" aria-labelledby="lead-contact-title">
                                <h2 id="lead-contact-title">Contact</h2>
                                <div className="lead-field-grid">
                                    <label>Company<input name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Company name" /></label>
                                    <label>Contact person<input required name="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="Full name" /></label>
                                    <label>Phone / WhatsApp<input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} placeholder="+91" /></label>
                                    <label>Email<input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@company.com" /></label>
                                </div>
                            </section>
                            <section className="lead-editor-card" aria-labelledby="lead-deal-title">
                                <h2 id="lead-deal-title">Deal</h2>
                                <fieldset className="lead-temperature">
                                    <legend>Temperature</legend>
                                    <div>{LEAD_TEMPS.map(value => (
                                        <label key={value}>
                                            <input type="radio" name="leadTemperature" value={value} checked={formData.leadTemperature === value} onChange={handleInputChange} />
                                            <span>{value}</span>
                                        </label>
                                    ))}</div>
                                </fieldset>
                                <div className="lead-field-grid">
                                    <label>Stage<select name="leadStatus" value={formData.leadStatus} onChange={handleInputChange}>
                                        {optionsFor(LEAD_STATUSES, formData.leadStatus).map(value => <option key={value}>{value}</option>)}
                                    </select></label>
                                    <label>Source<select name="leadSource" value={formData.leadSource} onChange={handleInputChange}>
                                        {optionsFor(LEAD_SOURCES, formData.leadSource).map(value => <option key={value}>{value}</option>)}
                                    </select></label>
                                    <label>Deal value (₹)<input type="number" name="leadValue" value={formData.leadValue} onChange={handleInputChange} placeholder="0" /></label>
                                    {canAssign && <label>Owner<select value={owner} onChange={event => setOwner(event.target.value)}>
                                        <option value="">Unassigned</option>
                                        {originalOwner && !owners.some(item => item._id === originalOwner) && <option value={originalOwner}>Current owner</option>}
                                        {owners.map(item => <option value={item._id} key={item._id}>{item.name}</option>)}
                                    </select></label>}
                                    <label className="lead-field-wide">Notes<textarea name="notes" rows="3" value={formData.notes} onChange={handleInputChange} placeholder="What did they ask for?" /></label>
                                </div>
                            </section>
                            <section className="lead-editor-card" aria-labelledby="lead-context-title">
                                <h2 id="lead-context-title">Location and service</h2>
                                <div className="lead-field-grid">
                                    <label>WhatsApp<input name="whatsappNumber" type="tel" value={formData.whatsappNumber || ''} onChange={handleInputChange} /></label>
                                    <label>Location<input name="location" value={formData.location} onChange={handleInputChange} placeholder="City, country" /></label>
                                    <label>Industry<input name="industry" value={formData.industry} onChange={handleInputChange} placeholder="Industry" /></label>
                                    <label className="lead-field-wide">Service interested<select name="serviceType" value={formData.serviceType} onChange={handleInputChange}>
                                        {activeMasterServices.map(value => <option key={value}>{value}</option>)}
                                        <option value="Other">Other / Custom Service</option>
                                    </select></label>
                                    {formData.serviceType === 'Other' && <label className="lead-field-wide">Custom service<input required name="customService" value={formData.customService} onChange={handleInputChange} /></label>}
                                </div>
                            </section>
                        </div>
                        <aside className="lead-followup">
                            <section className="lead-editor-card" aria-labelledby="lead-followup-title">
                                <h2 id="lead-followup-title">Next follow-up</h2>
                                <label>Date &amp; time (IST)<input type="datetime-local" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleInputChange} /></label>
                                <p>Remind via</p><span>App</span>
                            </section>
                            <p>Overdue follow-ups appear in red in Sales &amp; Leads and on the dashboard.</p>
                        </aside>
                    </form>
                )}
        </WorkspaceEditor>
    );
}
