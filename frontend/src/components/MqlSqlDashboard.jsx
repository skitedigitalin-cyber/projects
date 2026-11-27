import { useState, useMemo } from 'react';
import { 
    ArrowLeft, Search, Zap, Phone, PhoneCall, Award, Calendar, 
    Clock, CheckCircle2, AlertCircle, ArrowUpRight, Filter, 
    Building, MapPin, RefreshCw, ChevronRight, UserCheck, Flame
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

    return (
        <div className="w-full flex flex-col space-y-6 animate-fade-up">
            {/* Top Navigation & Header */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={onBackToPipeline}
                            className="px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
                            title={`Back to ${serviceName} Pipeline`}
                        >
                            <ArrowLeft size={15} />
                            <span>Back to Pipeline</span>
                        </button>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                    isMql 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}>
                                    {isMql ? '📞 MQL Dashboard' : '🏆 SQL Dashboard'}
                                </span>
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                    {serviceName} {isMql ? 'Marketing Qualified Leads' : 'Sales Qualified Leads'}
                                </h1>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                <span>{channelName}</span>
                                {' > '}
                                <span>{serviceName}</span>
                                {' > '}
                                <strong className="text-slate-700">{isMql ? 'MQL (Callback Stage)' : 'SQL (Qualified)'}</strong>
                                {' · '}
                                <span className="text-slate-500 font-semibold">{displayLeads.length} leads in this view</span>
                            </p>
                        </div>
                    </div>

                    {/* Mode Switcher Pill */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button
                            type="button"
                            onClick={() => { if (!isMql && onSwitchMode) onSwitchMode('mql'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isMql 
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <PhoneCall size={14} className={isMql ? "text-amber-500" : "text-slate-400"} />
                            <span>MQL (Callbacks)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { if (isMql && onSwitchMode) onSwitchMode('sql'); }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                !isMql 
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-black' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Award size={14} className={!isMql ? "text-emerald-500" : "text-slate-400"} />
                            <span>SQL (Qualified)</span>
                        </button>
                    </div>
                </div>

                {/* Key Metric KPI Banners */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-100">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-4 rounded-2xl border border-slate-200/60">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {isMql ? 'Total MQL Callbacks' : 'Total SQL Qualified'}
                        </p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {isMql ? 'All active callback stages' : 'Ready for appointment / deal'}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-4 rounded-2xl border border-blue-200/50">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Average FITS %</p>
                            <Zap size={14} className="text-yellow-500 fill-yellow-400" />
                        </div>
                        <p className="text-2xl font-black text-blue-900 mt-1">{stats.avgScore}%</p>
                        <div className="w-full bg-blue-200/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${(stats.avgScore / 70) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 p-4 rounded-2xl border border-emerald-200/50">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Top Tier (70%)</p>
                            <Flame size={14} className="text-red-500" />
                        </div>
                        <p className="text-2xl font-black text-emerald-900 mt-1">{stats.topFitCount}</p>
                        <p className="text-[11px] text-emerald-700 font-medium mt-0.5">High fit / strong intent</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-4 rounded-2xl border border-amber-200/50">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                                {isMql ? 'Alerts Overdue' : 'Pipeline Value'}
                            </p>
                            <Clock size={14} className="text-amber-500" />
                        </div>
                        <p className="text-2xl font-black text-amber-900 mt-1">
                            {isMql ? stats.overdueCount : `₹${stats.totalValue.toLocaleString()}`}
                        </p>
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                            {isMql ? 'Follow-ups needing attention' : 'Qualified pipeline open value'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter, Search & View Controls */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={`Search ${isMql ? 'MQL' : 'SQL'} leads by name, phone, company...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                {/* Sub-filter chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                        <Filter size={12} /> Filter:
                    </span>
                    {isMql ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setSubFilter('all')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    subFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All ({filteredByMode.length})
                            </button>
                            {[1, 2, 3, 4, 5].map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setSubFilter(`callback (${num})`)}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        subFilter === `callback (${num})`
                                            ? 'bg-amber-600 text-white shadow-2xs'
                                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                                    }`}
                                >
                                    CB ({num}) {callbackCounts[`Callback (${num})`] ? `(${callbackCounts[`Callback (${num})`]})` : ''}
                                </button>
                            ))}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setSubFilter('all')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    subFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                All SQLs ({filteredByMode.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubFilter('high')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    subFilter === 'high' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                                }`}
                            >
                                Hot (70% Max)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubFilter('warm')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    subFilter === 'warm' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
                                }`}
                            >
                                Warm (40-65%)
                            </button>
                        </>
                    )}
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400">Sort:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                        <option value="score_desc">Highest FITS %</option>
                        <option value="score_asc">Lowest FITS %</option>
                        <option value="value_desc">Highest Value</option>
                        <option value="recent">Most Recent</option>
                    </select>
                </div>
            </div>

            {/* Leads Grid Display */}
            {displayLeads.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                    <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                        {isMql ? <PhoneCall size={28} /> : <Award size={28} />}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No leads found in this view</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        {isMql 
                            ? 'No leads currently in Callback status matching the active filters. Leads marked as Callback from the pipeline will appear here.'
                            : 'No leads currently in Qualified status matching the active filters. Leads qualified via FITS will appear here.'}
                    </p>
                    <button
                        type="button"
                        onClick={onBackToPipeline}
                        className="mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
                    >
                        <ArrowLeft size={14} /> Back to Pipeline
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {displayLeads.map((lead) => {
                        const fitsResult = calculateFitsScore(lead.fits);
                        const isMaxScore = fitsResult.score >= 65;
                        const alertDate = lead.callbackAlertDate || lead.qualifiedAlertDate;
                        const alertTime = lead.callbackAlertTime || lead.qualifiedAlertTime || '00:00';
                        const isOverdue = alertDate && new Date(`${alertDate}T${alertTime}`) <= new Date();

                        return (
                            <div
                                key={lead._id}
                                className={`bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between relative group ${
                                    isOverdue ? 'border-red-300 ring-1 ring-red-200 bg-red-50/20' : 'border-slate-200/80 shadow-xs'
                                }`}
                            >
                                <div>
                                    {/* Card Header */}
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
                                                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                                                    <Building size={11} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{lead.companyName || lead.industry}</span>
                                                </p>
                                            )}
                                        </div>

                                        {/* FITS Percentage Badge */}
                                        <div className="shrink-0 flex flex-col items-end">
                                            <div className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1 shadow-2xs ${fitsResult.badgeClass}`}>
                                                <Zap size={12} className="fill-current text-yellow-500" />
                                                <span>{fitsResult.score}%</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                                                {fitsResult.score === 70 ? 'Target Max (70%)' : 'FITS Score'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Visual Percentage Progress Bar */}
                                    <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden border border-slate-200/50">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${fitsResult.barColor}`} 
                                            style={{ width: `${Math.min(100, (fitsResult.score / 70) * 100)}%` }}
                                            title={`Score: ${fitsResult.score}% of 70%`}
                                        />
                                    </div>

                                    {/* FITS Attributes Grid */}
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-3 text-[11px]">
                                        <div className="grid grid-cols-2 gap-1 text-slate-600">
                                            <div>
                                                <span className="text-slate-400 text-[10px] block">Familiarity (+{fitsResult.breakdown.familiarity}%)</span>
                                                <strong className="text-slate-800 font-bold">{lead.fits?.familiarity || 'None'}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 text-[10px] block">Intention (+{fitsResult.breakdown.intention}%)</span>
                                                <strong className="text-slate-800 font-bold">{lead.fits?.intention || 'None'}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 text-[10px] block">Time (+{fitsResult.breakdown.time}%)</span>
                                                <strong className="text-slate-800 font-bold">{lead.fits?.time || 'None'}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 text-[10px] block">Spend (+{fitsResult.breakdown.spend}%)</span>
                                                <strong className="text-slate-800 font-bold">{lead.fits?.spend || 'None'}</strong>
                                            </div>
                                        </div>

                                        {lead.fits?.intentionReason && (
                                            <p className="text-[10px] text-slate-500 italic mt-1.5 pt-1.5 border-t border-slate-200/60 line-clamp-2">
                                                "{lead.fits.intentionReason}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Stage / Status Specific Info */}
                                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 text-xs">
                                        <div className="flex items-center gap-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                isMql 
                                                    ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                            }`}>
                                                {isMql ? (lead.callStatus || 'Callback') : 'Qualified'}
                                            </span>
                                            {lead.location && (
                                                <span className="text-[10px] text-slate-500 font-medium flex items-center bg-slate-100 px-1.5 py-0.5 rounded">
                                                    <MapPin size={9} className="mr-0.5 text-slate-400" />
                                                    {lead.location}
                                                </span>
                                            )}
                                        </div>
                                        <p className="font-black text-slate-800 text-xs">
                                            ₹{(Number(lead.leadValue) || 0).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Alert / Followup Banner */}
                                    {alertDate && (
                                        <div className={`p-2 rounded-xl text-[10px] font-bold flex items-center justify-between mb-3 ${
                                            isOverdue ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-100'
                                        }`}>
                                            <span className="flex items-center gap-1">
                                                <Clock size={11} className={isOverdue ? "animate-pulse text-red-600" : "text-blue-500"} />
                                                <span>{isOverdue ? 'Overdue Follow-up' : 'Scheduled Follow-up'}:</span>
                                            </span>
                                            <span>{alertDate} {alertTime !== '00:00' ? alertTime : ''}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons Footer */}
                                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onViewLead(lead)}
                                        className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
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
                                        <Zap size={13} className="text-yellow-500 fill-yellow-400" />
                                        <span>FITS</span>
                                    </button>

                                    {/* MQL specific quick action: Advance to SQL if criteria met */}
                                    {isMql && (
                                        <button
                                            type="button"
                                            onClick={() => onMoveToQualified(lead)}
                                            className="py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                                            title="Promote lead to SQL (Qualified)"
                                        >
                                            <Award size={13} className="text-emerald-600" />
                                            <span>Qualify</span>
                                        </button>
                                    )}

                                    {/* SQL specific quick action: Revert to Leads if needed */}
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
