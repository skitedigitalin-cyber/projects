import React, { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, Filter, Search, Phone, MessageCircle, Eye, 
    Clock, CheckCircle, AlertTriangle, ArrowRight, X, ChevronLeft, ChevronRight,
    Users, PhoneCall, CalendarCheck, UserCheck, UserX, PlusCircle, Sparkles
} from 'lucide-react';

export default function SalesActivityLog({ leads = [], onViewLead }) {
    // Date filter state - default to All Time so all historical actions are immediately visible
    const [dateFilter, setDateFilter] = useState({
        from: '',
        to: ''
    });

    // Sub-filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'callback' | 'appointment' | 'qualified' | 'new' | 'lost'

    // Pagination (15 records per page)
    const PAGE_SIZE = 15;
    const [currentPage, setCurrentPage] = useState(1);

    // Quick Date Preset Handlers
    const setQuickPreset = (type) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (type === 'TODAY') {
            setDateFilter({ from: todayStr, to: todayStr });
        } else if (type === 'YESTERDAY') {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const yestStr = yest.toISOString().split('T')[0];
            setDateFilter({ from: yestStr, to: yestStr });
        } else if (type === 'THIS_WEEK') {
            const firstDay = new Date(now);
            const dayOfWeek = now.getDay() || 7; // Sunday = 7
            firstDay.setDate(now.getDate() - dayOfWeek + 1);
            setDateFilter({
                from: firstDay.toISOString().split('T')[0],
                to: todayStr
            });
        } else if (type === 'THIS_MONTH') {
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            setDateFilter({ from: firstOfMonth, to: todayStr });
        } else if (type === 'ALL') {
            setDateFilter({ from: '', to: '' });
        }
    };

    // Extract all client action events from leads list
    const allActions = useMemo(() => {
        const actions = [];
        const hasFilter = Boolean(dateFilter.from && dateFilter.to);
        const fromTime = hasFilter ? new Date(`${dateFilter.from}T00:00:00`).getTime() : 0;
        const toTime = hasFilter ? new Date(`${dateFilter.to}T23:59:59.999`).getTime() : Infinity;

        const isWithinRange = (dateInput) => {
            if (!dateInput) return false;
            if (!hasFilter) return true;
            const t = new Date(dateInput).getTime();
            if (isNaN(t)) {
                const strTime = new Date(`${dateInput}T00:00:00`).getTime();
                return !isNaN(strTime) && strTime >= fromTime && strTime <= toTime;
            }
            return t >= fromTime && t <= toTime;
        };

        leads.forEach(lead => {
            const leadActionsForLead = [];

            // 1. Check callHistory array
            if (Array.isArray(lead.callHistory) && lead.callHistory.length > 0) {
                lead.callHistory.forEach((ch, idx) => {
                    if (isWithinRange(ch.date)) {
                        leadActionsForLead.push({
                            id: `${lead._id}-ch-${idx}`,
                            lead,
                            clientName: lead.customerName,
                            companyName: lead.companyName || '',
                            leadId: lead.leadId,
                            mobileNumber: lead.mobileNumber || '',
                            leadSource: lead.leadSource || 'Other',
                            leadStatus: lead.leadStatus || 'Contacted',
                            callStatus: ch.status || lead.callStatus || 'Call Logged',
                            actionType: ch.status || 'Call Logged',
                            date: ch.date,
                            notes: ch.notes || lead.callback1Description || lead.rejectReason || lead.notes || '',
                            category: ch.status?.includes('Callback') ? 'callback' : 
                                      (ch.status === 'Rejected' ? 'lost' : 
                                      (ch.status === 'Converted' ? 'converted' : 'call'))
                        });
                    }
                });
            }

            const isLeadLost = lead.leadStatus === 'Lost' || lead.callStatus === 'Rejected';
            const isLeadConverted = lead.leadStatus === 'Converted' || lead.callStatus === 'Converted';

            // 2. Check scheduled callbackAlertDate
            if (lead.callbackAlertDate && isWithinRange(lead.callbackAlertDate)) {
                const numMatch = (lead.callStatus || '').match(/\d+/);
                const descKey = numMatch ? `callback${numMatch[0]}Description` : 'callback1Description';
                const desc = lead[descKey] || lead.callback1Description || lead.notes || '';
                leadActionsForLead.push({
                    id: `${lead._id}-callback`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || (isLeadLost ? 'Lost' : 'Contacted'),
                    callStatus: lead.callStatus || (isLeadLost ? 'Rejected' : 'Callback'),
                    actionType: isLeadLost
                        ? (lead.rejectedFromStage ? `Rejected (${lead.rejectedFromStage})` : 'Rejected')
                        : `Follow-up Due: ${lead.callStatus || 'Callback'}`,
                    date: `${lead.callbackAlertDate}T${lead.callbackAlertTime || '10:00'}`,
                    notes: isLeadLost
                        ? (lead.rejectReason ? `Rejected: ${lead.rejectReason}${desc ? ` · ${desc}` : ''}` : desc)
                        : desc,
                    category: isLeadLost ? 'lost' : (isLeadConverted ? 'converted' : 'callback')
                });
            }

            // 3. Check appointmentAlertDate
            if (lead.appointmentAlertDate && isWithinRange(lead.appointmentAlertDate)) {
                leadActionsForLead.push({
                    id: `${lead._id}-appointment`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || (isLeadLost ? 'Lost' : 'Appointment'),
                    callStatus: lead.callStatus || (isLeadLost ? 'Rejected' : 'Appointment'),
                    actionType: isLeadLost
                        ? (lead.rejectedFromStage ? `Rejected (${lead.rejectedFromStage})` : 'Rejected')
                        : 'Appointment Scheduled',
                    date: `${lead.appointmentAlertDate}T${lead.appointmentAlertTime || '10:00'}`,
                    notes: isLeadLost
                        ? (lead.rejectReason ? `Rejected: ${lead.rejectReason}${lead.appointmentDetails ? ` · Details: ${lead.appointmentDetails}` : ''}` : (lead.appointmentNotes || lead.appointmentDetails || ''))
                        : (lead.appointmentNotes || lead.appointmentDetails || ''),
                    category: isLeadLost ? 'lost' : (isLeadConverted ? 'converted' : 'appointment')
                });
            }

            // 4. Check qualifiedAlertDate
            if (lead.qualifiedAlertDate && isWithinRange(lead.qualifiedAlertDate)) {
                leadActionsForLead.push({
                    id: `${lead._id}-qualified`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || (isLeadLost ? 'Lost' : 'Qualified'),
                    callStatus: lead.callStatus || (isLeadLost ? 'Rejected' : 'Qualified'),
                    actionType: isLeadLost
                        ? (lead.rejectedFromStage ? `Rejected (${lead.rejectedFromStage})` : 'Rejected')
                        : 'Lead Qualified Alert',
                    date: `${lead.qualifiedAlertDate}T${lead.qualifiedAlertTime || '10:00'}`,
                    notes: isLeadLost
                        ? (lead.rejectReason ? `Rejected: ${lead.rejectReason}${lead.qualifiedDetails ? ` · Details: ${lead.qualifiedDetails}` : ''}` : (lead.qualifiedDetails || lead.qualifiedNotes || ''))
                        : (lead.qualifiedNotes || lead.qualifiedDetails || ''),
                    category: isLeadLost ? 'lost' : (isLeadConverted ? 'converted' : 'qualified')
                });
            }

            // 5. Check Inbound / Creation Date
            const creationDate = lead.date || (lead.createdAt ? new Date(lead.createdAt).toISOString().slice(0, 10) : '');
            if (creationDate && isWithinRange(creationDate)) {
                leadActionsForLead.push({
                    id: `${lead._id}-creation`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus || 'New',
                    callStatus: lead.callStatus || 'Lead',
                    actionType: `New Lead Inbound (${lead.leadSource || 'Direct'})`,
                    date: lead.createdAt || creationDate,
                    notes: lead.productServiceInterested ? `Interested in: ${lead.productServiceInterested}` : (lead.notes || ''),
                    category: 'new'
                });
            }

            // 6. Check status update via updatedAt if not captured yet
            if (leadActionsForLead.length === 0 && lead.updatedAt && isWithinRange(lead.updatedAt) && lead.callStatus && lead.callStatus !== 'Lead') {
                leadActionsForLead.push({
                    id: `${lead._id}-updated`,
                    lead,
                    clientName: lead.customerName,
                    companyName: lead.companyName || '',
                    leadId: lead.leadId,
                    mobileNumber: lead.mobileNumber || '',
                    leadSource: lead.leadSource || 'Other',
                    leadStatus: lead.leadStatus,
                    callStatus: lead.callStatus,
                    actionType: `Status Updated to ${lead.callStatus}`,
                    date: lead.updatedAt,
                    notes: lead.rejectReason || lead.notes || '',
                    category: lead.leadStatus === 'Lost' ? 'lost' : 'call'
                });
            }

            // Deduplicate actions for same lead having identical actionType & date
            const uniqueForLead = [];
            const seenKeys = new Set();
            leadActionsForLead.forEach(item => {
                const dateKey = String(item.date).slice(0, 10);
                const key = `${item.leadId}_${item.actionType.slice(0, 15)}_${dateKey}`;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    uniqueForLead.push(item);
                }
            });

            actions.push(...uniqueForLead);
        });

        // Sort newest action first
        return actions.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }, [leads, dateFilter.from, dateFilter.to]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [dateFilter.from, dateFilter.to, searchTerm, categoryFilter]);

    // Filter actions by search and category
    const filteredActions = useMemo(() => {
        return allActions.filter(act => {
            const matchesSearch = !searchTerm || 
                act.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.leadId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.mobileNumber?.includes(searchTerm) ||
                act.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.actionType?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (categoryFilter === 'callback') return act.category === 'callback';
            if (categoryFilter === 'appointment') return act.category === 'appointment';
            if (categoryFilter === 'qualified') return act.category === 'qualified';
            if (categoryFilter === 'new') return act.category === 'new';
            if (categoryFilter === 'lost') return act.category === 'lost';

            return true;
        });
    }, [allActions, searchTerm, categoryFilter]);

    // Pagination calculations (15 records per page)
    const totalPages = Math.ceil(filteredActions.length / PAGE_SIZE) || 1;
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const paginatedActions = filteredActions.slice((validPage - 1) * PAGE_SIZE, validPage * PAGE_SIZE);

    // Metrics for the selected date range
    const metrics = useMemo(() => {
        const total = allActions.length;
        const callbacks = allActions.filter(a => a.category === 'callback').length;
        const appointments = allActions.filter(a => a.category === 'appointment').length;
        const qualified = allActions.filter(a => a.category === 'qualified').length;
        const newInbound = allActions.filter(a => a.category === 'new').length;
        const lost = allActions.filter(a => a.category === 'lost').length;
        return { total, callbacks, appointments, qualified, newInbound, lost };
    }, [allActions]);

    // Helper: Lead Status Badge Class
    const getLeadStatusBadge = (status) => {
        switch (status) {
            case 'New':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Contacted':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'Qualified':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Appointment':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Proposal Sent':
                return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            case 'Converted':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Lost':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Helper: Call Status / Action Badge Class
    const getCallStatusBadge = (callStatus, actionType) => {
        if (callStatus === 'Rejected' || (actionType && actionType.includes('Rejected'))) {
            return 'bg-rose-100 text-rose-800 font-bold';
        }
        if (callStatus?.includes('Callback') || (actionType && actionType.includes('Callback'))) {
            return 'bg-amber-100 text-amber-800 font-bold';
        }
        if (callStatus === 'Appointment' || (actionType && actionType.includes('Appointment'))) {
            return 'bg-purple-100 text-purple-800 font-bold';
        }
        if (callStatus === 'Qualified' || (actionType && actionType.includes('Qualified'))) {
            return 'bg-emerald-100 text-emerald-800 font-bold';
        }
        if (actionType && actionType.includes('New Lead')) {
            return 'bg-sky-100 text-sky-800 font-bold';
        }
        return 'bg-slate-100 text-slate-700 font-semibold';
    };

    return (
        <div className="space-y-6 pt-2">
            
            {/* 1. SECTION HEADER & 2 DATE FILTERS */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#FF4500] to-orange-400 text-white shadow-sm shadow-orange-500/20">
                            <Clock size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                Daily Client Actions & Status Log
                                {dateFilter.from && dateFilter.to && (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-[#FF4500] border border-orange-200 font-mono">
                                        {dateFilter.from === dateFilter.to ? dateFilter.from : `${dateFilter.from} → ${dateFilter.to}`}
                                    </span>
                                )}
                            </h2>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Select dates to see which clients were contacted, actions taken, notes, and current statuses
                            </p>
                        </div>
                    </div>

                    {/* Quick Date Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold self-start sm:self-auto">
                        <button 
                            type="button"
                            onClick={() => setQuickPreset('TODAY')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            Today
                        </button>
                        <button 
                            type="button"
                            onClick={() => setQuickPreset('YESTERDAY')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            Yesterday
                        </button>
                        <button 
                            type="button"
                            onClick={() => setQuickPreset('THIS_WEEK')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            This Week
                        </button>
                        <button 
                            type="button"
                            onClick={() => setQuickPreset('THIS_MONTH')}
                            className="px-3 py-1.5 rounded-xl hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            This Month
                        </button>
                        <button 
                            type="button"
                            onClick={() => setQuickPreset('ALL')}
                            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                !dateFilter.from && !dateFilter.to ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            All Time
                        </button>
                    </div>
                </div>

                {/* Date Inputs Bar */}
                <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                            <Calendar size={14} className="text-[#FF4500]" />
                            <span className="font-bold text-slate-600">From Date:</span>
                            <input 
                                type="date"
                                value={dateFilter.from}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                            <Calendar size={14} className="text-[#FF4500]" />
                            <span className="font-bold text-slate-600">To Date:</span>
                            <input 
                                type="date"
                                value={dateFilter.to}
                                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
                            />
                        </div>

                        {(dateFilter.from || dateFilter.to) && (
                            <button
                                type="button"
                                onClick={() => setDateFilter({ from: '', to: '' })}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-bold text-xs"
                                title="Reset Date Filter"
                            >
                                <X size={14} /> Clear Filter
                            </button>
                        )}
                    </div>

                    <div className="text-xs text-slate-500 font-semibold self-end md:self-auto">
                        Showing <strong className="text-slate-900">{filteredActions.length}</strong> actions across <strong className="text-slate-900">{allActions.length}</strong> recorded events
                    </div>
                </div>
            </div>

            {/* 2. DATE RANGE KPI METRICS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Actions</span>
                        <Clock size={14} className="text-[#FF4500]" />
                    </div>
                    <div className="text-2xl font-black text-slate-900 font-mono">{metrics.total}</div>
                    <span className="text-[10px] text-slate-400 font-medium">Logged on dates</span>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-2xs">
                    <div className="flex items-center justify-between text-amber-700 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Callbacks</span>
                        <PhoneCall size={14} className="text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-amber-950 font-mono">{metrics.callbacks}</div>
                    <span className="text-[10px] text-amber-700/80 font-medium">Follow-ups due</span>
                </div>

                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 shadow-2xs">
                    <div className="flex items-center justify-between text-purple-700 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Appointments</span>
                        <CalendarCheck size={14} className="text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-purple-950 font-mono">{metrics.appointments}</div>
                    <span className="text-[10px] text-purple-700/80 font-medium">Scheduled demos</span>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-2xs">
                    <div className="flex items-center justify-between text-emerald-700 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Qualified</span>
                        <UserCheck size={14} className="text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-emerald-950 font-mono">{metrics.qualified}</div>
                    <span className="text-[10px] text-emerald-700/80 font-medium">High intent clients</span>
                </div>

                <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 shadow-2xs">
                    <div className="flex items-center justify-between text-sky-700 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">New Inbound</span>
                        <PlusCircle size={14} className="text-sky-600" />
                    </div>
                    <div className="text-2xl font-black text-sky-950 font-mono">{metrics.newInbound}</div>
                    <span className="text-[10px] text-sky-700/80 font-medium">Fresh leads sourced</span>
                </div>

                <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-2xs">
                    <div className="flex items-center justify-between text-rose-700 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Lost / Rejected</span>
                        <UserX size={14} className="text-rose-600" />
                    </div>
                    <div className="text-2xl font-black text-rose-950 font-mono">{metrics.lost}</div>
                    <span className="text-[10px] text-rose-700/80 font-medium">Declined / Closed</span>
                </div>
            </div>

            {/* 3. TOOLBAR: SEARCH & CATEGORY TABS */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by client name, lead ID, phone, notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-[#FF4500] focus:bg-white transition-all"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    {[
                        { id: 'ALL', label: 'All Actions', count: allActions.length },
                        { id: 'callback', label: 'Callbacks', count: metrics.callbacks },
                        { id: 'appointment', label: 'Appointments', count: metrics.appointments },
                        { id: 'qualified', label: 'Qualified', count: metrics.qualified },
                        { id: 'new', label: 'New Leads', count: metrics.newInbound },
                        { id: 'lost', label: 'Lost / Rejected', count: metrics.lost }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setCategoryFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                                categoryFilter === tab.id 
                                    ? 'bg-slate-900 text-white shadow-xs' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                categoryFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. ACTIONS & CLIENT STATUS TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3.5 px-5">Date & Time</th>
                                <th className="py-3.5 px-5">Client / Business</th>
                                <th className="py-3.5 px-5">Lead Status</th>
                                <th className="py-3.5 px-5">Action / Call Status</th>
                                <th className="py-3.5 px-5">Notes & Action Remarks</th>
                                <th className="py-3.5 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {paginatedActions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                                        <div className="flex flex-col items-center max-w-sm mx-auto space-y-2">
                                            <Clock size={36} className="text-slate-300" />
                                            <span className="font-bold text-slate-700 text-sm">No actions recorded for this date</span>
                                            <p className="text-xs text-slate-400">
                                                Try changing the date range above or select "All Time" to review all historical activities.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedActions.map(act => (
                                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                                        
                                        {/* Date & Time */}
                                        <td className="py-3.5 px-5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-orange-50 text-[#FF4500] rounded-lg shrink-0">
                                                    <Calendar size={13} />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-900 block font-mono">
                                                        {act.date ? new Date(act.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {act.date && String(act.date).includes('T') ? new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (act.lead?.callbackAlertTime || '')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Client & Company */}
                                        <td className="py-3.5 px-5">
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => onViewLead && onViewLead(act.lead)}
                                                    className="font-bold text-slate-900 hover:text-[#FF4500] transition-colors cursor-pointer text-left block"
                                                    title="Click to view full lead details"
                                                >
                                                    {act.clientName || 'Unnamed Client'}
                                                </button>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {act.companyName && (
                                                        <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                                            {act.companyName}
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                                        {act.leadId}
                                                    </span>
                                                    <span className="text-[10px] text-blue-600 font-medium">
                                                        • {act.leadSource}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Lead Status */}
                                        <td className="py-3.5 px-5">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getLeadStatusBadge(act.leadStatus)}`}>
                                                {act.leadStatus}
                                            </span>
                                        </td>

                                        {/* Action / Call Status */}
                                        <td className="py-3.5 px-5">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1.5 ${getCallStatusBadge(act.callStatus, act.actionType)}`}>
                                                {act.actionType}
                                            </span>
                                        </td>

                                        {/* Notes & Action Remarks */}
                                        <td className="py-3.5 px-5 max-w-xs">
                                            {act.notes ? (
                                                <span className="text-slate-600 text-xs block line-clamp-2" title={act.notes}>
                                                    {act.notes}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 italic text-xs">No notes logged</span>
                                            )}
                                        </td>

                                        {/* Quick Actions */}
                                        <td className="py-3.5 px-5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {act.mobileNumber && (
                                                    <>
                                                        <a 
                                                            href={`tel:${act.mobileNumber}`}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                            title={`Call ${act.mobileNumber}`}
                                                        >
                                                            <Phone size={14} />
                                                        </a>
                                                        <a 
                                                            href={`https://wa.me/${act.mobileNumber.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Chat on WhatsApp"
                                                        >
                                                            <MessageCircle size={14} />
                                                        </a>
                                                    </>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => onViewLead && onViewLead(act.lead)}
                                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                                    title="View complete lead history & update status"
                                                >
                                                    <Eye size={12} />
                                                    <span>View</span>
                                                </button>
                                            </div>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 15 RECORDS PAGINATION FOOTER */}
                {filteredActions.length > PAGE_SIZE && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-white">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing <strong className="text-slate-900">{(validPage - 1) * PAGE_SIZE + 1}</strong>–<strong className="text-slate-900">{Math.min(validPage * PAGE_SIZE, filteredActions.length)}</strong> of <strong className="text-slate-900">{filteredActions.length}</strong> actions
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={validPage <= 1}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft size={14} /> Prev
                            </button>
                            <span className="px-2.5 py-0.5 rounded-md bg-orange-50 text-[#FF4500] font-bold text-xs font-mono">
                                {validPage} / {totalPages}
                            </span>
                            <button 
                                type="button"
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

        </div>
    );
}
