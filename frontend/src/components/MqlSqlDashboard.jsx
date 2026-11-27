import { useState, useMemo } from 'react';
import { 
    ArrowLeft, Search, Zap, Phone, PhoneCall, Award, Calendar, 
    Clock, CheckCircle2, AlertCircle, ArrowUpRight, Filter, 
    Building, MapPin, RefreshCw, ChevronRight, UserCheck, Flame,
    LayoutGrid, List, Sparkles, IndianRupee, ShieldCheck, Check
} from 'lucide-react';
import { calculateFitsScore } from '../utils/fitsScore';

export default function MqlSqlDashboard({ 
    mode = 'mql', // 'mql' | 'sql'
    leads = [], 
    serviceName = 'Web Development', 
    channelName = 'Meta Leads', 
    onBackToPipeline, 
    onSwitchMode,
    onViewLead, 
    onOpenFits,
    onMoveToQualified,
    onMoveBackToLeads
}) {
    const isMql = mode === 'mql';
    const [searchTerm, setSearchTerm] = useState('');
    const [subFilter, setSubFilter] = useState('all');
    const [sortBy, setSortBy] = useState('score_desc');
    const [viewLayout, setViewLayout] = useState('cards'); // 'cards' | 'table'

    // Filter leads based on mode
    const filteredByMode = useMemo(() => {
        if (isMql) {
            // MQL: Leads in Callback status
            return leads.filter(l => {
                const cs = (l.callStatus || '').toLowerCase();
                return cs.includes('callback') || (l.leadStatus === 'Contacted' && cs.startsWith('callback'));
            });
        } else {
            // SQL: Qualified leads
            return leads.filter(l => l.leadStatus === 'Qualified');
        }
    }, [leads, isMql]);

    // Sub-filtering (Callback stage for MQL, score tier for SQL)
    const displayLeads = useMemo(() => {
        let list = filteredByMode.filter(l => {
            const term = searchTerm.toLowerCase().trim();
            if (!term) return true;
            return (
                (l.customerName || '').toLowerCase().includes(term) ||
                (l.companyName || '').toLowerCase().includes(term) ||
                (l.mobileNumber || '').includes(term) ||
                (l.location || '').toLowerCase().includes(term) ||
                (l.callStatus || '').toLowerCase().includes(term)
            );
        });

        if (isMql) {
            if (subFilter !== 'all') {
                list = list.filter(l => (l.callStatus || '').toLowerCase().includes(subFilter.toLowerCase()));
            }
        } else {
            if (subFilter === 'high') {
                list = list.filter(l => calculateFitsScore(l.fits).score >= 65);
            } else if (subFilter === 'warm') {
                list = list.filter(l => {
                    const s = calculateFitsScore(l.fits).score;
                    return s >= 40 && s < 65;
                });
            } else if (subFilter === 'needs_appointment') {
                list = list.filter(l => !l.appointmentAlertDate);
            }
        }

        // Sorting
        return list.sort((a, b) => {
            const scoreA = calculateFitsScore(a.fits).score;
            const scoreB = calculateFitsScore(b.fits).score;
            if (sortBy === 'score_desc') return scoreB - scoreA;
            if (sortBy === 'score_asc') return scoreA - scoreB;
            if (sortBy === 'value_desc') return (Number(b.leadValue) || 0) - (Number(a.leadValue) || 0);
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [filteredByMode, searchTerm, subFilter, sortBy, isMql]);

    // Aggregate statistics
    const stats = useMemo(() => {
        const total = filteredByMode.length;
        if (total === 0) {
            return { total: 0, avgScore: 0, topFitCount: 0, totalValue: 0, overdueCount: 0 };
        }

        let totalScore = 0;
        let topFitCount = 0;
        let totalValue = 0;
        let overdueCount = 0;
        const now = new Date();

        filteredByMode.forEach(l => {
            const score = calculateFitsScore(l.fits).score;
            totalScore += score;
            if (score >= 65) topFitCount++;
            totalValue += (Number(l.leadValue) || 0);

            const alertDate = l.callbackAlertDate || l.qualifiedAlertDate;
            const alertTime = l.callbackAlertTime || l.qualifiedAlertTime || '00:00';
            if (alertDate) {
                const dt = new Date(`${alertDate}T${alertTime}`);
                if (dt <= now) overdueCount++;
            }
        });

        return {
            total,
            avgScore: Math.round(totalScore / total),
            topFitCount,
            totalValue,
            overdueCount
        };
    }, [filteredByMode]);

    // Callback counts for MQL tabs
    const callbackCounts = useMemo(() => {
        if (!isMql) return {};
        const counts = { 'Callback (1)': 0, 'Callback (2)': 0, 'Callback (3)': 0, 'Callback (4)': 0, 'Callback (5)': 0 };
        filteredByMode.forEach(l => {
            const cs = l.callStatus || '';
            for (let i = 1; i <= 5; i++) {
                if (cs.includes(`Callback (${i})`)) counts[`Callback (${i})`]++;
            }
        });
        return counts;
    }, [filteredByMode, isMql]);

    // MQL vs SQL counts for the mode switcher
    const modeCounts = useMemo(() => {
        const mqlCount = leads.filter(l => {
            const cs = (l.callStatus || '').toLowerCase();
            return cs.includes('callback') || (l.leadStatus === 'Contacted' && cs.startsWith('callback'));
        }).length;
        const sqlCount = leads.filter(l => l.leadStatus === 'Qualified').length;
        return { mqlCount, sqlCount };
    }, [leads]);

    return (
        <div className="w-full space-y-5 animate-fade-up">
            {/* Top Navigation & Executive Header Bar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Back button + Title & Breadcrumb */}
                    <div className="flex items-center gap-3.5 min-w-0">
                        <button
                            type="button"
                            onClick={onBackToPipeline}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                            title={`Return to ${serviceName} Pipeline Board`}
                        >
                            <ArrowLeft size={14} />
                            <span>Back to Pipeline</span>
                        </button>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                                    {serviceName}
                                </h1>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-2xs ${
                                    isMql 
                                        ? 'bg-amber-50 text-amber-800 border-amber-300' 
                                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}>
                                    {isMql ? <PhoneCall size={12} className="text-amber-600" /> : <Award size={12} className="text-emerald-600" />}
                                    <span>{isMql ? 'MQL Callbacks' : 'SQL Qualified'}</span>
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                                <span>{channelName}</span>
                                <span className="mx-1 text-slate-300">/</span>
                                <span>{serviceName}</span>
                                <span className="mx-1 text-slate-300">/</span>
                                <strong className="text-slate-700">{isMql ? 'Marketing Qualified (Callbacks)' : 'Sales Qualified (Ready for Deal)'}</strong>
                                <span className="ml-2 text-slate-400">· {displayLeads.length} leads</span>
                            </p>
                        </div>
                    </div>

                    {/* Right: Segmented Mode Switcher */}
                    <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shrink-0">
                        <button
                            type="button"
                            onClick={() => { if (!isMql && onSwitchMode) onSwitchMode('mql'); }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isMql 
                                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <PhoneCall size={13} className={isMql ? "text-amber-600" : "text-slate-400"} />
                            <span>MQL</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                isMql ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {modeCounts.mqlCount}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { if (isMql && onSwitchMode) onSwitchMode('sql'); }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                !isMql 
                                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Award size={13} className={!isMql ? "text-emerald-600" : "text-slate-400"} />
                            <span>SQL</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                !isMql ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                            }`}>
                                {modeCounts.sqlCount}
                            </span>
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                    {/* Card 1: Total Leads */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isMql ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                            {isMql ? <PhoneCall size={18} /> : <Award size={18} />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                {isMql ? 'Total MQLs' : 'Total SQLs'}
                            </p>
                            <p className="text-xl font-black text-slate-900 leading-tight">{stats.total}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                                {isMql ? 'Callback stages' : 'Qualified leads'}
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Average FITS % */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <Zap size={18} className="fill-current text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Avg FITS Score</p>
                            <p className="text-xl font-black text-slate-900 leading-tight">{stats.avgScore}%</p>
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div 
                                    className="h-full rounded-full bg-blue-600 transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (stats.avgScore / 70) * 100)}%` }} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Top Tier (70%) */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Flame size={18} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Top Fit (70% Max)</p>
                            <p className="text-xl font-black text-slate-900 leading-tight">{stats.topFitCount}</p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">High intention &amp; fast</p>
                        </div>
                    </div>

                    {/* Card 4: Pipeline Value / Alerts */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isMql && stats.overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200/80 text-slate-700'
                        }`}>
                            {isMql ? <Clock size={18} /> : <IndianRupee size={18} />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                {isMql ? 'Overdue Alerts' : 'Pipeline Value'}
                            </p>
                            <p className="text-xl font-black text-slate-900 leading-tight">
                                {isMql ? stats.overdueCount : `₹${stats.totalValue.toLocaleString()}`}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium truncate">
                                {isMql ? 'Follow-ups needing action' : 'Open deal potential'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Clean Filter Toolbar with Layout Switcher */}
            <div className="bg-white rounded-2xl p-3 px-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                {/* Search */}
                <div className="relative min-w-[220px] max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        placeholder={`Search ${isMql ? 'MQL' : 'SQL'} leads...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                </div>

                {/* Sub-filter chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {isMql ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setSubFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    subFilter === 'all' 
                                        ? 'bg-slate-900 text-white shadow-2xs' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All ({filteredByMode.length})
                            </button>
                            {[1, 2, 3, 4, 5].map(num => {
                                const count = callbackCounts[`Callback (${num})`] || 0;
                                return (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setSubFilter(`callback (${num})`)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                            subFilter === `callback (${num})`
                                                ? 'bg-amber-600 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span>CB {num}</span>
                                        {count > 0 && (
                                            <span className={`px-1 py-0.2 rounded-full text-[9px] font-black ${
                                                subFilter === `callback (${num})` ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setSubFilter('all')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    subFilter === 'all' 
                                        ? 'bg-slate-900 text-white shadow-2xs' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All SQLs ({filteredByMode.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubFilter('high')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                    subFilter === 'high' 
                                        ? 'bg-emerald-700 text-white shadow-2xs' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <span>🔥 Hot (70% Max)</span>
                                {stats.topFitCount > 0 && (
                                    <span className="px-1 py-0.2 rounded-full text-[9px] font-black bg-emerald-200 text-emerald-900">
                                        {stats.topFitCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubFilter('warm')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    subFilter === 'warm' 
                                        ? 'bg-amber-600 text-white shadow-2xs' 
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                🌤️ Warm (40-65%)
                            </button>
                        </>
                    )}
                </div>

                {/* View layout toggle & Sort */}
                <div className="flex items-center gap-2">
                    {/* View Switcher: Grid vs Table */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setViewLayout('cards')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                viewLayout === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Cards View"
                        >
                            <LayoutGrid size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewLayout('table')}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                viewLayout === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="Table View"
                        >
                            <List size={14} />
                        </button>
                    </div>

                    {/* Sort selector */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                        <option value="score_desc">Highest FITS %</option>
                        <option value="score_asc">Lowest FITS %</option>
                        <option value="value_desc">Highest Value</option>
                        <option value="recent">Recently Added</option>
                    </select>
                </div>
            </div>

            {/* Lead Records Display: Cards View OR Table View */}
            {displayLeads.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/90 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        {isMql ? <PhoneCall size={24} /> : <Award size={24} />}
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No leads found in this view</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {isMql 
                            ? 'No leads matching the selected callback filters.' 
                            : 'No leads matching the selected qualified filters.'}
                    </p>
                    <button
                        type="button"
                        onClick={onBackToPipeline}
                        className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                        <ArrowLeft size={13} /> Back to Pipeline Board
                    </button>
                </div>
            ) : viewLayout === 'table' ? (
                /* ========================================================
                   EXECUTIVE TABLE VIEW (Dense, Clean, No Clutter)
                   ======================================================== */
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                    <th className="py-3 px-4">Lead / Company</th>
                                    <th className="py-3 px-4">FITS Score</th>
                                    <th className="py-3 px-4">FITS Assessment</th>
                                    <th className="py-3 px-4">Status / Stage</th>
                                    <th className="py-3 px-4">Alert / Date</th>
                                    <th className="py-3 px-4 text-right">Value</th>
                                    <th className="py-3 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayLeads.map(lead => {
                                    const fitsResult = calculateFitsScore(lead.fits);
                                    const alertDate = lead.callbackAlertDate || lead.qualifiedAlertDate;
                                    const alertTime = lead.callbackAlertTime || lead.qualifiedAlertTime || '00:00';
                                    const isOverdue = alertDate && new Date(`${alertDate}T${alertTime}`) <= new Date();

                                    return (
                                        <tr key={lead._id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Client */}
                                            <td className="py-3 px-4">
                                                <button
                                                    type="button"
                                                    onClick={() => onViewLead(lead)}
                                                    className="font-bold text-slate-900 hover:text-blue-600 text-left block truncate max-w-[180px] cursor-pointer"
                                                >
                                                    {lead.customerName}
                                                </button>
                                                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">
                                                    {lead.companyName || lead.mobileNumber || '—'}
                                                </p>
                                            </td>

                                            {/* FITS Score */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-black border flex items-center gap-1 shadow-2xs ${fitsResult.badgeClass}`}>
                                                        <Zap size={11} className="fill-current text-yellow-500" />
                                                        {fitsResult.score}%
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {fitsResult.score === 70 ? 'Target Max' : fitsResult.label}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* FITS Assessment (Clean Mini-Chips) */}
                                            <td className="py-3 px-4">
                                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold" title="Familiarity">
                                                        Fam: <strong>{lead.fits?.familiarity || '—'}</strong>
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold" title="Intention">
                                                        Intent: <strong>{lead.fits?.intention || '—'}</strong>
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold" title="Time">
                                                        Time: <strong>{lead.fits?.time || '—'}</strong>
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold" title="Spend">
                                                        Spend: <strong>{lead.fits?.spend || '—'}</strong>
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status / Stage */}
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                    isMql 
                                                        ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                                }`}>
                                                    {isMql ? (lead.callStatus || 'Callback') : 'Qualified'}
                                                </span>
                                            </td>

                                            {/* Followup Alert */}
                                            <td className="py-3 px-4">
                                                {alertDate ? (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        <Clock size={11} className={isOverdue ? "text-red-600 animate-pulse" : "text-slate-400"} />
                                                        <span>{alertDate}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 font-medium">—</span>
                                                )}
                                            </td>

                                            {/* Value */}
                                            <td className="py-3 px-4 text-right font-black text-slate-800">
                                                ₹{(Number(lead.leadValue) || 0).toLocaleString()}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => onViewLead(lead)}
                                                        className="p-1 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                                                        title="View full lead details"
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenFits(lead)}
                                                        className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                                                        title="Update FITS Score"
                                                    >
                                                        FITS
                                                    </button>
                                                    {isMql && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onMoveToQualified(lead)}
                                                            className="p-1 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                                                            title="Promote to SQL"
                                                        >
                                                            Qualify
                                                        </button>
                                                    )}
                                                    {!isMql && onMoveBackToLeads && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onMoveBackToLeads(lead)}
                                                            className="p-1 px-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md font-medium text-[10px] transition-colors cursor-pointer"
                                                            title="Move back to Leads Kanban"
                                                        >
                                                            ↩ Leads
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* ========================================================
                   CLEAN REFINED CARDS VIEW (Clean, Spacious, Beautiful)
                   ======================================================== */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayLeads.map((lead) => {
                        const fitsResult = calculateFitsScore(lead.fits);
                        const alertDate = lead.callbackAlertDate || lead.qualifiedAlertDate;
                        const alertTime = lead.callbackAlertTime || lead.qualifiedAlertTime || '00:00';
                        const isOverdue = alertDate && new Date(`${alertDate}T${alertTime}`) <= new Date();

                        return (
                            <div
                                key={lead._id}
                                className={`bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
                                    isOverdue ? 'border-red-300 ring-1 ring-red-100 bg-red-50/15' : 'border-slate-200/90 shadow-2xs'
                                }`}
                            >
                                <div>
                                    {/* Top Row: Client Name & FITS Pill */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0">
                                            <h4 
                                                className="font-bold text-slate-900 text-sm leading-tight truncate hover:text-blue-600 transition-colors cursor-pointer"
                                                onClick={() => onViewLead(lead)}
                                                title={lead.customerName}
                                            >
                                                {lead.customerName}
                                            </h4>
                                            {(lead.companyName || lead.industry) && (
                                                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                                                    <Building size={11} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{lead.companyName || lead.industry}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* FITS Score Pill */}
                                        <div className="shrink-0 flex items-center gap-1">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-black border flex items-center gap-1 shadow-2xs ${fitsResult.badgeClass}`}>
                                                <Zap size={11} className="fill-current text-yellow-500" />
                                                <span>{fitsResult.score}%</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Micro Progress Bar */}
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${fitsResult.barColor}`} 
                                            style={{ width: `${Math.min(100, (fitsResult.score / 70) * 100)}%` }} 
                                        />
                                    </div>

                                    {/* FITS Attributes: Clean 4-Pill Row */}
                                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                                        <div className="p-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                                            <span className="text-[10px] text-slate-400 font-semibold block">Familiarity (+{fitsResult.breakdown.familiarity}%)</span>
                                            <strong className="text-slate-800 font-bold">{lead.fits?.familiarity || 'None'}</strong>
                                        </div>
                                        <div className="p-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                                            <span className="text-[10px] text-slate-400 font-semibold block">Intention (+{fitsResult.breakdown.intention}%)</span>
                                            <strong className="text-slate-800 font-bold">{lead.fits?.intention || 'None'}</strong>
                                        </div>
                                        <div className="p-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                                            <span className="text-[10px] text-slate-400 font-semibold block">Time (+{fitsResult.breakdown.time}%)</span>
                                            <strong className="text-slate-800 font-bold">{lead.fits?.time || 'None'}</strong>
                                        </div>
                                        <div className="p-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                                            <span className="text-[10px] text-slate-400 font-semibold block">Spend (+{fitsResult.breakdown.spend}%)</span>
                                            <strong className="text-slate-800 font-bold">{lead.fits?.spend || 'None'}</strong>
                                        </div>
                                    </div>

                                    {lead.fits?.intentionReason && (
                                        <p className="text-[10px] text-slate-500 italic mb-3 px-2 py-1 bg-slate-50/60 rounded border border-slate-100 line-clamp-1" title={lead.fits.intentionReason}>
                                            "{lead.fits.intentionReason}"
                                        </p>
                                    )}

                                    {/* Status, Location & Value Row */}
                                    <div className="flex items-center justify-between text-xs mb-3 pt-1 border-t border-slate-100">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                isMql 
                                                    ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                            }`}>
                                                {isMql ? (lead.callStatus || 'Callback') : 'Qualified'}
                                            </span>
                                            {lead.location && (
                                                <span className="text-[10px] text-slate-400 font-medium flex items-center">
                                                    <MapPin size={10} className="mr-0.5" />
                                                    {lead.location}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-black text-slate-900 text-xs">
                                            ₹{(Number(lead.leadValue) || 0).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Follow-up Alert (if any) */}
                                    {alertDate && (
                                        <div className={`p-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center justify-between mb-3 ${
                                            isOverdue ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            <span className="flex items-center gap-1">
                                                <Clock size={11} className={isOverdue ? "text-red-600 animate-pulse" : "text-slate-400"} />
                                                <span>{isOverdue ? 'Follow-up Overdue:' : 'Follow-up:'}</span>
                                            </span>
                                            <span>{alertDate} {alertTime !== '00:00' ? alertTime : ''}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons Row */}
                                <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onViewLead(lead)}
                                        className="flex-1 py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                                    >
                                        <span>Details</span>
                                        <ArrowUpRight size={13} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onOpenFits(lead)}
                                        className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        title="Recalculate or update FITS Score"
                                    >
                                        <Zap size={12} className="text-yellow-500 fill-yellow-400" />
                                        <span>FITS</span>
                                    </button>

                                    {isMql && (
                                        <button
                                            type="button"
                                            onClick={() => onMoveToQualified(lead)}
                                            className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                            title="Promote lead to SQL (Qualified)"
                                        >
                                            <Award size={12} className="text-emerald-600" />
                                            <span>Qualify</span>
                                        </button>
                                    )}

                                    {!isMql && onMoveBackToLeads && (
                                        <button
                                            type="button"
                                            onClick={() => onMoveBackToLeads(lead)}
                                            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold rounded-xl transition-all cursor-pointer"
                                            title="Move back to Leads Kanban"
                                        >
                                            ↩ Leads
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
