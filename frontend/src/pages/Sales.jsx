import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, X, Eye, Pencil, Trash2, Phone, Mail, MapPin, Building, Target, ArrowLeft, Megaphone, Globe, Monitor, MessageCircle, Users, PhoneOutgoing, Camera, Link, MoreHorizontal, Bell, Clock, ChevronLeft, ChevronRight, Briefcase, Award, Zap, Cpu } from 'lucide-react';
import LeadDetailsModal from '../components/LeadDetailsModal';
import ProposalConfigTab from '../components/ProposalConfigTab';
import SalesActivityLog from '../components/SalesActivityLog';
import SalesLeadList from '../components/SalesLeadList';
import SalesTargetSettings from '../components/SalesTargetSettings';
import { compactRupees } from '../components/DashboardNumbers';

const LEAD_SOURCES = ['Cold Leads', 'Meta Leads'];
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Appointment', 'Proposal Sent', 'Converted', 'Lost'];
const LEAD_TEMPS = ['Hot', 'Warm', 'Cold'];

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
        gradient: 'from-blue-600 to-indigo-600',
        lightBg: 'bg-[#f0f0ee]',
        textColor: 'text-[#3f3f3f]',
        borderColor: 'border-[#e6e6e3]',
        description: 'Facebook & Instagram lead generation campaigns'
    },
    'Personal Branding': {
        icon: <Users size={24} />,
        gradient: 'from-purple-600 to-pink-600',
        lightBg: 'bg-purple-50',
        textColor: 'text-purple-600',
        borderColor: 'border-purple-200',
        description: 'Executive, founder & creator personal branding inquiries'
    },
    'Web Development': {
        icon: <Globe size={24} />,
        gradient: 'from-emerald-600 to-teal-600',
        lightBg: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
        description: 'Websites, web applications, landing pages & digital redesigns'
    },
    'SEO': {
        icon: <Target size={24} />,
        gradient: 'from-amber-500 to-orange-600',
        lightBg: 'bg-amber-50',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-200',
        description: 'Search engine optimization & organic traffic growth retainers'
    },
    'Full Digital Marketing': {
        icon: <Monitor size={24} />,
        gradient: 'from-rose-500 to-red-600',
        lightBg: 'bg-rose-50',
        textColor: 'text-rose-600',
        borderColor: 'border-rose-200',
        description: 'Full-suite 360° integrated marketing packages'
    },

    // Industrial Automation (Robotriq)
    'DELTA INDUSTRIAL AUTOMATION': {
        icon: <Zap size={24} />,
        gradient: 'from-blue-600 to-indigo-700',
        lightBg: 'bg-[#f0f0ee]',
        textColor: 'text-[#3f3f3f]',
        borderColor: 'border-[#e6e6e3]',
        description: 'Delta PLC, DVP/AS Series, HMI, SCADA & VFD drive systems'
    },
    'SIEMENS INDUSTRIAL AUTOMATION': {
        icon: <Cpu size={24} />,
        gradient: 'from-teal-600 to-emerald-700',
        lightBg: 'bg-teal-50',
        textColor: 'text-teal-600',
        borderColor: 'border-teal-200',
        description: 'Siemens S7-1200/1500, TIA Portal v18 & WinCC automation'
    },
    'ABB PROCESS AUTOMATION': {
        icon: <Target size={24} />,
        gradient: 'from-red-600 to-rose-700',
        lightBg: 'bg-red-50',
        textColor: 'text-red-600',
        borderColor: 'border-red-200',
        description: 'ABB Freelance DCS, 800xA distributed control & robotics'
    },
    'SCHNEIDER ELECTRIC INDUSTRIAL AUTOMATION': {
        icon: <Globe size={24} />,
        gradient: 'from-emerald-600 to-green-700',
        lightBg: 'bg-emerald-50',
        textColor: 'text-emerald-600',
        borderColor: 'border-emerald-200',
        description: 'Schneider Modicon M340/M580, EcoStruxure & Citect SCADA'
    },
    'INDUSTRIAL AUTOMATION 4.0': {
        icon: <Award size={24} />,
        gradient: 'from-purple-600 to-pink-700',
        lightBg: 'bg-purple-50',
        textColor: 'text-purple-600',
        borderColor: 'border-purple-200',
        description: 'Industry 4.0, smart factory, IIoT architecture & telemetry'
    },
    'MITSUBISHI ELECTRIC FACTORY AUTOMATION': {
        icon: <Monitor size={24} />,
        gradient: 'from-amber-500 to-orange-700',
        lightBg: 'bg-amber-50',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-200',
        description: 'Mitsubishi FX5U/Q-series, GX Works3 & GOT2000 HMI'
    },
    'ALLEN BRADLEY - ROCKWELL AUTOMATION': {
        icon: <Briefcase size={24} />,
        gradient: 'from-cyan-600 to-blue-700',
        lightBg: 'bg-cyan-50',
        textColor: 'text-cyan-600',
        borderColor: 'border-cyan-200',
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
        gradient: 'from-blue-600 to-indigo-600',
        lightBg: 'bg-[#f0f0ee]',
        textColor: 'text-[#3f3f3f]',
        borderColor: 'border-[#e6e6e3]',
        description: 'Single automation course specialization (1 Course)'
    },
    'Intermediate': {
        icon: <Cpu size={24} />,
        gradient: 'from-teal-600 to-emerald-600',
        lightBg: 'bg-teal-50',
        textColor: 'text-teal-600',
        borderColor: 'border-teal-200',
        description: 'Dual automation multi-platform package (2 Courses)'
    },
    'Advance': {
        icon: <Zap size={24} />,
        gradient: 'from-amber-500 to-orange-600',
        lightBg: 'bg-amber-50',
        textColor: 'text-amber-600',
        borderColor: 'border-amber-200',
        description: 'Triple automation comprehensive track (3 Courses)'
    },
    'Master': {
        icon: <Briefcase size={24} />,
        gradient: 'from-purple-600 to-pink-600',
        lightBg: 'bg-purple-50',
        textColor: 'text-purple-600',
        borderColor: 'border-purple-200',
        description: 'Quad-system automation engineering track (4 Courses)'
    },
    'Certified Process Automation': {
        icon: <Target size={24} />,
        gradient: 'from-rose-500 to-red-600',
        lightBg: 'bg-rose-50',
        textColor: 'text-rose-600',
        borderColor: 'border-rose-200',
        description: 'Complete process automation master certification (5+ Courses)'
    }
};

const getServiceConfig = (name) => {
    return LEVEL_CONFIG[name] || SERVICE_CONFIG[name] || {
        icon: <Briefcase size={24} />,
        gradient: 'from-slate-700 to-slate-900',
        lightBg: 'bg-[#f5f5f3]',
        textColor: 'text-slate-600',
        borderColor: 'border-[#e6e6e3]',
        description: 'Specialized client inquiries and custom requirements'
    };
};

export default function Sales() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const rawStored = typeof window !== 'undefined' ? (localStorage.getItem('user') || '') : '';
    const isRobotriq = Boolean(
        user?.email?.toLowerCase().includes('robotriq') ||
        user?.companyName?.toLowerCase().includes('robotriq') ||
        user?.name?.toLowerCase().includes('robotriq') ||
        user?.subDomain === 'robotriq' ||
        String(user?.tenantId?._id || user?.tenantId || '').includes('6afd35731172da4b0de9a48e') ||
        rawStored.toLowerCase().includes('robotriq')
    );
    const activeMasterList = useMemo(() => isRobotriq ? ROBOTRIQ_LEVELS : MASTER_SERVICES, [isRobotriq]);

    const [activeTab, setActiveTab] = useState('list');
    const [leads, setLeads] = useState([]);
    const [leadStatus, setLeadStatus] = useState('loading');
    const [selectedSource, setSelectedSource] = useState(null);
    const [selectedService, setSelectedService] = useState(null); // null = Level 2 (Services screen), string = Level 3 (Pipeline screen)
    const [pipelineTab, setPipelineTab] = useState('Leads');
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination (15 records per page)
    const PAGE_SIZE = 15;
    const [gridPage, setGridPage] = useState(1);
    const [kanbanPages, setKanbanPages] = useState({
        'New': 1,
        'Contacted': 1,
        'Not Attend': 1,
        'Rejected': 1
    });

    // Reset pagination when source, service, search, or tab changes
    useEffect(() => {
        setGridPage(1);
        setKanbanPages({
            'New': 1,
            'Contacted': 1,
            'Not Attend': 1,
            'Rejected': 1
        });
    }, [selectedSource, selectedService, searchTerm, pipelineTab]);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);

    // Form
    const emptyForm = {
        customerName: '', companyName: '', mobileNumber: '', email: '',
        location: '', industry: '', leadSource: 'Meta Leads',
        productServiceInterested: '', leadValue: '', leadStatus: 'New',
        leadTemperature: 'Cold', nextFollowUpDate: '', notes: ''
    };
    const [formData, setFormData] = useState({ ...emptyForm });

    useEffect(() => { fetchLeads(); }, []);

    const fetchLeads = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/leads');
            setLeads(Array.isArray(res.data) ? res.data : []);
            setLeadStatus('ready');
        } catch (error) {
            setLeadStatus('error');
            console.error("Error fetching leads:", error);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- CRUD ---
    const handleAddLead = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/leads', formData);
            setIsAddModalOpen(false);
            setFormData({ ...emptyForm });
            fetchLeads();
            setActiveTab('leads');
        } catch (error) { console.error("Error adding lead:", error); }
    };

    const handleEditLead = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`http://localhost:5000/api/leads/${selectedLead._id}`, formData);
            setIsEditModalOpen(false);
            setSelectedLead(null);
            setFormData({ ...emptyForm });
            fetchLeads();
        } catch (error) { console.error("Error editing lead:", error); }
    };

    const handleDeleteLead = async () => {
        try {
            await axios.delete(`http://localhost:5000/api/leads/${selectedLead._id}`);
            setIsDeleteModalOpen(false);
            setSelectedLead(null);
            fetchLeads();
        } catch (error) { console.error("Error deleting lead:", error); }
    };

    const handleQuickStatusChange = async (lead, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/leads/${lead._id}`, { leadStatus: newStatus });
            fetchLeads();
        } catch (error) { console.error("Error updating status:", error); }
    };

    const handleQuickTempChange = async (lead, newTemp) => {
        try {
            await axios.put(`http://localhost:5000/api/leads/${lead._id}`, { leadTemperature: newTemp }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchLeads();
        } catch (error) { console.error("Error updating temperature:", error); }
    };

    const handleDragStart = (e, leadId) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDrop = async (e, targetStage) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        const originalLead = leads.find(l => l._id === leadId);
        if (!originalLead) return;

        let newCallStatus = targetStage;
        if (targetStage === 'New') {
            newCallStatus = 'Lead';
        } else if (targetStage === 'Contacted') {
            newCallStatus = 'Callback (1)';
        } else if (targetStage === 'Not Attend') {
            newCallStatus = 'Not Attend';
        } else if (targetStage === 'Rejected') {
            newCallStatus = 'Rejected';
        }

        // We DO NOT save to the backend yet! 
        // We just open the modal with the pre-filled target status.
        // If they click 'Save' in the modal, it will save. If they click 'Close', nothing happens.
        setSelectedLead({
            ...originalLead,
            callStatus: newCallStatus
        });
        setIsViewModalOpen(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Required to allow dropping
    };

    const openViewModal = (lead) => { setSelectedLead(lead); setIsViewModalOpen(true); };
    const openEditModal = (lead) => {
        setIsViewModalOpen(false); // Close view modal if it was open
        navigate(`/sales/lead/edit/${lead._id}`);
    };
    const openDeleteModal = (lead) => { setSelectedLead(lead); setIsDeleteModalOpen(true); };
    const openAddWithSource = (source, service) => { 
        navigate('/sales/lead/add', {
            state: {
                leadSource: source === 'All' ? 'Meta Leads' : (source || 'Meta Leads'),
                serviceType: service && service !== 'All' ? service : undefined
            }
        }); 
    };

    // --- Filtered Leads & Dynamic Services ---
    const getLeadsBySource = (source) => leads.filter(l => {
        if (source === 'Cold Leads' || source === 'Cold') {
            return l.leadSource === 'Cold Leads' || l.leadSource === 'Cold' || l.leadSource === 'Cold Call';
        }
        if (source === 'Meta Leads' || source === 'Meta') {
            return l.leadSource === 'Meta Leads' || l.leadSource === 'Meta' || l.leadSource === 'Meta Ads';
        }
        return l.leadSource === source;
    });

    // Available services for the currently selected source
    const availableServices = useMemo(() => {
        if (!selectedSource) return [];
        const sourceLeads = selectedSource === 'All' ? leads : getLeadsBySource(selectedSource);
        
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
            const aDate = l.appointmentAlertDate || l.qualifiedAlertDate || l.callbackAlertDate;
            const aTime = l.appointmentAlertTime || l.qualifiedAlertTime || l.callbackAlertTime || '00:00';
            if (aDate && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost') {
                const dt = new Date(`${aDate}T${aTime}`);
                if (dt <= new Date()) map[s].alerts++;
            }
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
    }, [leads, selectedSource, isRobotriq]);

    const totalSourceLeadsCount = useMemo(() => {
        if (!selectedSource) return 0;
        return (selectedSource === 'All' ? leads : getLeadsBySource(selectedSource)).length;
    }, [leads, selectedSource]);

    const filteredSourceLeads = selectedSource
        ? leads.filter(l => {
            const matchesSource = selectedSource === 'All'
                ? true
                : (selectedSource === 'Cold Leads' || selectedSource === 'Cold')
                    ? (l.leadSource === 'Cold Leads' || l.leadSource === 'Cold' || l.leadSource === 'Cold Call')
                    : (selectedSource === 'Meta Leads' || selectedSource === 'Meta')
                        ? (l.leadSource === 'Meta Leads' || l.leadSource === 'Meta' || l.leadSource === 'Meta Ads')
                        : l.leadSource === selectedSource;

            let matchesService = true;
            if (selectedService && selectedService !== 'All') {
                if (isRobotriq) {
                    const leadLevel = getLeadLevel(l);
                    matchesService = leadLevel.toLowerCase() === selectedService.trim().toLowerCase();
                } else {
                    const leadService = (l.serviceType || l.productServiceInterested || 'General').trim().toLowerCase();
                    matchesService = (leadService === selectedService.trim().toLowerCase() || leadService.includes(selectedService.trim().toLowerCase()));
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

            return matchesSource && matchesService && matchesSearch;
        })
        : [];

    // --- KPI ---
    const totalLeads = leads.length;
    const newLeads = leads.filter(l => l.leadStatus === 'New').length;
    const totalValue = leads.reduce((acc, curr) => acc + (curr.leadValue || 0), 0);
    const overdueFollowUps = leads.filter(l => l.nextFollowUpDate && new Date(l.nextFollowUpDate) < new Date() && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost').length;
    const convertedLeads = leads.filter(l => l.leadStatus === 'Converted').length;
    const lostLeads = leads.filter(l => l.leadStatus === 'Lost').length;
    const hotLeads = leads.filter(l => l.leadTemperature === 'Hot').length;
    const warmLeads = leads.filter(l => l.leadTemperature === 'Warm').length;
    const coldLeads = leads.filter(l => l.leadTemperature === 'Cold').length;

    // --- Helpers ---
    const getTempBadge = (temp) => {
        switch (temp) { case 'Hot': return 'bg-red-100 text-red-700'; case 'Warm': return 'bg-yellow-100 text-yellow-700'; default: return 'bg-[#e6e6e3] text-[#111111]'; }
    };
    const getTempIcon = (temp) => {
        switch (temp) { case 'Hot': return '🔥'; case 'Warm': return '🌤️'; default: return '❄️'; }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'New': return 'bg-[#e6e6e3] text-[#111111]'; case 'Contacted': return 'bg-[#e6e6e3] text-[#111111]';
            case 'Qualified': return 'bg-purple-100 text-purple-700'; case 'Proposal Sent': return 'bg-orange-100 text-orange-700';
            case 'Converted': return 'bg-green-100 text-green-700'; case 'Lost': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // --- FORM MODAL ---
    const renderFormModal = (title, isOpen, onClose, onSubmit, formId) => {
        if (!isOpen) return null;
        return (
            <div className="fixed inset-0 bg-[#111111]/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-up">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden">
                    <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-[#f5f5f3]/50">
                        <div>
                            <h2 className="text-2xl font-black text-[#111111] tracking-tight">{title}</h2>
                            <p className="text-slate-500 text-sm mt-1 font-medium">Fill in the details to {title.toLowerCase()}</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors cursor-pointer">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar">
                        <form id={formId} onSubmit={onSubmit} className="space-y-8">
                            
                            {/* Section 1: Contact Info */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                                    <Users size={14} className="mr-2" /> Contact Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Customer Name *</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Users size={18} /></div>
                                            <input required type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} 
                                                className="w-full pl-10 pr-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" placeholder="e.g. John Doe" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Company Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Building size={18} /></div>
                                            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} 
                                                className="w-full pl-10 pr-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" placeholder="e.g. Acme Corp" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Mobile Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Phone size={18} /></div>
                                            <input type="text" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} 
                                                className="w-full pl-10 pr-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" placeholder="e.g. +1 234 567 890" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} 
                                                className="w-full pl-10 pr-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" placeholder="e.g. john@example.com" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Location</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><MapPin size={18} /></div>
                                            <input type="text" name="location" value={formData.location} onChange={handleInputChange} 
                                                className="w-full pl-10 pr-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" placeholder="City, Country" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Industry</label>
                                        <input type="text" name="industry" value={formData.industry} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" placeholder="e.g. Software, Real Estate" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Lead Details */}
                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                                    <Target size={14} className="mr-2" /> Lead specific details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Lead Source</label>
                                        <select name="leadSource" value={formData.leadSource} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800 appearance-none">
                                            {LEAD_SOURCES.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Lead Status</label>
                                        <select name="leadStatus" value={formData.leadStatus} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800 appearance-none">
                                            {LEAD_STATUSES.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Temperature</label>
                                        <select name="leadTemperature" value={formData.leadTemperature} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800 appearance-none">
                                            {LEAD_TEMPS.map(o => <option key={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">Product / Service Interested</label>
                                        <input type="text" name="productServiceInterested" value={formData.productServiceInterested} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" placeholder="What are they looking for?" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Estimated Value ($)</label>
                                        <input type="number" name="leadValue" value={formData.leadValue} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800 font-bold text-green-700" placeholder="0.00" />
                                    </div>
                                    
                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-sm font-bold text-slate-700">Next Follow-up Date</label>
                                        <input type="date" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800" />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-bold text-slate-700">Additional Notes</label>
                                        <textarea name="notes" rows="2" value={formData.notes} onChange={handleInputChange} 
                                            className="w-full px-4 py-3 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl outline-none focus:bg-white focus:border-[#111111] focus:ring-4 focus:ring-[#111111]/10 transition-all font-medium text-slate-800 resize-none" placeholder="Add any background context..."></textarea>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    
                    <div className="p-6 border-t border-slate-100 flex justify-end space-x-3 bg-[#f5f5f3]/50 rounded-b-[2rem]">
                        <button onClick={onClose} className="px-6 py-3 text-slate-600 bg-white border border-[#e6e6e3] rounded-xl hover:bg-[#f5f5f3] font-bold transition-all shadow-sm active:scale-95 cursor-pointer">
                            Cancel
                        </button>
                        <button type="submit" form={formId} className="px-8 py-3 bg-[#111111] text-white rounded-xl hover:bg-[#303030] font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer flex items-center">
                            <Plus size={18} className="mr-2" /> Save Lead
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const openValue = leads.reduce((value, lead) => ['Converted', 'Lost'].includes(lead.leadStatus) ? value : value + (Number(lead.leadValue) || 0), 0);

    return (
        <Layout workspace compactTools>
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
            
            <header className="sales-page-heading">
                <div>
                    <p>Sales &amp; Leads</p>
                    <h1>{activeTab === 'targets' ? 'Sales targets' : leadStatus === 'loading' ? 'Loading leads…' : `${leads.length} ${leads.length === 1 ? 'lead' : 'leads'}`}
                        {activeTab !== 'targets' && leadStatus === 'ready' && <span> · {compactRupees(openValue)} open</span>}
                    </h1>
                </div>
                <div className="sales-page-actions">
                    <nav aria-label="Sales views">
                        {[['dashboard', 'Dashboard'], ['list', 'Leads'], ['targets', 'Targets']].map(([id, label]) => (
                            <button type="button" key={id} aria-current={activeTab === id || (id === 'list' && activeTab === 'leads') ? 'page' : undefined}
                                onClick={() => { setActiveTab(id); setSelectedSource(null); setSelectedService(null); }}>{label}</button>
                        ))}
                    </nav>
                    <button type="button" onClick={() => navigate('/sales/lead/add')}><Plus size={15} /> Add lead</button>
                </div>
            </header>

            {activeTab === 'list' && <SalesLeadList leads={leads} loading={leadStatus === 'loading'} failed={leadStatus === 'error'}
                onView={openViewModal} onBrowseSources={() => setActiveTab('leads')} />}

            {/* ======== DASHBOARD TAB ======== */}
            {activeTab === 'dashboard' && (
                <div>
                    {/* ======== DAILY CLIENT ACTIONS & STATUS LOG (WITH 2 DATE FILTERS & PAGINATION) ======== */}
                    <SalesActivityLog 
                        leads={leads} 
                        onViewLead={(lead) => { 
                            setSelectedLead(lead); 
                            setIsViewModalOpen(true); 
                        }} 
                    />
                </div>
            )}

            {/* ======== LEAD MANAGEMENT TAB ======== */}
            {activeTab === 'leads' && !selectedSource && (
                <div className="animate-fade-up delay-100">
                    {/* Add New Lead Button */}
                    <div className="mb-6">
                        <button onClick={() => navigate('/sales/lead/add')} className="flex items-center bg-[#111111] text-white px-5 py-3 rounded-xl hover:bg-[#303030] transition-all shadow-sm hover:shadow-md cursor-pointer hover:scale-105">
                            <Plus size={20} className="mr-2" /> Add New Lead
                        </button>
                    </div>

                    {/* Lead Sources Grid */}
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Lead Sources</h3>
                    <p className="text-gray-500 text-sm mb-6">Click on a source to view and manage leads from that channel.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* All Leads Card */}
                        {(() => {
                            let totalAlerts = 0;
                            const now = new Date();
                            leads.forEach(l => {
                                if (l.callbackAlertDate && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost') {
                                    const dt = new Date(`${l.callbackAlertDate}T${l.callbackAlertTime || '00:00'}`);
                                    if (dt <= now) totalAlerts++;
                                }
                            });
                            
                            return (
                                <button onClick={() => { setSelectedSource('All'); setSelectedService(null); }} className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100 transition-colors duration-500 group">
                                    <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 text-left group-hover:scale-[1.02]">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="bg-[#f0f0ee] text-slate-600 p-3 rounded-xl group-hover:bg-[#e6e6e3] group-hover:text-[#3f3f3f] transition-colors relative">
                                                <Users size={24} className="group-hover:scale-110 transition-transform" />
                                                {totalAlerts > 0 && (
                                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-pulse shadow-sm flex items-center">
                                                        <Bell size={8} className="mr-1" /> {totalAlerts}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-3xl font-bold text-slate-800">{totalLeads}</span>
                                        </div>
                                        <h4 className="font-semibold text-slate-800 text-lg">All Leads</h4>
                                        <p className="text-slate-500 text-sm mt-1">View all leads from every source</p>
                                    </div>
                                </button>
                            );
                        })()}

                        {/* Individual Source Cards */}
                        {LEAD_SOURCES.map(source => {
                            const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG['Meta Leads'];
                            const sourceLeads = getLeadsBySource(source);
                            const count = sourceLeads.length;
                            
                            let sourceAlerts = 0;
                            const now = new Date();
                            sourceLeads.forEach(l => {
                                if (l.callbackAlertDate && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost') {
                                    const dt = new Date(`${l.callbackAlertDate}T${l.callbackAlertTime || '00:00'}`);
                                    if (dt <= now) sourceAlerts++;
                                }
                            });

                            return (
                                <button key={source} onClick={() => { setSelectedSource(source); setSelectedService(null); }} className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100 transition-colors duration-500 group">
                                    <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 text-left group-hover:scale-[1.02] flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`${cfg.lightBg} ${cfg.textColor} p-3 rounded-xl transition-colors relative`}>
                                                    <div className="group-hover:scale-110 transition-transform group-hover:rotate-12">{cfg.icon}</div>
                                                    {sourceAlerts > 0 && (
                                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-pulse shadow-sm flex items-center">
                                                            <Bell size={8} className="mr-1" /> {sourceAlerts}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-3xl font-bold text-slate-800">{count}</span>
                                            </div>
                                            <h4 className="font-semibold text-slate-800 text-lg">{source}</h4>
                                            <p className="text-slate-500 text-sm mt-1">{count} lead{count !== 1 ? 's' : ''} from {source}</p>
                                        </div>

                                        {/* Services Breakdown Preview */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                                            {(() => {
                                                const sMap = {};
                                                sourceLeads.forEach(l => {
                                                    if (isRobotriq) {
                                                        const lvl = getLeadLevel(l);
                                                        sMap[lvl] = (sMap[lvl] || 0) + 1;
                                                    } else {
                                                        const raw = (l.serviceType || l.productServiceInterested || '').trim();
                                                        const matched = activeMasterList.find(m => m.toLowerCase() === raw.toLowerCase());
                                                        const s = matched || raw || activeMasterList[0];
                                                        sMap[s] = (sMap[s] || 0) + 1;
                                                    }
                                                });
                                                // Show services with counts first, max 4 items
                                                const displayList = [
                                                    ...activeMasterList.filter(s => (sMap[s] || 0) > 0),
                                                    ...activeMasterList.filter(s => (sMap[s] || 0) === 0)
                                                ].slice(0, 4);

                                                return displayList.map(sName => {
                                                    const cnt = sMap[sName] || 0;
                                                    return (
                                                        <span key={sName} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                                            cnt > 0 ? (isRobotriq ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-[#f0f0ee] text-slate-800') : 'bg-[#f5f5f3] text-slate-400 border border-[#e6e6e3]/50'
                                                        }`}>
                                                            {sName}: {cnt}
                                                        </span>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ======== LEVEL 2: SERVICES SELECTION GRID ======== */}
            {activeTab === 'leads' && selectedSource && !selectedService && (
                <div className="animate-fade-up delay-100">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center space-x-3.5">
                            <button 
                                onClick={() => { setSelectedSource(null); setSelectedService(null); setSearchTerm(''); }} 
                                className="p-2.5 border border-[#e6e6e3] rounded-xl bg-white hover:bg-[#f5f5f3] cursor-pointer transition-colors shadow-xs"
                                title="Back to All Lead Sources"
                            >
                                <ArrowLeft size={18} className="text-slate-700" />
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

                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => setSelectedService('All')}
                                className="px-4 py-2.5 bg-white border border-[#e6e6e3] hover:border-[#111111] text-slate-700 hover:text-[#3f3f3f] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <Users size={15} />
                                <span>View All {selectedSource} Leads ({totalSourceLeadsCount})</span>
                            </button>
                            <button 
                                onClick={() => openAddWithSource(selectedSource === 'All' ? 'Meta Leads' : selectedSource)} 
                                className="flex items-center bg-[#111111] text-white px-4 py-2.5 rounded-xl hover:bg-[#303030] transition-all shadow-md text-xs font-bold cursor-pointer active:scale-95"
                            >
                                <Plus size={16} className="mr-1" /> Add Lead
                            </button>
                        </div>
                    </div>

                    {/* Services Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {availableServices.map((service) => {
                            const cfg = getServiceConfig(service.name);

                            return (
                                <div
                                    key={service.name}
                                    onClick={() => setSelectedService(service.name)}
                                    className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100 transition-all duration-300 group cursor-pointer hover:border-[#e6e6e3] hover:shadow-xl hover:-translate-y-1"
                                >
                                    <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] text-left flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`${cfg.lightBg} ${cfg.textColor} p-3.5 rounded-2xl transition-all group-hover:scale-110 group-hover:rotate-6 relative shadow-xs`}>
                                                    {cfg.icon}
                                                    {service.alerts > 0 && (
                                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white animate-pulse shadow-sm flex items-center">
                                                            <Bell size={8} className="mr-1" /> {service.alerts}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-3xl font-black text-[#111111] group-hover:text-[#3f3f3f] transition-colors">
                                                        {service.count}
                                                    </span>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads</p>
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
                                                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
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

            {/* ======== LEVEL 3: LEADS KANBAN BOARD (after clicking a service) ======== */}
            {activeTab === 'leads' && selectedSource && selectedService && (
                <div className="h-full flex flex-col animate-fade-up delay-100">
                    {/* Header */}
                    <div className="flex items-center space-x-4 mb-5">
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
                                <span className="hover:underline cursor-pointer" onClick={() => { setSelectedSource(null); setSelectedService(null); }}>Lead Management</span>
                                {' > '}
                                <span className="hover:underline cursor-pointer" onClick={() => setSelectedService(null)}>{selectedSource}</span>
                                {' > '}
                                <span className="text-slate-700 font-bold">{selectedService}</span>
                            </p>
                        </div>
                        <div className="ml-auto flex items-center space-x-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
                                <input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-64 pl-9 pr-4 py-2 bg-white border border-[#e6e6e3] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all hover:border-slate-300" />
                            </div>
                            <button onClick={() => openAddWithSource(selectedSource === 'All' ? 'Meta Leads' : selectedSource, selectedService)} className="flex items-center bg-[#111111] text-white px-4 py-2 rounded-full hover:bg-[#303030] transition-all shadow-md hover:shadow-lg text-sm font-semibold cursor-pointer active:scale-95">
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
                                        const aDate = l.appointmentAlertDate || l.qualifiedAlertDate || l.callbackAlertDate;
                                        const aTime = l.appointmentAlertTime || l.qualifiedAlertTime || l.callbackAlertTime || '00:00';
                                        if (aDate && l.leadStatus !== 'Converted' && l.leadStatus !== 'Lost') {
                                            const dt = new Date(`${aDate}T${aTime}`);
                                            if (dt <= now) alerts++;
                                        }
                                    });
                                    return alerts;
                                };

                                if (tabName === 'Leads') {
                                    const leadsInTab = displayLeads.filter(l => !['Qualified', 'Appointment', 'Converted'].includes(l.leadStatus));
                                    tabCount = leadsInTab.length;
                                    tabAlerts = getAlertCount(leadsInTab);
                                } else if (tabName === 'Qualified') {
                                    const leadsInTab = displayLeads.filter(l => l.leadStatus === 'Qualified');
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
                                    return <div className="animate-fade-up w-full"><ProposalConfigTab sourceName={selectedSource} /></div>;
                                }

                                const sortAlertsFirst = (a, b) => {
                                    const getAlertPriority = (l) => {
                                        const aDate = l.appointmentAlertDate || l.qualifiedAlertDate || l.callbackAlertDate;
                                        const aTime = l.appointmentAlertTime || l.qualifiedAlertTime || l.callbackAlertTime || '00:00';
                                        if (!aDate) return 3;
                                        const dt = new Date(`${aDate}T${aTime}`);
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
                                    const aDate = lead.appointmentAlertDate || lead.qualifiedAlertDate || lead.callbackAlertDate;
                                    const aTime = lead.appointmentAlertTime || lead.qualifiedAlertTime || lead.callbackAlertTime || '00:00';
                                    if (!aDate) return null;
                                    if (lead.leadStatus === 'Converted' || lead.leadStatus === 'Lost') return null; // No alerts for terminal stages
                                    const dt = new Date(`${aDate}T${aTime}`);
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
                                    const baseClass = "p-5 bg-white rounded-[1.5rem] border border-slate-100 shadow-[0_2px_15px_-8px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-300 group relative cursor-pointer";
                                    let borderClass = "";
                                    
                                    if (alert?.status === 'overdue') borderClass = "bg-red-50 border-red-200 border-l-[6px] border-l-red-500 hover:shadow-lg";

                                    return (
                                        <div 
                                            key={lead._id} 
                                            className={`${baseClass} ${borderClass}`} 
                                            onClick={() => openViewModal(lead)}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead._id)}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-[#111111] text-[15px] leading-tight group-hover:text-[#3f3f3f] transition-colors">{lead.customerName}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getTempBadge(lead.leadTemperature)}`}>{getTempIcon(lead.leadTemperature)} {lead.leadTemperature}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                {(lead.companyName || lead.industry) && <p className="text-xs text-slate-500 flex items-center font-medium"><Building size={12} className="mr-1 text-slate-400"/>{lead.companyName || lead.industry}</p>}
                                                {lead.location && <span className="text-[11px] text-slate-500 font-semibold flex items-center bg-[#f0f0ee] px-2 py-0.5 rounded-md"><MapPin size={11} className="mr-1 text-slate-400" />{lead.location}</span>}
                                            </div>
                                            
                                            {/* Level & Service Tags */}
                                            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                                                {isRobotriq && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200">
                                                        <Award size={10} className="mr-1 text-teal-600" />
                                                        {getLeadLevel(lead)}
                                                    </span>
                                                )}
                                                {(lead.serviceType || lead.productServiceInterested) && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#f0f0ee] text-[#111111] border border-[#ededea]">
                                                        <Briefcase size={10} className="mr-1 text-blue-500" />
                                                        {lead.serviceType || lead.productServiceInterested}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {alert && (
                                                <div className={`mt-2 mb-3 flex items-center text-[10px] font-bold px-2 py-1 rounded-md w-max ${
                                                    alert.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-[#f0f0ee] text-slate-500'
                                                }`}>
                                                    {alert.status === 'overdue' ? <Bell size={10} className="mr-1.5 animate-pulse" /> : <Clock size={10} className="mr-1.5" />}
                                                    {alert.text}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                                <p className="text-xs text-slate-600 flex items-center font-medium"><Phone size={12} className="mr-1.5 text-slate-400"/>{lead.mobileNumber || '-'}</p>
                                                <p className="text-xs font-black text-[#111111] bg-[#f5f5f3] px-2 py-1 rounded-md border border-slate-100 group-hover:bg-[#f0f0ee] group-hover:text-[#111111] transition-colors">₹{(lead.leadValue || 0).toLocaleString()}</p>
                                            </div>

                                            {lead.callStatus === 'Rejected' && (
                                                <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                                                    <p className="text-[10px] text-red-600 font-bold mb-0.5">Rejected from {lead.rejectedFromStage || 'Unknown'}</p>
                                                    <p className="text-[10px] text-red-800 line-clamp-2" title={lead.rejectReason}>{lead.rejectReason || 'No reason'}</p>
                                                </div>
                                            )}

                                            {/* Quick Action Buttons */}
                                            <div className="absolute top-3 right-3 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-100 shadow-sm" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => openEditModal(lead)} className="p-1.5 text-slate-400 hover:text-[#3f3f3f] hover:bg-[#f0f0ee] rounded-md transition-colors"><Pencil size={14}/></button>
                                                <button onClick={() => openDeleteModal(lead)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    );
                                };

                                // If not on Leads tab, show simple grid view of those leads
                                if (pipelineTab !== 'Leads') {
                                    let tabLeads = [];
                                    if (pipelineTab === 'Qualified') tabLeads = displayLeads.filter(l => l.leadStatus === 'Qualified').sort(sortAlertsFirst);
                                    else if (pipelineTab === 'Appointment') tabLeads = displayLeads.filter(l => l.leadStatus === 'Appointment').sort(sortAlertsFirst);
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

                                // If on 'Leads' Tab, show exactly the 4 requested Kanban columns
                                const kanbanStages = [
                                    { status: 'New', label: 'Lead', dotColor: 'bg-[#ff6a3d]', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Contacted', label: 'Callback', dotColor: 'bg-amber-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Not Attend', label: 'Not Attend', dotColor: 'bg-orange-500', bgColor: 'bg-[#f5f5f3]/50' },
                                    { status: 'Rejected', label: 'Rejected', dotColor: 'bg-rose-500', bgColor: 'bg-[#f5f5f3]/50' }
                                ];

                                return (
                                    <div className="flex space-x-5 w-full h-full animate-fade-up">
                                    {kanbanStages.map((stage, idx) => {
                                    // Custom filtering to match the 4 requested columns based on callStatus!
                                    // ONLY include leads that are actually in the "Leads" tab (not Qualified/Appointment/Converted)
                                    const kanbanDisplayLeads = displayLeads.filter(l => !['Qualified', 'Appointment', 'Converted'].includes(l.leadStatus));
                                    
                                    let stageLeads = [];
                                    if (stage.status === 'New') {
                                        stageLeads = kanbanDisplayLeads.filter(l => !l.callStatus || l.callStatus === 'Lead' || l.callStatus === 'Pending' || (l.callStatus.includes('Attend') && !l.callStatus.toLowerCase().includes('not attend')));
                                    } else if (stage.status === 'Contacted') {
                                        stageLeads = kanbanDisplayLeads.filter(l => l.callStatus && l.callStatus.toLowerCase().includes('callback'));
                                    } else if (stage.status === 'Not Attend') {
                                        stageLeads = kanbanDisplayLeads.filter(l => l.callStatus && l.callStatus.toLowerCase().includes('not attend'));
                                    } else if (stage.status === 'Rejected') {
                                        stageLeads = kanbanDisplayLeads.filter(l => l.callStatus === 'Rejected');
                                    }
                                    
                                    stageLeads = stageLeads.sort(sortAlertsFirst);

                                    const totalColPages = Math.ceil(stageLeads.length / PAGE_SIZE) || 1;
                                    const currentColPage = Math.min(kanbanPages[stage.status] || 1, totalColPages);
                                    const paginatedStageLeads = stageLeads.slice((currentColPage - 1) * PAGE_SIZE, currentColPage * PAGE_SIZE);

                                    return (
                                        <div 
                                            key={idx} 
                                            className={`flex-1 min-w-0 flex flex-col ${stage.bgColor} border border-[#e6e6e3] rounded-[1.5rem] overflow-hidden shadow-sm transition-colors duration-300`}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, stage.status)}
                                        >
                                            {/* Stage Header */}
                                            <div className="p-4 border-b border-[#e6e6e3] flex justify-between items-center bg-white/80 backdrop-blur-sm rounded-t-[1.5rem]">
                                                <div className="flex items-center space-x-2.5">
                                                    <div className={`w-3 h-3 rounded-full ${stage.dotColor} shadow-inner`}></div>
                                                    <h3 className="font-bold text-slate-800 text-[15px]">{stage.label}</h3>
                                                </div>
                                                <span className="bg-white border border-[#e6e6e3] text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">{stageLeads.length}</span>
                                            </div>
                                            
                                            {/* Stage Content */}
                                            <div className="p-3 min-h-[500px] flex-1 flex flex-col gap-3 overflow-y-auto max-h-[65vh]">
                                                {stageLeads.length === 0 ? (
                                                    <div className="h-24 flex items-center justify-center text-slate-400 text-sm font-medium border-2 border-dashed border-[#e6e6e3] rounded-xl">
                                                        Empty
                                                    </div>
                                                ) : (
                                                    paginatedStageLeads.map((lead) => renderLeadCard(lead))
                                                )}
                                            </div>

                                            {/* Column Pagination (When records > 15) */}
                                            {stageLeads.length > PAGE_SIZE && (
                                                <div className="p-2.5 px-3 bg-white/95 backdrop-blur-sm border-t border-[#e6e6e3] flex items-center justify-between text-xs font-semibold text-slate-600 rounded-b-[1.5rem] shadow-xs">
                                                    <button 
                                                        onClick={() => setKanbanPages(prev => ({ ...prev, [stage.status]: Math.max(1, currentColPage - 1) }))}
                                                        disabled={currentColPage <= 1}
                                                        className="px-2.5 py-1 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg font-bold text-slate-700 transition-colors flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        <ChevronLeft size={13} /> Prev
                                                    </button>
                                                    <span className="text-[11px] font-bold text-slate-500">
                                                        {currentColPage} / {totalColPages}
                                                    </span>
                                                    <button 
                                                        onClick={() => setKanbanPages(prev => ({ ...prev, [stage.status]: Math.min(totalColPages, currentColPage + 1) }))}
                                                        disabled={currentColPage >= totalColPages}
                                                        className="px-2.5 py-1 bg-[#f0f0ee] hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg font-bold text-slate-700 transition-colors flex items-center gap-0.5 cursor-pointer"
                                                    >
                                                        Next <ChevronRight size={13} />
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
            )}

            {/* ======== TARGETS TAB ======== */}
            {activeTab === 'targets' && (
                <SalesTargetSettings canManage={['Admin', 'CEO'].includes(user?.role)} />
            )}

            {/* ======== MODALS ======== */}

            {/* View Lead Modal (Advanced with Call Status & Pipeline Move) */}
            {isViewModalOpen && selectedLead && (
                <LeadDetailsModal 
                    lead={selectedLead} 
                    onClose={() => { setIsViewModalOpen(false); setSelectedLead(null); }} 
                    onUpdate={(updatedLead) => {
                        setLeads(leads.map(l => l._id === updatedLead._id ? updatedLead : l));
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
        </Layout>
    );
}
