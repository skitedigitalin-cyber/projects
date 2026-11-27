import '../components/RobotriqWorkspace.css';
import { getWorkspaceBrand } from '../utils/workspaceBrand';
import { getLeadCallbackProgress } from '../utils/callbackProgress';
import RobotriqEnquiries from '../components/RobotriqEnquiries';
import RobotriqReminders from '../components/RobotriqReminders';
import { lazy, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Pencil, Trash2, Phone, PhoneCall, MapPin, Building, Target, ArrowLeft, Megaphone, Globe, Monitor, Users, PhoneOutgoing, Bell, Clock, ChevronLeft, ChevronRight, Briefcase, Award, Zap, Cpu } from 'lucide-react';
import LeadDetailsModal from '../components/LeadDetailsModal';
import FitsModal from '../components/FitsModal';
import MqlSqlDashboard from '../components/MqlSqlDashboard';
import { calculateFitsScore } from '../utils/fitsScore';
import ProposalConfigTab from '../components/ProposalConfigTab';
import SalesActivityLog from '../components/SalesActivityLog';
import SalesLeadList from '../components/SalesLeadList';
import SalesChannelOverview, { SalesChannelMetrics } from '../components/SalesChannelOverview';
import { leadReminder, reminderGroup } from '../utils/salesPipeline';
import SalesTargetSettings from '../components/SalesTargetSettings';
import { compactRupees } from '../components/DashboardNumbers';

const LEAD_SOURCES = ['Meta Leads', 'Cold Leads'];

const MASTER_SERVICES = [
    'Web Development',
    'SEO',
    'Paid Campaigns',
    'Personal Branding',
    'Full Digital Marketing'
];

const SOURCE_CONFIG = {
    'Cold Leads': { icon: <PhoneOutgoing size={24} />, color: 'bg-amber-500', lightBg: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
    'Meta Leads': { icon: <Megaphone size={24} />,     color: 'bg-[#ff6a3d]',  lightBg: 'bg-[#f0f0ee]',  textColor: 'text-[#3f3f3f]',  borderColor: 'border-[#e6e6e3]' },
    // Fallback aliases
    'Cold':       { icon: <PhoneOutgoing size={24} />, color: 'bg-amber-500', lightBg: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
    'Meta':       { icon: <Megaphone size={24} />,     color: 'bg-[#ff6a3d]',  lightBg: 'bg-[#f0f0ee]',  textColor: 'text-[#3f3f3f]',  borderColor: 'border-[#e6e6e3]' },
    'Meta Ads':   { icon: <Megaphone size={24} />,     color: 'bg-[#ff6a3d]',  lightBg: 'bg-[#f0f0ee]',  textColor: 'text-[#3f3f3f]',  borderColor: 'border-[#e6e6e3]' },
    'Cold Call':  { icon: <PhoneOutgoing size={24} />, color: 'bg-amber-500', lightBg: 'bg-amber-50', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
};

const SERVICE_CONFIG = {
    // Digital Marketing (Skite)
    'Paid Campaigns': {
        icon: <Megaphone size={24} />,
        description: 'Facebook & Instagram lead generation campaigns'
    },
    'Personal Branding': {
        icon: <Users size={24} />,
        description: 'Executive, founder & creator personal branding inquiries'
    },
    'Web Development': {
        icon: <Globe size={24} />,
        description: 'Websites, web applications, landing pages & digital redesigns'
    },
    'SEO': {
        icon: <Target size={24} />,
        description: 'Search engine optimization & organic traffic growth retainers'
    },
    'Full Digital Marketing': {
        icon: <Monitor size={24} />,
        description: 'Full-suite 360° integrated marketing packages'
    },

    // Industrial Automation (Robotriq)
    'DELTA INDUSTRIAL AUTOMATION': {
        icon: <Zap size={24} />,
        description: 'Delta PLC, DVP/AS Series, HMI, SCADA & VFD drive systems'
    },
    'SIEMENS INDUSTRIAL AUTOMATION': {
        icon: <Cpu size={24} />,
        description: 'Siemens S7-1200/1500, TIA Portal v18 & WinCC automation'
    },
    'ABB PROCESS AUTOMATION': {
        icon: <Target size={24} />,
        description: 'ABB Freelance DCS, 800xA distributed control & robotics'
    },
    'SCHNEIDER ELECTRIC INDUSTRIAL AUTOMATION': {
        icon: <Globe size={24} />,
        description: 'Schneider Modicon M340/M580, EcoStruxure & Citect SCADA'
    },
    'INDUSTRIAL AUTOMATION 4.0': {
        icon: <Award size={24} />,
        description: 'Industry 4.0, smart factory, IIoT architecture & telemetry'
    },
    'MITSUBISHI ELECTRIC FACTORY AUTOMATION': {
        icon: <Monitor size={24} />,
        description: 'Mitsubishi FX5U/Q-series, GX Works3 & GOT2000 HMI'
    },
    'ALLEN BRADLEY - ROCKWELL AUTOMATION': {
        icon: <Briefcase size={24} />,
        description: 'Rockwell Studio 5000, ControlLogix & FactoryTalk View'
    }
};

const ROBOTRIQ_LEVELS = [
    'Beginner',
    'Intermediate',
    'Advance',
    'Master',
    'Certified Process Automation'
];

const getLeadLevel = (lead) => {
    if (lead?.level && lead.level !== '-') return lead.level;
    const raw = (lead?.serviceType || lead?.productServiceInterested || lead?.course || '').trim();
    if (!raw) return 'Beginner';
    const level = ROBOTRIQ_LEVELS.find(value => value.toLowerCase() === raw.toLowerCase());
    if (level) return level;
    const count = raw.split(',').map(c => c.trim()).filter(Boolean).length;
    if (count === 1) return 'Beginner';
    if (count === 2) return 'Intermediate';
    if (count === 3) return 'Advance';
    if (count === 4) return 'Master';
    if (count >= 5) return 'Certified Process Automation';
    return 'Beginner';
};

const LEVEL_CONFIG = {
    'Beginner': {
        icon: <Award size={24} />,
        description: 'Single automation course specialization (1 Course)'
    },
    'Intermediate': {
        icon: <Cpu size={24} />,
        description: 'Dual automation multi-platform package (2 Courses)'
    },
    'Advance': {
        icon: <Zap size={24} />,
        description: 'Triple automation comprehensive track (3 Courses)'
    },
    'Master': {
        icon: <Briefcase size={24} />,
        description: 'Quad-system automation engineering track (4 Courses)'
    },
    'Certified Process Automation': {
        icon: <Target size={24} />,
        description: 'Complete process automation master certification (5+ Courses)'
    }
};

const getServiceConfig = (name) => {
    return LEVEL_CONFIG[name] || SERVICE_CONFIG[name] || {
        icon: <Briefcase size={24} />,
        description: 'Specialized client inquiries and custom requirements'
    };
};

const normalizeLeadStage = lead => {
    if (['New', 'Lead', 'Contacted', 'Not', undefined, null].includes(lead.leadStatus)) {
        const status = { Qualified: 'Qualified', Appointment: 'Appointment', Convert: 'Converted', Converted: 'Converted' }[lead.leadStage];
        if (status && lead.callStatus !== 'Rejected') return { ...lead, leadStatus: status };
    }
    return lead;
};

const RobotriqTrainingLeads = lazy(() => import('../components/RobotriqTrainingLeads'));

export default function Sales() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const workspaceBrand = getWorkspaceBrand(user);
    const isRobotriq = workspaceBrand === 'robotriq';
    const canManageRobotriqSales = isRobotriq && ['Admin', 'Sales'].includes(user?.role);

    const [params, setParams] = useSearchParams();
    const requestedTab = params.get('view');
    const robotriqTabs = [
        ['training-leads', 'Training Leads Hub', true],
        ['direct-enquiries', 'Robotriq Enquiries', true],
        ['robotriq-reminders', 'Lead Reminders']
    ];
    const availableRobotriqTabs = canManageRobotriqSales
        ? robotriqTabs.filter(([, , adminOnly]) => !adminOnly || user.role === 'Admin') : [];
    const robotriqTitle = availableRobotriqTabs.find(([id]) => id === requestedTab)?.[1];
    const activeTab = robotriqTitle || ['dashboard', 'leads', 'targets', 'list'].includes(requestedTab) ? requestedTab : 'leads';
    const setActiveTab = view => setParams(view === 'leads' ? {} : { view });
    const [leads, setLeads] = useState([]);
    const [leadStatus, setLeadStatus] = useState('loading');
    const selectedSource = LEAD_SOURCES.includes(params.get('channel')) ? params.get('channel') : null;
    const selectedService = selectedSource ? params.get('service') : null;
    const channelList = selectedSource ? params.get('list') : null;
    const openChannel = channel => setParams(channel ? { channel } : {});
    const setSelectedService = service => {
        setPipelineTab('Leads');
        setSearchTerm('');
        setParams(service ? { channel: selectedSource, service } : { channel: selectedSource });
    };
    const [pipelineTab, setPipelineTab] = useState('Leads');
    const [searchTerm, setSearchTerm] = useState('');

    const dashboardMode = (params.get('view') || '').toLowerCase(); // 'mql' | 'sql' | ''
    const isDashboardView = Boolean(selectedSource && selectedService && (dashboardMode === 'mql' || dashboardMode === 'sql'));

    const openMqlDashboard = () => {
        setParams({ channel: selectedSource, service: selectedService, view: 'mql' });
    };

    const openSqlDashboard = () => {
        setParams({ channel: selectedSource, service: selectedService, view: 'sql' });
    };

    const closeDashboard = () => {
        setParams({ channel: selectedSource, service: selectedService });
    };

    // Pagination (15 records per page)
    const PAGE_SIZE = 15;
    const [gridPage, setGridPage] = useState(1);
    const [kanbanPages, setKanbanPages] = useState({
        'New': 1,
        'Qualified': 1,
        'Called': 1,
        'Contacted': 1,
        'Not Attend': 1,
        'Rejected': 1,
        'Waiting List': 1
    });

    // Reset pagination when source, service, search, or tab changes
    useEffect(() => {
        setGridPage(1);
        setKanbanPages({
            'New': 1,
            'Qualified': 1,
            'Called': 1,
            'Contacted': 1,
            'Not Attend': 1,
            'Rejected': 1,
            'Waiting List': 1
        });
    }, [selectedSource, selectedService, searchTerm, pipelineTab]);

    // Modals
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isFitsModalOpen, setIsFitsModalOpen] = useState(false);
    const [fitsLead, setFitsLead] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [draftCallStatus, setDraftCallStatus] = useState(null);

    const openFitsModal = (lead) => {
        setFitsLead(lead);
        setIsFitsModalOpen(true);
    };

    // Form
    async function fetchLeads() {
        try {
            const res = await axios.get('http://localhost:5000/api/leads');
            setLeads(Array.isArray(res.data) ? res.data.map(normalizeLeadStage) : []);
            setLeadStatus('ready');
        } catch (error) {
            setLeadStatus('error');
            console.error("Error fetching leads:", error);
        }
    }
    useEffect(() => { fetchLeads(); }, []);

    const handleDeleteLead = async () => {
        try {
            await axios.delete(`http://localhost:5000/api/leads/${selectedLead._id}`);
            setIsDeleteModalOpen(false);
            setSelectedLead(null);
            fetchLeads();
        } catch (error) { console.error("Error deleting lead:", error); }
    };

    const handleQuickQualify = async (lead) => {
        try {
            const res = await axios.put(`http://localhost:5000/api/leads/${lead._id}`, {
                leadStatus: 'Qualified',
                leadStage: 'Qualified',
                qualifiedAlertDate: new Date().toISOString().split('T')[0],
                qualifiedNotes: 'Qualified from MQL Dashboard'
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLeads(prev => prev.map(l => l._id === lead._id ? normalizeLeadStage(res.data) : l));
        } catch (err) {
            console.error('Error qualifying lead:', err);
            alert('Failed to qualify lead.');
        }
    };

    const handleQuickRevertToLead = async (lead) => {
        try {
            const res = await axios.put(`http://localhost:5000/api/leads/${lead._id}`, {
                leadStatus: 'New',
                leadStage: 'Lead',
                callStatus: 'Called',
                qualifiedAlertDate: '',
                qualifiedAlertTime: '',
                qualifiedNotes: '',
                qualifiedDetails: ''
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setLeads(prev => prev.map(l => l._id === lead._id ? normalizeLeadStage(res.data) : l));
        } catch (err) {
            console.error('Error reverting lead:', err);
            alert('Failed to revert lead.');
        }
    };

    const handleDragStart = (e, leadId) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDrop = async (e, targetStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        const originalLead = leads.find(l => l._id === leadId);
        if (!originalLead || ['Appointment', 'Converted'].includes(originalLead.leadStatus)) return;

        let newCallStatus = targetStage;
        if (targetStage === 'New') {
            newCallStatus = 'Lead';
        } else if (targetStage === 'Qualified') {
            newCallStatus = 'Qualified';
        } else if (targetStage === 'Called') {
            newCallStatus = 'Called';
        } else if (targetStage === 'Contacted') {
            const { nextAllowed } = getLeadCallbackProgress(originalLead);
            newCallStatus = `Callback (${nextAllowed})`;
        } else if (targetStage === 'Not Attend') {
            newCallStatus = 'Not Attend';
        } else if (targetStage === 'Rejected') {
            newCallStatus = 'Rejected';
        } else if (targetStage === 'Waiting List') {
            newCallStatus = 'Waiting List';
        }

        // We DO NOT save to the backend yet! 
        // We just open the modal with the pre-filled target status.
        // If they click 'Save' in the modal, it will save. If they click 'Close', nothing happens.
        setDraftCallStatus(newCallStatus);
        setSelectedLead(originalLead);
        setIsViewModalOpen(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Required to allow dropping
    };

    const openViewModal = (lead) => { setDraftCallStatus(null); setSelectedLead(lead); setIsViewModalOpen(true); };
    const openEditModal = (lead) => {
        setIsViewModalOpen(false); // Close view modal if it was open
        navigate(`/sales/lead/edit/${lead._id}`, { state: { salesSearch: params.toString() } });
    };
    const openDeleteModal = (lead) => { setSelectedLead(lead); setIsDeleteModalOpen(true); };
    const openAddWithSource = (source, service) => { 
        navigate('/sales/lead/add', {
            state: {
                leadSource: source === 'All' ? 'Meta Leads' : (source || 'Meta Leads'),
                serviceType: service && service !== 'All' ? service : undefined,
                salesSearch: params.toString()
            }
        }); 
    };

    // --- Filtered Leads & Dynamic Services ---
    const getLeadsBySource = useCallback(source => leads.filter(l => {
        if (source === 'Cold Leads' || source === 'Cold') {
            return l.leadSource === 'Cold Leads' || l.leadSource === 'Cold' || l.leadSource === 'Cold Call';
        }
        if (source === 'Meta Leads' || source === 'Meta') {
            return l.leadSource === 'Meta Leads' || l.leadSource === 'Meta' || l.leadSource === 'Meta Ads';
        }
        return l.leadSource === source;
    }), [leads]);

    // Available services for the currently selected source
    const availableServices = useMemo(() => {
        if (!selectedSource) return [];
        const sourceLeads = getLeadsBySource(selectedSource);
        
        const map = {};

        if (isRobotriq) {
            // Pre-initialize the 5 Levels for Robotriq
            ROBOTRIQ_LEVELS.forEach(lvl => {
                map[lvl] = {
                    name: lvl,
                    count: 0,
                    totalValue: 0,
                    alerts: 0,
                    statuses: { New: 0, Contacted: 0, Qualified: 0, Appointment: 0, Converted: 0, Lost: 0 }
                };
            });

            sourceLeads.forEach(l => {
                const lvl = getLeadLevel(l);
                if (!map[lvl]) {
                    map[lvl] = {
                        name: lvl,
                        count: 0,
                        totalValue: 0,
                        alerts: 0,
                        statuses: { New: 0, Contacted: 0, Qualified: 0, Appointment: 0, Converted: 0, Lost: 0 }
                    };
                }
                map[lvl].count++;
                map[lvl].totalValue += (Number(l.leadValue) || 0);
                if (l.leadStatus && map[lvl].statuses[l.leadStatus] !== undefined) {
                    map[lvl].statuses[l.leadStatus]++;
                }
                const aDate = l.appointmentAlertDate || l.qualifiedAlertDate || l.callbackAlertDate;
                const aTime = l.appointmentAlertTime || l.qualifiedAlertTime || l.callbackAlertTime || '00:00';
                if (aDate && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost') {
                    const dt = new Date(`${aDate}T${aTime}`);
                    if (dt <= new Date()) map[lvl].alerts++;
                }
            });

            // Return strictly in standard level order: Beginner, Intermediate, Advance, Master, Certified Process Automation
            return ROBOTRIQ_LEVELS.map(lvl => map[lvl]);
        }

        // For other tenants (Skite Digital)
        MASTER_SERVICES.forEach(s => {
            map[s] = {
                name: s,
                count: 0,
                totalValue: 0,
                alerts: 0,
                statuses: { New: 0, Contacted: 0, Qualified: 0, Appointment: 0, Converted: 0, Lost: 0 }
            };
        });

        sourceLeads.forEach(l => {
            const raw = (l.serviceType || l.productServiceInterested || '').trim();
            const matchedMaster = MASTER_SERVICES.find(m => m.toLowerCase() === raw.toLowerCase());
            const s = matchedMaster || (raw ? raw : 'Web Development');

            if (!map[s]) {
                map[s] = {
                    name: s,
                    count: 0,
                    totalValue: 0,
                    alerts: 0,
                    statuses: { New: 0, Contacted: 0, Qualified: 0, Appointment: 0, Converted: 0, Lost: 0 }
                };
            }
            map[s].count++;
            map[s].totalValue += (Number(l.leadValue) || 0);
            if (l.leadStatus && map[s].statuses[l.leadStatus] !== undefined) {
                map[s].statuses[l.leadStatus]++;
            }
            const due = leadReminder(l);
            if (due && due <= new Date()) map[s].alerts++;
        });

        return Object.values(map).sort((a, b) => {
            // Put services with leads first (descending count)
            if (b.count !== a.count) return b.count - a.count;
            // For ties (e.g. services with 0 leads), preserve master services order
            const aIdx = MASTER_SERVICES.indexOf(a.name);
            const bIdx = MASTER_SERVICES.indexOf(b.name);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [getLeadsBySource, selectedSource, isRobotriq]);

    const channelLeads = selectedSource ? getLeadsBySource(selectedSource) : [];
    const totalSourceLeadsCount = channelLeads.length;
    const filteredSourceLeads = channelLeads.filter(l => {
            let matchesService = true;
            if (selectedService && selectedService !== 'All') {
                if (isRobotriq) {
                    const leadLevel = getLeadLevel(l);
                    matchesService = leadLevel.toLowerCase() === selectedService.trim().toLowerCase();
                } else {
                    const leadService = ((l.serviceType || l.productServiceInterested || '').trim() || 'Web Development').toLowerCase();
                    matchesService = leadService === selectedService.trim().toLowerCase();
                }
            }

            const term = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || (
                (l.customerName || '').toLowerCase().includes(term) ||
                (l.companyName || '').toLowerCase().includes(term) ||
                (l.mobileNumber || '').includes(term) ||
                (l.leadId || '').toLowerCase().includes(term) ||
                (l.location || '').toLowerCase().includes(term) ||
                (l.serviceType || '').toLowerCase().includes(term) ||
                (l.productServiceInterested || '').toLowerCase().includes(term)
            );

            return matchesService && matchesSearch;
        });

    const mqlLeadsCount = useMemo(() => {
        return filteredSourceLeads.filter(l => {
            const cs = (l.callStatus || '').toLowerCase();
            return cs.includes('callback') || (l.leadStatus === 'Contacted' && cs.startsWith('callback'));
        }).length;
    }, [filteredSourceLeads]);

    const sqlLeadsCount = useMemo(() => {
        return filteredSourceLeads.filter(l => l.leadStatus === 'Qualified').length;
    }, [filteredSourceLeads]);

    // --- KPI ---

    // --- Helpers ---
    const getTempBadge = (temp) => {
        switch (temp) { case 'Hot': return 'bg-red-100 text-red-700'; case 'Warm': return 'bg-yellow-100 text-yellow-700'; default: return 'bg-[#e6e6e3] text-[#111111]'; }
    };
    const getTempIcon = (temp) => {
        switch (temp) { case 'Hot': return '🔥'; case 'Warm': return '🌤️'; default: return '❄️'; }
    };

    // --- FORM MODAL ---
    const openValue = leads.reduce((value, lead) => ['Converted', 'Lost'].includes(lead.leadStatus)
        ? value : value + (Number(lead.leadValue) || 0), 0);

    // Only apply full-width layout to the specific Pipeline Kanban board page
    const isPipelineView = activeTab === 'leads' && Boolean(selectedSource) && Boolean(selectedService);

    return (
        <Layout workspace compactTools fullWidth={isPipelineView}>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up {
                    animation: fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
                .delay-100 { animation-delay: 100ms; }
                .delay-200 { animation-delay: 200ms; }
                .delay-300 { animation-delay: 300ms; }
                
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    position: relative;
                    overflow: hidden;
                }
                .animate-shimmer::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                    transform: translateX(-100%);
                    animation: shimmer 2.5s infinite;
                }
            `}} />
            
            <header className={isRobotriq ? "sales-page-heading robotriq-sales-views" : "sales-page-heading"}>
                <div>
                    <p>Sales &amp; Leads</p>
                    <h1>{robotriqTitle || (activeTab === 'targets' ? 'Sales targets' : leadStatus === 'loading' ? 'Loading leads…' : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`)}
                        {!robotriqTitle && activeTab !== 'targets' && leadStatus === 'ready' && <span> · {compactRupees(openValue)} open</span>}
                    </h1>
                </div>
                <div className="sales-page-actions">
                    <nav aria-label="Sales views">
                        {[['dashboard', 'Dashboard'], ['leads', 'Leads'], ['targets', 'Targets'],
                            ...availableRobotriqTabs].map(([id, label]) => (
                            <button type="button" key={id} aria-current={activeTab === id || (id === 'leads' && activeTab === 'list') ? 'page' : undefined}
                                onClick={() => setActiveTab(id)}>{label}</button>
                        ))}
                    </nav>
                    {!robotriqTitle && !selectedSource && <button type="button" onClick={() => navigate('/sales/lead/add')}><Plus size={15} /> Add lead</button>}
                </div>
            </header>

            {activeTab === 'direct-enquiries' && <RobotriqEnquiries key="direct-enquiries" mode="direct" canDelete />}
            {activeTab === 'robotriq-reminders' && <RobotriqReminders canDelete={user.role === 'Admin'} />}
            {activeTab === 'training-leads' && <Suspense fallback={<p role="status">Loading training leads…</p>}><RobotriqTrainingLeads admin /></Suspense>}
            {activeTab === 'list' && <SalesLeadList leads={leads} loading={leadStatus === 'loading'} failed={leadStatus === 'error'}
                onView={openViewModal} onBrowseSources={() => setActiveTab('leads')} />}

            {/* ======== DASHBOARD TAB ======== */}
            {activeTab === 'dashboard' && (
                <div>
                    {/* ======== DAILY CLIENT ACTIONS & STATUS LOG (WITH 2 DATE FILTERS & PAGINATION) ======== */}
                    <SalesActivityLog 
                        leads={leads} 
                        onViewLead={openViewModal}
                    />
                </div>
            )}

            {/* ======== LEAD MANAGEMENT TAB ======== */}
            {activeTab === 'leads' && !selectedSource && (
                <section className="mx-auto max-w-3xl py-8">
                    <h2 className="mb-6 text-2xl font-bold">Choose your channel</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {LEAD_SOURCES.map(source => (
                            <button key={source} type="button" onClick={() => openChannel(source)}
                                className="rounded-2xl border border-[#e6e6e3] bg-white p-6 text-left shadow-sm hover:bg-[#f5f5f3]">
                                {SOURCE_CONFIG[source].icon}
                                <span className="mt-4 block text-lg font-bold">{source}</span>
                                <span className="mt-1 block text-sm text-slate-500">
                                    {source === 'Meta Leads' ? 'Inbound ads' : 'Calling and manual lists'}
                                </span>
                                <span className="mt-4 flex items-center gap-1 text-sm font-semibold">Open pipeline <ChevronRight size={15} /></span>
                            </button>
                        ))}
                    </div>
                    <button type="button" className="mt-5 text-sm font-semibold underline" onClick={() => setActiveTab('list')}>View all leads</button>
                </section>
            )}

            {activeTab === 'leads' && selectedSource && channelList && (
                <section>
                    <button type="button" className="mb-4 flex items-center gap-2 text-sm font-semibold"
                        onClick={() => openChannel(selectedSource)}><ArrowLeft size={16} /> Back to {selectedSource}</button>
                    <h2 className="mb-4 text-xl font-bold">{channelList === 'today' ? 'Scheduled follow-ups'
                        : channelList === 'missed' ? 'Missed follow-ups' : selectedSource}</h2>
                    <SalesLeadList key={channelList} leads={channelLeads.filter(lead =>
                        channelList === 'all' || reminderGroup(lead, new Date()) === channelList)}
                        loading={leadStatus === 'loading'} failed={leadStatus === 'error'}
                        onView={openViewModal} onBrowseSources={() => openChannel(null)} />
                </section>
            )}

            {/* ======== LEVEL 2: SERVICES SELECTION GRID ======== */}
            {activeTab === 'leads' && selectedSource && !selectedService && !channelList && (
                <div className="animate-fade-up delay-100">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center space-x-3.5">
                            <button 
                                onClick={() => openChannel(null)}
                                className="p-2.5 border border-[#e6e6e3] rounded-xl bg-white hover:bg-[#f5f5f3] cursor-pointer transition-colors shadow-xs"
                                title="Change category"
                            >
                                <span className="flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> Change category</span>
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-black text-[#111111] tracking-tight">{selectedSource} {isRobotriq ? 'Levels Overview' : 'Services'}</h2>
                                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3] rounded-full">
                                        {totalSourceLeadsCount} Total Leads
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs mt-0.5 font-medium">
                                    {isRobotriq ? 'Select a level below to open its dedicated pipeline and manage leads.' : 'Select a service below to open its dedicated pipeline and manage leads.'}
                                </p>
                            </div>
                        </div>

                    </div>
                    <SalesChannelMetrics leads={channelLeads}
                        onOpen={list => setParams({ channel: selectedSource, list })} />
                    <h3 className="mb-3 font-bold">Service segmentation</h3>
                    <SalesChannelOverview key={selectedSource} source={selectedSource}
                        leads={channelLeads} services={availableServices.map(service => service.name)}
                        defaultService={isRobotriq ? ROBOTRIQ_LEVELS[0] : MASTER_SERVICES[0]}
                        onChange={created => setLeads(current => [...created.slice().reverse(), ...current])} />

                    {/* Services Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {availableServices.map((service) => {
                            const cfg = getServiceConfig(service.name);

                            return (
                                <div
                                    key={service.name}
                                    role="button" tabIndex={0}
                                    onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelectedService(service.name); } }}
                                    onClick={() => setSelectedService(service.name)}
                                    className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100 transition-all duration-300 group cursor-pointer hover:border-[#e6e6e3] hover:shadow-xl hover:-translate-y-1"
                                >
                                    <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] text-left flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="bg-[#f0f0ee] text-[#3f3f3f] p-3.5 rounded-2xl transition-all group-hover:scale-110 group-hover:rotate-6 relative shadow-xs">
                                                    {cfg.icon}
                                                    {service.alerts > 0 && (
                                                        <span className="absolute -top-2 -right-2 bg-orange-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-pulse shadow-sm flex items-center">
                                                            <Bell size={8} className="mr-1" /> {service.alerts}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-3xl font-black text-[#111111] group-hover:text-[#3f3f3f] transition-colors">
                                                        {service.count}
                                                    </span>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Leads</p>
                                                </div>
                                            </div>

                                            <h3 className="font-bold text-[#111111] text-lg group-hover:text-[#3f3f3f] transition-colors">
                                                {service.name}
                                            </h3>
                                            <p className="text-slate-500 text-xs mt-1 font-medium leading-relaxed">
                                                {cfg.description}
                                            </p>
                                        </div>

                                        {/* Stages breakdown */}
                                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                                {service.count === 0 ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-[#f0f0ee] text-slate-500 font-semibold text-[10px]">
                                                        0 Leads
                                                    </span>
                                                ) : (
                                                    <>
                                                        {service.statuses.New > 0 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-[#f0f0ee] text-[#111111] font-bold text-[10px]">
                                                                {service.statuses.New} New
                                                            </span>
                                                        )}
                                                        {service.statuses.Qualified > 0 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-[#f0f0ee] text-[#3f3f3f] font-bold text-[10px]">
                                                                {service.statuses.Qualified} Qualified
                                                            </span>
                                                        )}
                                                        {service.statuses.Appointment > 0 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px]">
                                                                {service.statuses.Appointment} Appt
                                                            </span>
                                                        )}
                                                        {service.statuses.Converted > 0 && (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                                                {service.statuses.Converted} Won
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openAddWithSource(selectedSource === 'All' ? 'Meta Leads' : selectedSource, service.name);
                                                    }}
                                                    className="p-1 px-2.5 text-[11px] font-bold text-slate-700 hover:text-[#3f3f3f] hover:bg-[#f0f0ee] border border-[#e6e6e3] rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                                    title={`Add Lead directly to ${service.name}`}
                                                >
                                                    <Plus size={12} />
                                                    <span>Add</span>
                                                </button>
                                                <span className="text-xs font-bold text-[#3f3f3f] flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                                                    <span>Pipeline</span>
                                                    <ChevronRight size={14} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ======== LEVEL 3: LEADS KANBAN BOARD & DEDICATED MQL/SQL DASHBOARDS ======== */}
            {activeTab === 'leads' && selectedSource && selectedService && isDashboardView ? (
                <div className="flex min-w-0 flex-col animate-fade-up">
                    <MqlSqlDashboard
                        mode={dashboardMode}
                        leads={filteredSourceLeads}
                        serviceName={selectedService}
                        channelName={selectedSource}
                        onBackToPipeline={closeDashboard}
                        onSwitchMode={(m) => setParams({ channel: selectedSource, service: selectedService, view: m })}
                        onViewLead={openViewModal}
                        onOpenFits={openFitsModal}
                        onMoveToQualified={handleQuickQualify}
                        onMoveBackToLeads={handleQuickRevertToLead}
                    />
                </div>
            ) : activeTab === 'leads' && selectedSource && selectedService ? (
                <div className="flex min-w-0 flex-col animate-fade-up delay-100">
                    {/* Header */}
                    <div className="mb-5 flex flex-wrap items-center gap-4">
                        <button 
                            onClick={() => { setSelectedService(null); setSearchTerm(''); }} 
                            className="p-2 border border-[#e6e6e3] rounded-lg bg-white hover:bg-[#f5f5f3] cursor-pointer transition-colors shadow-sm"
                            title={`Back to ${selectedSource} ${isRobotriq ? 'Levels' : 'Services'}`}
                        >
                            <ArrowLeft size={18} className="text-slate-600" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-bold text-[#111111] tracking-tight">
                                    {selectedService === 'All' ? `All ${selectedSource}` : selectedService} Pipeline
                                </h2>
                                <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3] rounded-full">
                                    {filteredSourceLeads.length} Leads
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium">
                                <span className="hover:underline cursor-pointer" onClick={() => openChannel(null)}>Lead Management</span>
                                {' > '}
                                <span className="hover:underline cursor-pointer" onClick={() => setSelectedService(null)}>{selectedSource}</span>
                                {' > '}
                                <span className="text-slate-700 font-bold">{selectedService}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                            {/* Prominent MQL & SQL Option Buttons */}
                            <div className="flex items-center gap-2 mr-1">
                                <button
                                    type="button"
                                    onClick={openMqlDashboard}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer border bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400 hover:shadow-sm active:scale-95"
                                    title="Open Dedicated MQL Dashboard (Callbacks & FITS)"
                                >
                                    <PhoneCall size={13} className="text-amber-600" />
                                    <span>MQL Dashboard</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900">
                                        {mqlLeadsCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={openSqlDashboard}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer border bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 hover:shadow-sm active:scale-95"
                                    title="Open Dedicated SQL Dashboard (Qualified Leads & Deals)"
                                >
                                    <Award size={13} className="text-emerald-600" />
                                    <span>SQL Dashboard</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-200/80 text-emerald-900">
                                        {sqlLeadsCount}
                                    </span>
                                </button>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
                                <input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-52 sm:w-64 pl-9 pr-4 py-2 bg-white border border-[#e6e6e3] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all hover:border-slate-300" />
                            </div>
                            <button onClick={() => openAddWithSource(selectedSource, selectedService)} className="flex items-center bg-[#111111] text-white px-4 py-2 rounded-full hover:bg-[#303030] transition-all shadow-md hover:shadow-lg text-sm font-semibold cursor-pointer active:scale-95">
                                <Plus size={16} className="mr-1.5" /> Add Lead
                            </button>
                        </div>
                    </div>

                    {/* Pipeline Top Tabs */}
                    <div className="w-full border-b border-[#e6e6e3] mb-6 overflow-x-auto shrink-0 min-h-[60px] bg-white rounded-t-[1rem]">
                        <div className="flex items-center whitespace-nowrap w-full h-full">
                            {['Leads', 'Qualified', 'Appointment', 'Convert', 'Proposal Message'].map((tabName) => {
                                const isActive = pipelineTab === tabName;
                                
                                // Calculate count and alerts for each tab based on DB statuses mapping to tabs
                                let tabCount = 0;
                                let tabAlerts = 0;
                                const displayLeads = filteredSourceLeads;
                                
                                const getAlertCount = (leadArray) => {
                                    let alerts = 0;
                                    const now = new Date();
                                    leadArray.forEach(l => {
                                        const due = leadReminder(l);
                                        if (due && due <= now) alerts++;
                                    });
                                    return alerts;
                                };

                                if (tabName === 'Leads') {
                                    const leadsInTab = displayLeads.filter(l => !['Qualified', 'Appointment', 'Converted'].includes(l.leadStatus) && (l.rejectedFromStage || '').trim().toLowerCase() !== 'qualified');
                                    tabCount = leadsInTab.length;
                                    tabAlerts = getAlertCount(leadsInTab);
                                } else if (tabName === 'Qualified') {
                                    const leadsInTab = displayLeads.filter(l => l.leadStatus === 'Qualified' || (l.rejectedFromStage || '').trim().toLowerCase() === 'qualified');
                                    tabCount = leadsInTab.length;
                                    tabAlerts = getAlertCount(leadsInTab);
                                } else if (tabName === 'Appointment') {
                                    const leadsInTab = displayLeads.filter(l => l.leadStatus === 'Appointment');
                                    tabCount = leadsInTab.length;
                                    tabAlerts = getAlertCount(leadsInTab);
                                } else if (tabName === 'Convert') {
                                    const leadsInTab = displayLeads.filter(l => l.leadStatus === 'Converted');
                                    tabCount = leadsInTab.length;
                                    tabAlerts = getAlertCount(leadsInTab);
                                }

                                return (
                                    <button 
                                        key={tabName} 
                                        onClick={() => setPipelineTab(tabName)}
                                        className={`py-4 px-8 text-[15px] font-semibold flex items-center transition-all cursor-pointer relative ${isActive ? 'text-[#3f3f3f] bg-[#f0f0ee]/50 border-b-[3px] border-blue-600' : 'text-slate-500 hover:text-slate-800 bg-white border-b-[3px] border-transparent'}`}
                                    >
                                        {tabName}
                                        {tabName !== 'Proposal Message' && (
                                            <span className={`ml-3 text-xs px-2.5 py-1 rounded-full font-bold flex items-center ${isActive ? 'bg-[#e6e6e3] text-[#111111]' : 'bg-[#f0f0ee] text-slate-500'}`}>
                                                {tabCount}
                                            </span>
                                        )}
                                        {tabAlerts > 0 && (
                                            <span className="absolute top-2 right-2 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pipeline Tab Content */}
                    <div className="flex-1 pb-6 w-full">
                        <div className="flex w-full h-full items-start">
                            {(() => {
                                // If Proposal Message Tab
                                if (pipelineTab === 'Proposal Message') {
                                    return <div className="animate-fade-up w-full"><ProposalConfigTab key={selectedService} sourceName={selectedSource} serviceType={selectedService} /></div>;
                                }

                                const sortAlertsFirst = (a, b) => {
                                    const getAlertPriority = (l) => {
                                        const dt = leadReminder(l);
                                        if (!dt || Number.isNaN(+dt)) return 3;
                                        if (dt <= new Date()) return 1; // Overdue
                                        if (dt.toDateString() === new Date().toDateString()) return 2; // Today
                                        return 3; // Future or None
                                    };
                                    const pA = getAlertPriority(a);
                                    const pB = getAlertPriority(b);
                                    if (pA !== pB) return pA - pB;
                                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                                };

                                const getAlertStatusInfo = (lead) => {
                                    const dt = leadReminder(lead);
                                    if (!dt || Number.isNaN(+dt)) return null;
                                    const now = new Date();
                                    let status = 'upcoming';
                                    if (dt <= now) status = 'overdue';
                                    
                                    return {
                                        status,
                                        text: dt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
                                    };
                                };

                                const displayLeads = filteredSourceLeads;

                                const renderLeadCard = (lead) => {
                                    const alert = getAlertStatusInfo(lead);
                                    const fitsResult = calculateFitsScore(lead.fits);
                                    const hasFits = Boolean(lead.fits && (lead.fits.familiarity || lead.fits.intention || lead.fits.time || lead.fits.spend));
                                    const baseClass = "p-3 bg-white rounded-xl border border-slate-100 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 group relative cursor-pointer";
                                    let borderClass = "";
                                    
                                    if (alert?.status === 'overdue') borderClass = "bg-red-50 border-red-200 border-l-[4px] border-l-red-500 hover:shadow-md";

                                    return (
                                        <div 
                                            key={lead._id} 
                                            className={`${baseClass} ${borderClass}`} 
                                            tabIndex={0}
                                            role="button"
                                            aria-label={lead.customerName}
                                            onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); openViewModal(lead); } }}
                                            onClick={() => openViewModal(lead)}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead._id)}
                                        >
                                            <div className="flex justify-between items-start gap-1 mb-1.5">
                                                <h4 className="font-bold text-[#111111] text-[13px] leading-tight truncate group-hover:text-[#3f3f3f] transition-colors" title={lead.customerName}>{lead.customerName}</h4>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {hasFits && (
                                                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black border flex items-center gap-0.5 shadow-2xs ${fitsResult.badgeClass}`} title={`FITS Score: ${fitsResult.score}% (${fitsResult.label})`}>
                                                            <Zap size={9} className="fill-current text-yellow-500" />
                                                            {fitsResult.score}%
                                                        </span>
                                                    )}
                                                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${getTempBadge(lead.leadTemperature)}`}>{getTempIcon(lead.leadTemperature)} {lead.leadTemperature}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1 mb-1.5">
                                                {(lead.companyName || lead.industry) && <p className="text-[11px] text-slate-500 flex items-center font-medium truncate max-w-full"><Building size={11} className="mr-1 text-slate-400 shrink-0"/>{lead.companyName || lead.industry}</p>}
                                                {lead.location && <span className="text-[10px] text-slate-500 font-semibold flex items-center bg-[#f0f0ee] px-1.5 py-0.2 rounded"><MapPin size={10} className="mr-0.5 text-slate-400 shrink-0" />{lead.location}</span>}
                                            </div>
                                            
                                            {/* Level & Service Tags */}
                                            <div className="flex flex-wrap items-center gap-1 mb-1.5">
                                                {isRobotriq && (
                                                     <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                                                        <Award size={9} className="mr-0.5 text-teal-600" />
                                                        {getLeadLevel(lead)}
                                                    </span>
                                                )}
                                                {(lead.serviceType || lead.productServiceInterested) && (
                                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#f0f0ee] text-[#111111] border border-[#ededea] truncate max-w-full">
                                                        <Briefcase size={9} className="mr-0.5 text-blue-500 shrink-0" />
                                                        <span className="truncate">{lead.serviceType || lead.productServiceInterested}</span>
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {alert && (
                                                <div className={`mt-1.5 mb-2 flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded w-max ${
                                                    alert.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-[#f0f0ee] text-slate-500'
                                                }`}>
                                                    {alert.status === 'overdue' ? <Bell size={9} className="mr-1 animate-pulse" /> : <Clock size={9} className="mr-1" />}
                                                    {alert.text}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 gap-1">
                                                <p className="text-[11px] text-slate-600 flex items-center font-medium truncate"><Phone size={11} className="mr-1 text-slate-400 shrink-0"/>{lead.mobileNumber || '-'}</p>
                                                <p className="text-[11px] font-black text-[#111111] bg-[#f5f5f3] px-1.5 py-0.5 rounded border border-slate-100 shrink-0">₹{(lead.leadValue || 0).toLocaleString()}</p>
                                            </div>

                                            {/^(Callback|Waiting List)/.test(lead.callStatus || '') && (
                                                <p className="mt-1.5 text-[10px] font-semibold text-slate-600 truncate">{lead.callStatus}{lead.waitingListDescription && lead.callStatus === 'Waiting List' ? ' · ' + lead.waitingListDescription : ''}</p>
                                            )}
                                            {lead.callStatus === 'Rejected' && (
                                                <div className="mt-2 p-1.5 bg-red-50 rounded-lg border border-red-100 text-[10px]">
                                                    <p className="text-[9px] text-red-600 font-bold mb-0.5">Rejected from {lead.rejectedFromStage || 'Unknown'}</p>
                                                    <p className="text-[10px] text-red-800 line-clamp-2" title={lead.rejectReason}>{lead.rejectReason || 'No reason'}</p>
                                                </div>
                                            )}
                                            {/* FITS Assessment & Score Block */}
                                            {hasFits ? (
                                                <div className="mt-2 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                                    <div className="mb-1.5 p-2 bg-blue-50/80 border border-blue-100 rounded-lg text-[10px] space-y-0.5 shadow-2xs">
                                                        <div className="flex items-center justify-between text-blue-700 font-bold text-[10px]">
                                                            <span className="flex items-center gap-0.5"><Zap size={10} className="text-yellow-500 fill-yellow-400" /> FITS Score</span>
                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${fitsResult.badgeClass}`}>{fitsResult.score}% ({fitsResult.label})</span>
                                                        </div>
                                                        <div className="w-full bg-blue-200/60 rounded-full h-1 mt-1 overflow-hidden">
                                                            <div className={`h-full rounded-full ${fitsResult.barColor}`} style={{ width: `${Math.min(100, (fitsResult.score / 70) * 100)}%` }} />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-0.5 text-[10px] text-slate-700 pt-1">
                                                            <div className="truncate">Fam: <strong className="text-slate-900">{lead.fits.familiarity || '-'}</strong></div>
                                                            <div className="truncate">Intent: <strong className="text-slate-900">{lead.fits.intention || '-'}</strong></div>
                                                            <div className="truncate">Time: <strong className="text-slate-900">{lead.fits.time || '-'}</strong></div>
                                                            <div className="truncate">Spend: <strong className="text-slate-900">{lead.fits.spend || '-'}</strong></div>
                                                        </div>
                                                        {lead.fits.intentionReason && (
                                                            <p className="text-[9px] text-slate-500 italic truncate pt-0.5" title={lead.fits.intentionReason}>
                                                                "{lead.fits.intentionReason}"
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => openFitsModal(lead)}
                                                        className="w-full py-1 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-2xs hover:shadow transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                    >
                                                        <Zap size={11} className="text-yellow-300" />
                                                        <span>Update FITS</span>
                                                    </button>
                                                </div>
                                            ) : lead.callStatus === 'Called' ? (
                                                <div className="mt-2 pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openFitsModal(lead)}
                                                        className="w-full py-1 px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-bold rounded-lg shadow-2xs hover:shadow transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                    >
                                                        <Zap size={11} className="text-yellow-300" />
                                                        <span>FITS Assessment</span>
                                                    </button>
                                                </div>
                                            ) : null}

                                            {/* Quick Action Buttons */}
                                            <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-0.5 rounded-lg border border-slate-100 shadow-sm" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => openEditModal(lead)} className="p-1 text-slate-400 hover:text-[#3f3f3f] hover:bg-[#f0f0ee] rounded transition-colors"><Pencil size={12}/></button>
                                                <button onClick={() => openDeleteModal(lead)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                    );
                                };

                                // If not on Leads or Qualified tab, show simple grid view of those leads (Appointment, Convert)
                                if (pipelineTab !== 'Leads' && pipelineTab !== 'Qualified') {
                                    let tabLeads = [];
                                    if (pipelineTab === 'Appointment') tabLeads = displayLeads.filter(l => l.leadStatus === 'Appointment').sort(sortAlertsFirst);
                                    else if (pipelineTab === 'Convert') tabLeads = displayLeads.filter(l => l.leadStatus === 'Converted').sort(sortAlertsFirst);

                                    const totalGridPages = Math.ceil(tabLeads.length / PAGE_SIZE) || 1;
                                    const currentGridPage = Math.min(gridPage, totalGridPages);
                                    const paginatedTabLeads = tabLeads.slice((currentGridPage - 1) * PAGE_SIZE, currentGridPage * PAGE_SIZE);

                                    return (
                                        <div className="w-full animate-fade-up flex flex-col gap-5">
                                            {tabLeads.length === 0 ? (
                                                <div className="flex items-center justify-center h-48 border-2 border-dashed border-[#e6e6e3] rounded-2xl text-slate-400 font-medium">
                                                    No leads in {pipelineTab} stage
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        {paginatedTabLeads.map(lead => renderLeadCard(lead))}
                                                    </div>

                                                    {tabLeads.length > PAGE_SIZE && (
                                                        <div className="flex items-center justify-between bg-white px-6 py-3.5 rounded-2xl border border-[#e6e6e3] shadow-sm mt-2">
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                Showing <strong className="text-slate-800">{(currentGridPage - 1) * PAGE_SIZE + 1}</strong> to <strong className="text-slate-800">{Math.min(currentGridPage * PAGE_SIZE, tabLeads.length)}</strong> of <strong className="text-slate-800">{tabLeads.length}</strong> leads
                                                            </span>
                                                            <div className="flex items-center space-x-2">
                                                                <button 
                                                                    onClick={() => setGridPage(p => Math.max(1, p - 1))}
                                                                    disabled={currentGridPage <= 1}
                                                                    className="px-3.5 py-1.5 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <ChevronLeft size={14} /> Previous
                                                                </button>
                                                                <span className="px-2 text-xs font-bold text-slate-600">
                                                                    Page {currentGridPage} of {totalGridPages}
                                                                </span>
                                                                <button 
                                                                    onClick={() => setGridPage(p => Math.min(totalGridPages, p + 1))}
                                                                    disabled={currentGridPage >= totalGridPages}
                                                                    className="px-3.5 py-1.5 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    Next <ChevronRight size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                }

                                const isQualifiedTab = pipelineTab === 'Qualified';

                                // Kanban stages: customize first column based on active tab ('Qualified' vs 'Lead')
                                const kanbanStages = isQualifiedTab ? [
                                    { status: 'Qualified', label: 'Qualified', dotColor: 'bg-purple-600', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Called', label: 'Called', dotColor: 'bg-blue-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Contacted', label: 'Callback', dotColor: 'bg-amber-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Not Attend', label: 'Not Attend', dotColor: 'bg-orange-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Rejected', label: 'Rejected', dotColor: 'bg-rose-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Waiting List', label: 'Waiting List', dotColor: 'bg-violet-500', bgColor: 'bg-[#f5f5f3]/50' }
                                ] : [
                                    { status: 'New', label: 'Lead', dotColor: 'bg-[#ff6a3d]', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Called', label: 'Called', dotColor: 'bg-blue-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Contacted', label: 'Callback', dotColor: 'bg-amber-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Not Attend', label: 'Not Attend', dotColor: 'bg-orange-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Rejected', label: 'Rejected', dotColor: 'bg-rose-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Waiting List', label: 'Waiting List', dotColor: 'bg-violet-500', bgColor: 'bg-[#f5f5f3]/50' }
                                ];

                                return (
                                    <div className="flex gap-2 sm:gap-2.5 w-full h-full pb-2 animate-fade-up overflow-x-hidden">
                                    {kanbanStages.map((stage, idx) => {
                                    // Custom filtering based on callStatus
                                    const kanbanDisplayLeads = isQualifiedTab
                                        ? displayLeads.filter(l => l.leadStatus === 'Qualified' || (l.rejectedFromStage || '').trim().toLowerCase() === 'qualified')
                                        : displayLeads.filter(l => !['Qualified', 'Appointment', 'Converted'].includes(l.leadStatus) && (l.rejectedFromStage || '').trim().toLowerCase() !== 'qualified');
                                    
                                    const stageLeads = kanbanDisplayLeads.filter(lead => {
                                        const status = (lead.callStatus || '').toLowerCase();
                                        if (status === 'rejected' || lead.leadStatus === 'Lost') return stage.status === 'Rejected';
                                        if (status === 'waiting list') return stage.status === 'Waiting List';
                                        if (status.includes('callback')) return stage.status === 'Contacted';
                                        if (status.includes('not attend')) return stage.status === 'Not Attend';
                                        if (status === 'called') return stage.status === 'Called';
                                        return isQualifiedTab ? stage.status === 'Qualified' : stage.status === 'New';
                                    }).sort(sortAlertsFirst);

                                    const totalColPages = Math.ceil(stageLeads.length / PAGE_SIZE) || 1;
                                    const currentColPage = Math.min(kanbanPages[stage.status] || 1, totalColPages);
                                    const paginatedStageLeads = stageLeads.slice((currentColPage - 1) * PAGE_SIZE, currentColPage * PAGE_SIZE);

                                    return (
                                        <div 
                                            key={idx} 
                                            className={`flex-1 min-w-0 flex flex-col ${stage.bgColor} border border-[#e6e6e3] rounded-2xl overflow-hidden shadow-2xs transition-colors duration-300`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, stage.status)}
                                        >
                                            {/* Stage Header */}
                                            <div className="p-2.5 px-3 border-b border-[#e6e6e3] flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-t-2xl">
                                                <div className="flex items-center space-x-1.5 min-w-0">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${stage.dotColor} shrink-0`}></div>
                                                    <h3 className="font-bold text-slate-800 text-xs sm:text-[13px] truncate">{stage.label}</h3>
                                                </div>
                                                <span className="bg-white border border-[#e6e6e3] text-slate-600 px-2 py-0.2 rounded-full text-[10px] font-bold shrink-0">{stageLeads.length}</span>
                                            </div>
                                            
                                            {/* Stage Content */}
                                            <div className="p-2 min-h-[450px] flex-1 flex flex-col gap-2 overflow-y-auto max-h-[72vh]">
                                                {stageLeads.length === 0 ? (
                                                    <div className="h-20 flex items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-[#e6e6e3] rounded-xl">
                                                        Empty
                                                    </div>
                                                ) : (
                                                    paginatedStageLeads.map((lead) => renderLeadCard(lead))
                                                )}
                                            </div>

                                            {/* Column Pagination (When records > 15) */}
                                            {stageLeads.length > PAGE_SIZE && (
                                                <div className="p-1.5 px-2 bg-white/95 backdrop-blur-sm border-t border-[#e6e6e3] flex items-center justify-between text-[10px] font-semibold text-slate-600 rounded-b-2xl shadow-xs">
                                                    <button 
                                                        onClick={() => setKanbanPages(prev => ({ ...prev, [stage.status]: Math.max(1, currentColPage - 1) }))}
                                                        disabled={currentColPage <= 1}
                                                        className="px-2 py-0.5 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded font-bold text-slate-700 transition-colors flex items-center gap-0.5 cursor-pointer text-[10px]"
                                                    >
                                                        <ChevronLeft size={11} /> Prev
                                                    </button>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {currentColPage}/{totalColPages}
                                                    </span>
                                                    <button 
                                                        onClick={() => setKanbanPages(prev => ({ ...prev, [stage.status]: Math.min(totalColPages, currentColPage + 1) }))}
                                                        disabled={currentColPage >= totalColPages}
                                                        className="px-2 py-0.5 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded font-bold text-slate-700 transition-colors flex items-center gap-0.5 cursor-pointer text-[10px]"
                                                    >
                                                        Next <ChevronRight size={11} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ======== TARGETS TAB ======== */}
            {activeTab === 'targets' && (
                <SalesTargetSettings canManage={['Admin', 'CEO'].includes(user?.role)} />
            )}

            {/* ======== MODALS ======== */}

            {/* View Lead Modal (Advanced with Call Status & Pipeline Move) */}
            {isViewModalOpen && selectedLead && (
                <LeadDetailsModal 
                    key={selectedLead._id}
                    lead={selectedLead}
                    pipelineTab={pipelineTab}
                    draftCallStatus={draftCallStatus}
                    proposalService={selectedService && selectedService !== 'All' ? selectedService : (isRobotriq ? getLeadLevel(selectedLead) : null)}
                    onClose={() => { setIsViewModalOpen(false); setSelectedLead(null); }} 
                    onUpdate={(savedLead) => {
                        const updatedLead = normalizeLeadStage(savedLead);
                        setLeads(current => current.map(l => l._id === updatedLead._id ? updatedLead : l));
                        setSelectedLead(updatedLead);
                    }}
                    onEdit={openEditModal}
                />
            )}

            {/* Delete Confirmation */}
            {isDeleteModalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-up">
                    <div className="bg-white rounded-[1.5rem] shadow-xl w-full max-w-md p-8 text-center border border-slate-100">
                        <div className="bg-red-50 border border-red-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6"><Trash2 size={28} className="text-red-500" /></div>
                        <h3 className="text-xl font-black text-[#111111] mb-2 tracking-tight">Delete Lead?</h3>
                        <p className="text-slate-500 mb-8 font-medium">Are you sure you want to delete <strong className="text-slate-800">{selectedLead.customerName}</strong> ({selectedLead.leadId})? This cannot be undone.</p>
                        <div className="flex justify-center space-x-3">
                            <button onClick={() => { setIsDeleteModalOpen(false); setSelectedLead(null); }} className="px-5 py-2.5 bg-white border border-[#e6e6e3] rounded-full text-slate-600 hover:bg-[#f5f5f3] font-semibold transition-colors active:scale-95 cursor-pointer shadow-sm">Cancel</button>
                            <button onClick={handleDeleteLead} className="px-5 py-2.5 bg-red-600 text-white rounded-full hover:bg-red-700 font-semibold transition-colors active:scale-95 cursor-pointer shadow-sm shadow-red-600/20">Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* FITS Assessment Modal */}
            <FitsModal
                lead={fitsLead}
                isOpen={isFitsModalOpen}
                onClose={() => { setIsFitsModalOpen(false); setFitsLead(null); }}
                onUpdate={(savedLead, qualified) => {
                    const updatedLead = normalizeLeadStage(savedLead);
                    setLeads(current => current.map(l => l._id === updatedLead._id ? updatedLead : l));
                    if (qualified) {
                        setPipelineTab('Qualified');
                    }
                }}
            />
        </Layout>
    );
}
