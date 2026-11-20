import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Users, DollarSign, TrendingUp, PhoneCall, AlertCircle, Target, ArrowRight, Activity, ChevronRight, Sparkles, BarChart3, Plus, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/leads/dashboard-stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalPipeline = stats?.totalPipelineValue ?? 0;
    const activeLeads = stats?.activeLeadsCount ?? 0;
    const actionItems = stats?.actionItemsCount ?? 0;
    const escalations = stats?.escalationsCount ?? 0;
    const pipelineHealth = stats?.pipelineHealth || { highIntentPct: 0, nurturePct: 0, discoveryPct: 0 };
    const conversionRate = stats?.conversionRate ?? '0.0';
    const recentLeads = stats?.recentLeads || [];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'New': return { bg: 'bg-blue-50 text-blue-600 border-blue-200/50 dot-bg-blue-500' };
            case 'Contacted': return { bg: 'bg-indigo-50 text-indigo-600 border-indigo-200/50 dot-bg-indigo-500' };
            case 'Qualified': return { bg: 'bg-purple-50 text-purple-600 border-purple-200/50 dot-bg-purple-500' };
            case 'Proposal Sent': return { bg: 'bg-amber-50 text-amber-600 border-amber-200/50 dot-bg-amber-500' };
            case 'Converted': return { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dot-bg-emerald-500' };
            case 'Lost': return { bg: 'bg-rose-50 text-rose-600 border-rose-200/50 dot-bg-rose-500' };
            default: return { bg: 'bg-slate-50 text-slate-600 border-slate-200/50 dot-bg-slate-500' };
        }
    };

    return (
        <Layout>
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

            <div className="max-w-[1400px] mx-auto pt-4 pb-12">
                {/* Header Section */}
                <div className="mb-10 animate-fade-up flex justify-between items-end">
                    <div>
                        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold tracking-wide uppercase mb-3">
                            <Sparkles size={14} className="text-blue-500" />
                            <span>Workspace Active</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
                            Overview
                        </h1>
                        <p className="text-slate-500 font-medium">Your live revenue and pipeline performance for this tenant.</p>
                    </div>
                    <div className="hidden md:flex items-center space-x-3">
                        <button 
                            onClick={() => navigate('/sales')} 
                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-full hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm cursor-pointer"
                        >
                            View Pipeline
                        </button>
                        <button 
                            onClick={() => navigate('/sales/lead/add')} 
                            className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all active:scale-95 shadow-md hover:shadow-lg flex items-center cursor-pointer"
                        >
                            <Plus size={16} className="mr-2" /> New Deal
                        </button>
                    </div>
                </div>

                {/* KPI Cards - Double Bezel Bento Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    
                    {/* Dark Premium Card - Total Pipeline */}
                    <div 
                        onClick={() => navigate('/sales')}
                        className="group animate-fade-up delay-100 p-2 bg-slate-100 rounded-[2rem] hover:bg-slate-200 transition-colors duration-500 cursor-pointer"
                    >
                        <div className="bg-slate-900 rounded-[1.5rem] p-6 h-full shadow-xl relative overflow-hidden animate-shimmer flex flex-col justify-between">
                            <div className="absolute top-0 right-0 p-3 opacity-20">
                                <DollarSign size={80} strokeWidth={1} className="text-slate-400 translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="relative z-10 flex justify-between items-start mb-8">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pipeline</h3>
                                <div className="p-2.5 bg-slate-800 rounded-full text-white group-hover:bg-blue-500 transition-colors duration-300">
                                    <DollarSign size={18} strokeWidth={2} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-black text-white tracking-tight mb-3">
                                    ₹{totalPipeline.toLocaleString()}
                                </h2>
                                <div className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-400/10 w-max px-3 py-1.5 rounded-full backdrop-blur-md">
                                    <TrendingUp size={14} className="mr-1.5" /> Live active value
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Active Leads Card */}
                    <div 
                        onClick={() => navigate('/sales')}
                        className="group animate-fade-up delay-100 p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-colors duration-500 cursor-pointer"
                    >
                        <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-8">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Leads</h3>
                                <div className="p-2.5 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300">
                                    <Users size={18} strokeWidth={2} />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
                                    {activeLeads}
                                </h2>
                                <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-max px-3 py-1.5 rounded-full">
                                    <TrendingUp size={14} className="mr-1.5" /> {stats?.totalLeadsCount ?? 0} total leads
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Items Card */}
                    <div 
                        onClick={() => navigate('/sales')}
                        className="group animate-fade-up delay-200 p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-colors duration-500 cursor-pointer"
                    >
                        <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-8">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Action Items</h3>
                                <div className="p-2.5 bg-purple-50 rounded-full text-purple-600 group-hover:bg-purple-100 group-hover:-rotate-12 transition-all duration-300">
                                    <PhoneCall size={18} strokeWidth={2} />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
                                    {actionItems}
                                </h2>
                                <div className="flex items-center text-xs font-bold text-slate-600 bg-slate-100 w-max px-3 py-1.5 rounded-full">
                                    {stats?.pendingCallsCount ?? 0} pending calls
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Escalations Card */}
                    <div 
                        onClick={() => navigate('/sales')}
                        className="group animate-fade-up delay-300 p-2 bg-red-50/50 rounded-[2rem] border border-red-100 hover:bg-red-50 transition-colors duration-500 cursor-pointer"
                    >
                        <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(239,68,68,0.1)] group-hover:shadow-[0_8px_30px_-8px_rgba(239,68,68,0.15)] transition-all duration-500 flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-8">
                                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest">Escalations</h3>
                                <div className="p-2.5 bg-red-50 rounded-full text-red-600 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                                    <AlertCircle size={18} strokeWidth={2} className="group-hover:animate-bounce" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">
                                    {escalations}
                                </h2>
                                <div className="flex items-center text-xs font-bold text-red-600 bg-red-50 w-max px-3 py-1.5 rounded-full">
                                    {escalations > 0 ? 'Requires attention' : 'All clear'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    
                    {/* Chart Area - Glassy App Feel */}
                    <div className="lg:col-span-2 animate-fade-up delay-200">
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <div className="flex justify-between items-center mb-8 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 flex items-center tracking-tight">
                                        <BarChart3 size={24} className="mr-3 text-blue-500" /> Revenue & Pipeline Activity
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium mt-1">Live active metrics for current workspace</p>
                                </div>
                                <button 
                                    onClick={() => navigate('/sales')} 
                                    className="group flex items-center text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                                >
                                    Full Leads View <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            <div className="flex-1 bg-slate-50/50 rounded-2xl flex flex-col justify-between p-6 border border-slate-100 min-h-[300px] relative overflow-hidden">
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Total Pipeline</span>
                                        <p className="text-2xl font-black text-slate-900 mt-1">₹{totalPipeline.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Hot Leads</span>
                                        <p className="text-2xl font-black text-rose-600 mt-1">{pipelineHealth.hotCount || 0}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Active Contacts</span>
                                        <p className="text-2xl font-black text-blue-600 mt-1">{activeLeads}</p>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between space-x-4 h-36 w-full px-4">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                                        const h = activeLeads > 0 ? Math.min(100, Math.max(25, ((i + 1) * 15) % 100)) : 15;
                                        return (
                                            <div key={day} className="flex-1 flex flex-col items-center h-full justify-end group/bar">
                                                <div 
                                                    className="w-full max-w-[36px] bg-blue-100 group-hover/bar:bg-blue-600 rounded-t-lg transition-all duration-300 relative"
                                                    style={{ height: `${h}%` }}
                                                ></div>
                                                <span className="text-xs font-bold text-slate-400 mt-2">{day}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Health - Real Breakdown */}
                    <div className="animate-fade-up delay-300">
                        <div className="bg-slate-900 rounded-[2rem] p-8 h-full shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <h3 className="text-xl font-bold text-white mb-8 tracking-tight relative z-10">Pipeline Health</h3>
                            
                            <div className="space-y-6 relative z-10">
                                {/* High Intent (Hot) */}
                                <div className="group">
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <span className="text-white flex items-center"><div className="w-2 h-2 rounded-full bg-rose-500 mr-2 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div> High Intent (Hot)</span>
                                        <span className="text-rose-400">{pipelineHealth.highIntentPct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                                        <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pipelineHealth.highIntentPct}%` }}></div>
                                    </div>
                                </div>
                                
                                {/* Nurture (Warm) */}
                                <div className="group">
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <span className="text-white flex items-center"><div className="w-2 h-2 rounded-full bg-amber-400 mr-2 shadow-[0_0_10px_rgba(251,191,36,0.8)]"></div> Nurture (Warm)</span>
                                        <span className="text-amber-400">{pipelineHealth.nurturePct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                                        <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-1000 ease-out delay-100" style={{ width: `${pipelineHealth.nurturePct}%` }}></div>
                                    </div>
                                </div>

                                {/* Discovery (Cold) */}
                                <div className="group">
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <span className="text-white flex items-center"><div className="w-2 h-2 rounded-full bg-sky-400 mr-2 shadow-[0_0_10px_rgba(56,189,248,0.8)]"></div> Discovery (Cold)</span>
                                        <span className="text-sky-400">{pipelineHealth.discoveryPct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                                        <div className="bg-gradient-to-r from-sky-500 to-sky-300 h-full rounded-full transition-all duration-1000 ease-out delay-200" style={{ width: `${pipelineHealth.discoveryPct}%` }}></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div 
                                onClick={() => navigate('/sales')} 
                                className="mt-10 p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md relative z-10 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm text-slate-400 font-medium mb-1">Overall Conversion Rate</span>
                                    <div className="flex items-end justify-between">
                                        <span className="text-3xl font-black text-white tracking-tight">{conversionRate}%</span>
                                        <span className="flex items-center text-emerald-400 text-sm font-bold">
                                            <Target size={16} className="mr-1" /> {stats?.totalLeadsCount ?? 0} leads
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Strip Table - Real Live Deal Feed */}
                <div className="animate-fade-up delay-300">
                    <div className="flex justify-between items-end mb-6 px-2">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Live Deal Feed</h3>
                            <p className="text-sm text-slate-500 font-medium">Real-time updates from your active pipeline</p>
                        </div>
                        <button 
                            onClick={() => navigate('/sales')} 
                            className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center group cursor-pointer"
                        >
                            View All Pipeline <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentLeads.length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-500">
                                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="font-semibold">No active leads found in this workspace</p>
                                <button 
                                    onClick={() => navigate('/sales/lead/add')} 
                                    className="mt-3 text-sm font-bold text-blue-600 hover:underline cursor-pointer"
                                >
                                    + Add Your First Lead
                                </button>
                            </div>
                        ) : (
                            recentLeads.map((lead) => {
                                const badge = getStatusBadge(lead.leadStatus);
                                return (
                                    <div 
                                        key={lead._id}
                                        onClick={() => navigate('/sales')}
                                        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-wrap items-center justify-between gap-4 group"
                                    >
                                        <div className="flex items-center min-w-[200px]">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-4 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                {lead.initials}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{lead.customerName}</div>
                                                <div className="text-xs font-semibold text-slate-400">{lead.companyName}</div>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-[150px] hidden md:block">
                                            <div className="flex items-center text-sm font-medium text-slate-600">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2"></div> {lead.leadSource}
                                            </div>
                                        </div>
                                        <div className="min-w-[120px]">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span> {lead.leadStatus}
                                            </span>
                                        </div>
                                        <div className="text-right min-w-[100px]">
                                            <div className="font-black text-slate-900 text-lg">
                                                ₹{(Number(lead.leadValue) || 0).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
