import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserCheck, UserX, CalendarDays, Clock, FileSignature, Target, Activity } from 'lucide-react';

export default function HRDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/hr/dashboard', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setStats(res.data);
            } catch (error) {
                console.error("Error fetching HR stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return (
        <div className="flex h-64 items-center justify-center animate-fade-up">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 font-bold text-slate-500">Loading HR metrics...</p>
            </div>
        </div>
    );

    const cards = [
        { title: 'Present Today', value: stats?.presentToday || 0, icon: <UserCheck size={20} className="text-emerald-500" />, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', hoverBg: 'group-hover:bg-emerald-100', valueColor: 'text-emerald-600' },
        { title: 'Absent Today', value: stats?.absentToday || 0, icon: <UserX size={20} className="text-rose-500" />, iconBg: 'bg-rose-50', iconColor: 'text-rose-600', hoverBg: 'group-hover:bg-rose-100', valueColor: 'text-rose-600' },
        { title: 'On Leave Today', value: stats?.onLeaveToday || 0, icon: <CalendarDays size={20} className="text-purple-500" />, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', hoverBg: 'group-hover:bg-purple-100', valueColor: 'text-slate-900' },
        { title: 'Pending Leaves', value: stats?.pendingLeaves || 0, icon: <FileSignature size={20} className="text-amber-500" />, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', hoverBg: 'group-hover:bg-amber-100', valueColor: 'text-slate-900' }
    ];

    const attendanceRate = stats?.totalEmployees > 0 
        ? Math.round((stats.presentToday / stats.totalEmployees) * 100) 
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8 animate-fade-up">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">HR Overview</h2>
                    <p className="text-sm text-slate-500 font-medium">Real-time attendance and workforce metrics.</p>
                </div>
            </div>
            
            {/* Top row cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 animate-fade-up delay-100">
                
                {/* Total Employees - Dark Premium Bento */}
                <div className="lg:col-span-1 group p-2 bg-slate-100 rounded-[2rem] hover:bg-slate-200 transition-colors duration-500 cursor-default">
                    <div className="bg-slate-900 rounded-[1.5rem] p-6 h-full shadow-xl relative overflow-hidden animate-shimmer flex flex-col justify-between group-hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                            <Users size={80} strokeWidth={1} className="text-slate-400 translate-x-4 -translate-y-4 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700" />
                        </div>
                        <div className="relative z-10 flex justify-between items-start mb-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Staff</h3>
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-4xl font-black text-white tracking-tight mb-3">{stats?.totalEmployees || 0}</h2>
                            <div className="flex items-center text-xs font-bold text-blue-400 bg-blue-400/10 w-max px-3 py-1.5 rounded-full backdrop-blur-md">
                                Active Team
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Cards - Light Premium Bento */}
                {cards.map((card, idx) => (
                    <div key={idx} className="group p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-colors duration-500 cursor-default">
                        <div className="bg-white rounded-[1.5rem] p-6 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col justify-between group-hover:scale-[1.02]">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{card.title}</h3>
                                <div className={`p-2 rounded-xl ${card.iconBg} ${card.iconColor} ${card.hoverBg} group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                                    {card.icon}
                                </div>
                            </div>
                            <div>
                                <h2 className={`text-4xl font-black tracking-tight mb-2 ${card.valueColor}`}>{card.value}</h2>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Row - Larger widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up delay-200">
                {/* Attendance Metric */}
                <div className="group p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-colors duration-500">
                    <div className="bg-white rounded-[1.5rem] p-8 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col justify-between relative overflow-hidden group-hover:scale-[1.01]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        
                        <div className="flex justify-between items-center mb-6 relative z-10">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center tracking-tight">
                                <Clock size={24} className="mr-3 text-blue-500 group-hover:animate-pulse" /> Today's Attendance
                            </h3>
                        </div>

                        <div className="flex items-center space-x-10 relative z-10">
                            <div className="relative w-40 h-40 flex flex-col items-center justify-center">
                                {/* SVG Ring */}
                                <svg className="w-full h-full transform -rotate-90 absolute inset-0" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="none" 
                                        stroke="#3b82f6" 
                                        strokeWidth="8" 
                                        strokeLinecap="round"
                                        strokeDasharray="283"
                                        strokeDashoffset={283 - (283 * attendanceRate) / 100}
                                        className="transition-all duration-1000 ease-out delay-500"
                                    />
                                </svg>
                                <span className="text-4xl font-black text-slate-900 z-10 tracking-tighter">{attendanceRate}%</span>
                                <span className="text-xs font-bold text-slate-400 z-10 uppercase tracking-widest mt-1">Present</span>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold text-slate-500">Present</span>
                                        <span className="font-bold text-slate-900">{stats?.presentToday}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${attendanceRate}%` }}></div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold text-slate-500">Absent / Leave</span>
                                        <span className="font-bold text-slate-900">{(stats?.absentToday || 0) + (stats?.onLeaveToday || 0)}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                        <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${100 - attendanceRate}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Empty state card placeholder for symmetry */}
                <div className="group p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 hover:border-slate-200 hover:bg-slate-100/50 transition-colors duration-500">
                    <div className="bg-white rounded-[1.5rem] p-8 h-full shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col items-center justify-center relative overflow-hidden group-hover:scale-[1.01] border-2 border-dashed border-slate-100">
                        <Activity size={32} className="text-slate-300 mb-4 group-hover:scale-110 transition-transform group-hover:text-blue-400" />
                        <h3 className="text-slate-500 font-bold mb-1">Activity Feed</h3>
                        <p className="text-sm text-slate-400 font-medium">Coming soon</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
