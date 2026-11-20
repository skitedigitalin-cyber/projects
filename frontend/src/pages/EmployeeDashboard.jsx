import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
    LayoutDashboard, Calendar, CalendarClock, CheckSquare, LogOut, Clock, 
    CalendarPlus, StopCircle, PlayCircle, Plus, Briefcase, FileText, 
    FolderKanban, CalendarDays, ExternalLink, AlertTriangle, X,
    PanelLeftClose, PanelLeftOpen, Landmark, CheckCircle2, ChevronRight,
    ListChecks 
} from 'lucide-react';

import MyAttendance from '../components/MyAttendance';
import MyLeaves from '../components/MyLeaves';
import MyTasks from '../components/MyTasks';
import EmployeeMobileHome from '../components/EmployeeMobileHome';

const isProjectChecklistTask = (task) => {
    if (!task) return false;
    if (task.webDevProject && Array.isArray(task.webDevProject.checklist) && task.webDevProject.checklist.length > 0) return true;
    if (task.seoProject && Array.isArray(task.seoProject.checklist) && task.seoProject.checklist.length > 0) return true;
    return false;
};

export default function EmployeeDashboard() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [currentTime, setCurrentTime] = useState(new Date());

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    const [activeTab, setActiveTab] = useState('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [shift, setShift] = useState('');
    const [myTasks, setMyTasks] = useState([]);
    const [myFollowUps, setMyFollowUps] = useState(null);
    const salesEnabled = user?.activeModules?.includes('sales');
    
    // Dashboard Overview States
    const [attendance, setAttendance] = useState(null);
    const [pendingPrevious, setPendingPrevious] = useState(null);
    const [tasksCount, setTasksCount] = useState(0);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [leavesCount, setLeavesCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem('emp-sidebar-collapsed') === 'true';
        } catch {
            return false;
        }
    });

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            try {
                localStorage.setItem('emp-sidebar-collapsed', String(next));
            } catch (e) {}
            return next;
        });
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
    const [taskDescription, setTaskDescription] = useState('');

    const [isPreviousCheckoutModalOpen, setIsPreviousCheckoutModalOpen] = useState(false);
    const [previousCheckoutReason, setPreviousCheckoutReason] = useState('');

    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [leaveData, setLeaveData] = useState({
        leaveType: 'Casual Leave',
        startDate: '',
        endDate: '',
        reason: ''
    });

    // Permission States
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [myPermissions, setMyPermissions] = useState([]);
    const [isSubmittingPerm, setIsSubmittingPerm] = useState(false);
    const [permissionData, setPermissionData] = useState({
        date: new Date().toISOString().split('T')[0],
        hours: 2,
        timeSlot: '10:00 AM - 12:00 PM',
        type: 'Personal Work',
        reason: ''
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchOverview = async () => {
        try {
            const token = localStorage.getItem('token');
            const [attRes, taskRes, leaveRes, permRes] = await Promise.all([
                axios.get('http://localhost:5000/api/hr/attendance/today', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5000/api/hr/tasks/my-tasks', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5000/api/hr/leaves/my-leaves', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:5000/api/hr/permissions/my-permissions', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
            ]);
            setAttendance(attRes.data.attendance);
            setShift(attRes.data.shift);
            setPendingPrevious(attRes.data.pendingPreviousCheckout || null);
            
            const pendingList = Array.isArray(taskRes.data) ? taskRes.data.filter(t => t.status !== 'Completed') : [];
            setMyTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setTasksCount(pendingList.length);
            setPendingTasks(pendingList);

            setLeavesCount(leaveRes.data.filter(l => l.status === 'Pending').length);
            setMyPermissions(Array.isArray(permRes.data) ? permRes.data : []);
        } catch (error) {
            console.error("Error fetching overview", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, [activeTab]); // Refetch when tab changes to keep overview fresh

    useEffect(() => {
        if (!salesEnabled || activeTab !== 'dashboard') return;
        const controller = new AbortController();
        axios.get('http://localhost:5000/api/leads/my-follow-ups', { signal: controller.signal })
            .then(({ data }) => setMyFollowUps(data))
            .catch(() => { if (!controller.signal.aborted) setMyFollowUps(null); });
        return () => controller.abort();
    }, [salesEnabled, activeTab]);

    const handleCheckIn = async () => {
        if (pendingPrevious) {
            alert("You have an unclosed shift from a previous day. Please complete that check-out first.");
            setIsPreviousCheckoutModalOpen(true);
            return;
        }
        try {
            await axios.post('http://localhost:5000/api/hr/attendance/check-in', {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchOverview();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to Check In");
        }
    };

    const handleCheckOutSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/hr/attendance/check-out', { notes: taskDescription }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setIsCheckOutModalOpen(false);
            setTaskDescription('');
            fetchOverview();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to Check Out");
        }
    };

    const handlePreviousCheckOutSubmit = async (e) => {
        e.preventDefault();
        if (!previousCheckoutReason.trim()) {
            alert("Please provide a description / reason for the missed checkout.");
            return;
        }
        try {
            await axios.post('http://localhost:5000/api/hr/attendance/check-out', {
                notes: previousCheckoutReason,
                attendanceId: pendingPrevious?._id
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setIsPreviousCheckoutModalOpen(false);
            setPreviousCheckoutReason('');
            await fetchOverview();
            alert("Previous shift check-out completed. Marked as Absent penalty per company policy. Today's check-in is now unlocked!");
        } catch (error) {
            alert(error.response?.data?.message || "Failed to complete previous checkout");
        }
    };

    const handleLeaveSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/hr/leaves/apply', leaveData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setIsLeaveModalOpen(false);
            setLeaveData({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '' });
            fetchOverview();
            if (activeTab !== 'leaves') {
                setActiveTab('leaves'); // Redirect to leaves tab to see new request
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to apply for leave");
        }
    };

    const handlePermissionSubmit = async (e) => {
        e.preventDefault();
        if (!permissionData.reason.trim()) {
            alert("Please enter a reason for the permission request.");
            return;
        }
        try {
            setIsSubmittingPerm(true);
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/hr/permissions/apply', permissionData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data?.message || `Permission request for ${permissionData.hours} hours submitted successfully!`);
            setIsPermissionModalOpen(false);
            setPermissionData({
                date: new Date().toISOString().split('T')[0],
                hours: 2,
                timeSlot: '10:00 AM - 12:00 PM',
                type: 'Personal Work',
                reason: ''
            });
            await fetchOverview();
        } catch (error) {
            console.error("Error applying permission:", error);
            alert(error.response?.data?.message || "Failed to submit permission request");
        } finally {
            setIsSubmittingPerm(false);
        }
    };

    const isCheckedIn = attendance && attendance.checkInTime;
    const isCheckedOut = attendance && attendance.checkOutTime;

    const calculateDuration = (startTime) => {
        if (!startTime) return "00:00:00";
        const diff = Math.floor((currentTime - new Date(startTime)) / 1000);
        if (diff < 0) return "00:00:00";
        
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard size={18} strokeWidth={1.5} /> },
        { id: 'attendance', name: 'My Attendance', icon: <CalendarClock size={18} strokeWidth={1.5} /> },
        { id: 'leaves', name: 'My Leaves', icon: <Calendar size={18} strokeWidth={1.5} /> },
        { id: 'tasks', name: 'My Tasks', icon: <CheckSquare size={18} strokeWidth={1.5} /> },
        { id: 'project-tasks', name: 'Project Tasks', icon: <ListChecks size={18} strokeWidth={1.5} /> },
    ];

    const employeeToday = currentTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const taskDay = value => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todayTasks = myTasks.filter(task => task.dueDate && taskDay(task.dueDate) === employeeToday);
    const taskSummary = {
        total: todayTasks.length,
        completed: todayTasks.filter(task => task.status === 'Completed').length,
        overdue: pendingTasks.filter(task => task.dueDate && taskDay(task.dueDate) < employeeToday).length
    };
    const openMobileTab = tab => {
        setActiveTab(tab);
        setMobileMenuOpen(false);
    };

    const renderContent = () => {
        switch(activeTab) {
            case 'attendance': return <MyAttendance />;
            case 'leaves': return <MyLeaves />;
            case 'tasks': return <MyTasks initialTaskType="general" />;
            case 'project-tasks': return <MyTasks initialTaskType="project" />;
            default: return (
                <div className="space-y-6">
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes fadeUp {
                            from { opacity: 0; transform: translateY(40px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fade-up {
                            animation: fadeUp 1.2s ease-out forwards;
                            opacity: 0;
                        }
                        .delay-100 { animation-delay: 100ms; }
                        .delay-200 { animation-delay: 200ms; }
                    `}} />
                    
                    {/* ⚠️ HIGH PRIORITY: Unclosed Previous Shift Notification Banner */}
                    {pendingPrevious && (
                        <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-[1.5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-up shadow-sm">
                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 bg-amber-500 text-white rounded-xl mt-0.5 shadow-sm">
                                    <AlertTriangle size={22} className="animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-amber-950">
                                            Action Required: Missed Check-Out from {new Date(pendingPrevious.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                                        </h4>
                                        <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-amber-200 text-amber-900 rounded-full">
                                            Must Complete
                                        </span>
                                    </div>
                                    <p className="text-xs text-amber-900 mt-1.5 max-w-2xl leading-relaxed">
                                        You forgot to check out on your previous shift. Please complete your check-out with work details and reason. 
                                        <span className="font-bold text-rose-700"> Note: Checking out on the next day marks that previous shift as Absent penalty.</span> Once submitted, today's check-in will be unlocked.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPreviousCheckoutModalOpen(true)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                            >
                                Complete Missed Check-Out
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up">
                        {/* Summary Cards - Double Bezel Bento - Primary (Dark Mode) */}
                        <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group cursor-default">
                            <div className="bg-slate-900 text-white rounded-[1.5rem] p-6 shadow-sm group-hover:shadow-lg transition-all h-full relative overflow-hidden">
                                <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider relative z-10">Current Status</h3>
                                <div className="text-3xl font-medium tracking-tight mb-2 relative z-10 group-hover:scale-110 transition-transform origin-left">
                                    {pendingPrevious ? 'Pending Action' : isCheckedOut ? 'Completed' : isCheckedIn ? 'Working' : 'Not Started'}
                                </div>
                                <p className="text-sm text-slate-400 relative z-10">
                                    {pendingPrevious ? `Missed check-out from ${new Date(pendingPrevious.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` :
                                     isCheckedOut ? `Checked out at ${new Date(attendance.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
                                     isCheckedIn ? `Checked in at ${new Date(attendance.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
                                     'Please check in to start your shift'}
                                </p>
                                <div className={`absolute top-6 right-6 px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full z-10 transition-transform group-hover:rotate-12
                                    ${pendingPrevious ? 'bg-amber-500/20 text-amber-300' : isCheckedOut ? 'bg-emerald-500/20 text-emerald-300' : isCheckedIn ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                    {pendingPrevious ? 'Action Req' : isCheckedOut ? 'Done' : isCheckedIn ? 'Active' : 'Pending'}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group cursor-default delay-100 animate-fade-up">
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm group-hover:shadow-lg transition-all h-full">
                                <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Pending Leaves</h3>
                                <div className="text-3xl font-medium text-slate-900 tracking-tight mb-2 group-hover:scale-110 transition-transform origin-left">{leavesCount}</div>
                                <p className="text-sm text-slate-500">Awaiting HR approval</p>
                            </div>
                        </div>
                        
                        <div 
                            onClick={() => setActiveTab('tasks')}
                            className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group cursor-pointer delay-200 animate-fade-up"
                            title="Click to view all tasks"
                        >
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm group-hover:shadow-lg transition-all h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Tasks</h3>
                                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">View →</span>
                                </div>
                                <div className="text-3xl font-medium text-slate-900 tracking-tight mb-2 group-hover:scale-110 transition-transform origin-left">{tasksCount}</div>
                                <p className="text-sm text-slate-500">Pending completion</p>
                            </div>
                        </div>
                    </div>

                    {/* 1. TOP QUICK ACTIONS: TIME CLOCK (CHECK IN / OUT) & TIME OFF REQUEST */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 delay-100 animate-fade-up">
                        {/* Quick Actions - Bento Box Style */}
                        <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group">
                            <div className="bg-white rounded-[1.5rem] flex flex-col justify-between shadow-sm group-hover:shadow-lg transition-all h-full overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100/50">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center">
                                        <Clock size={16} strokeWidth={1.5} className="mr-2 text-slate-400 group-hover:rotate-12 transition-transform" /> Time Clock
                                    </h3>
                                </div>
                                <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                                    {pendingPrevious ? (
                                        <div className="w-full flex flex-col items-center text-center py-2">
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3">
                                                <Clock size={24} strokeWidth={1.5} className="animate-pulse" />
                                            </div>
                                            <div className="text-base font-bold text-slate-900 mb-1">Previous Shift Not Checked Out</div>
                                            <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                                                You did not check out for <span className="font-semibold text-slate-800">{new Date(pendingPrevious.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>. Please complete this check-out to unlock today's shift.
                                            </p>
                                            <button 
                                                onClick={() => setIsPreviousCheckoutModalOpen(true)}
                                                className="w-full flex items-center justify-center px-6 py-3.5 text-sm font-bold rounded-2xl text-white bg-amber-600 hover:bg-amber-700 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] cursor-pointer"
                                            >
                                                <StopCircle size={18} strokeWidth={1.5} className="mr-2" /> Complete Missed Check-Out
                                            </button>
                                        </div>
                                    ) : isCheckedOut ? (
                                        <div className="py-4 text-sm text-slate-500 font-medium">Shift completed for today. Great job!</div>
                                    ) : isCheckedIn ? (
                                        <div className="w-full flex flex-col items-center">
                                            <div className="text-4xl sm:text-5xl font-light tracking-tight text-slate-900 mb-6 tabular-nums relative">
                                                {calculateDuration(attendance.checkInTime)}
                                                <span className="absolute -top-1 -right-3 flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => setIsCheckOutModalOpen(true)} 
                                                className="w-full flex items-center justify-center px-6 py-4 border-2 border-slate-900 text-sm font-medium rounded-2xl text-slate-900 bg-white hover:bg-slate-900 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                                            >
                                                <StopCircle size={18} strokeWidth={1.5} className="mr-2" /> Log Out of Shift
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleCheckIn}
                                            className="w-full flex items-center justify-center px-6 py-4 text-sm font-medium rounded-2xl text-white bg-slate-900 hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] active:translate-y-0 cursor-pointer"
                                        >
                                            <PlayCircle size={18} strokeWidth={1.5} className="mr-2" /> Start Shift
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Request: Leave & Permission */}
                        <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group delay-200 animate-fade-up">
                            <div className="bg-white rounded-[1.5rem] flex flex-col justify-between shadow-sm group-hover:shadow-lg transition-all h-full overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100/50 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center">
                                        <Calendar size={16} strokeWidth={1.5} className="mr-2 text-indigo-600 group-hover:rotate-12 transition-transform" /> Time Off & Permissions
                                    </h3>
                                    {myPermissions.some(p => p.status === 'Pending') && (
                                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full animate-pulse">
                                            {myPermissions.filter(p => p.status === 'Pending').length} Perm Pending
                                        </span>
                                    )}
                                </div>
                                <div className="p-6 flex flex-col justify-between flex-1">
                                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                        Apply for full/multi-day leaves or short 1-4 hour permissions directly to HR for instant approval.
                                    </p>
                                    
                                    {/* Dual Action Buttons */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <button 
                                            onClick={() => setIsLeaveModalOpen(true)}
                                            className="flex items-center justify-center px-4 py-3.5 border-2 border-slate-200 text-xs font-bold rounded-2xl text-slate-800 bg-white hover:border-slate-900 hover:text-slate-900 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                                        >
                                            <Calendar size={16} strokeWidth={1.8} className="mr-2 text-slate-600" /> Request Leave
                                        </button>
                                        <button 
                                            onClick={() => setIsPermissionModalOpen(true)}
                                            className="flex items-center justify-center px-4 py-3.5 border-2 border-indigo-600 text-xs font-bold rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 hover:border-indigo-700 shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
                                        >
                                            <Clock size={16} strokeWidth={1.8} className="mr-2 text-white" /> Request Permission
                                        </button>
                                    </div>

                                    {/* Latest Permission Quick Status if any */}
                                    {myPermissions.length > 0 && (
                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1.5 font-medium truncate">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                                                Latest: {myPermissions[0].hours}h ({myPermissions[0].type}) on {new Date(myPermissions[0].date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                myPermissions[0].status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                myPermissions[0].status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {myPermissions[0].status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. PENDING TASKS SECTION (PLACED BELOW TIME CLOCK) */}
                    <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group animate-fade-up">
                        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm group-hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        <CheckSquare size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                            My Pending Tasks
                                            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                                                {pendingTasks.length} Pending
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                                            Assigned tasks awaiting your action. Click any task to start working or update checklist.
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setActiveTab('tasks')}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto hover:underline cursor-pointer"
                                >
                                    <span>Open Full Task Board</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>

                            {/* Task Grid */}
                            {pendingTasks.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                                    <p className="font-bold text-slate-700">All caught up!</p>
                                    <p className="mt-0.5">No pending tasks assigned right now. Great job!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {pendingTasks.map((task) => (
                                        <div 
                                            key={task._id}
                                            onClick={() => setActiveTab(isProjectChecklistTask(task) ? 'project-tasks' : 'tasks')}
                                            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group/task"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                                        task.priority === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                        task.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                        {task.priority || 'Normal'} Priority
                                                    </span>
                                                    {task.dueDate && (
                                                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                                            <Clock size={11} /> Due: {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-900 group-hover/task:text-indigo-600 transition-colors line-clamp-1">
                                                    {task.title}
                                                </h4>
                                                {(task.webDevProject?.businessName || task.seoProject?.businessName) && (
                                                    <p className="text-[11px] text-slate-500 font-medium mt-1 truncate flex items-center gap-1">
                                                        <span>🏢</span>
                                                        <span>{task.webDevProject?.businessName || task.seoProject?.businessName}</span>
                                                        {task.webDevProject?.websiteType && (
                                                            <span className="text-slate-400 text-[10px]">({task.webDevProject.websiteType})</span>
                                                        )}
                                                    </p>
                                                )}
                                                {task.webDevProject?.checklist && (
                                                    <div className="mt-2 text-[10px] text-slate-400 font-medium">
                                                        Progress: {task.webDevProject.checklist.filter(c => c.status === 'Completed').length} / {task.webDevProject.checklist.length} items completed
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                                <span className="text-slate-500 font-medium">
                                                    Status: <strong className="text-amber-600 font-bold">{task.status || 'Pending'}</strong>
                                                </span>
                                                <span className="text-indigo-600 font-bold group-hover/task:translate-x-1 transition-transform flex items-center gap-0.5">
                                                    Open Task <ChevronRight size={12} />
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
    };

    if (loading && activeTab === 'dashboard') return <div className="min-h-screen flex items-center justify-center text-[#787774] text-sm bg-[#FBFBFA]">Loading workspace...</div>;

    return (
        <div className="employee-portal flex h-screen bg-[#FBFBFA] font-sans text-[#111111]">
            {mobileMenuOpen && <button type="button" className="employee-menu-scrim" aria-label="Close employee menu" onClick={() => setMobileMenuOpen(false)} />}
            {/* Sidebar - Minimalist Editorial with smooth collapse */}
            <aside id="employee-portal-menu" data-mobile-open={mobileMenuOpen} className={`employee-portal-sidebar bg-white border-r border-[#EAEAEA] flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
                isSidebarCollapsed ? 'w-0 border-r-0 opacity-0 pointer-events-none' : 'w-64 opacity-100'
            }`}>
                <div className="w-64 flex flex-col h-full">
                    <div className="h-16 flex items-center justify-between px-6 border-b border-[#EAEAEA]">
                        <div className="flex items-center">
                            <div className="w-6 h-6 bg-[#111111] rounded-[4px] flex items-center justify-center text-white font-bold text-xs mr-3">S</div>
                            <span className="text-sm font-bold tracking-tight">Skite Workspace</span>
                        </div>
                        <button
                            onClick={mobileMenuOpen ? () => setMobileMenuOpen(false) : toggleSidebar}
                            title="Close Sidebar (Ctrl+B)"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <PanelLeftClose size={16} />
                        </button>
                    </div>
                
                <div className="px-4 py-6 flex-1 overflow-y-auto space-y-6">
                    <div>
                        <p className="px-3 text-xs font-semibold text-[#787774] uppercase tracking-wider mb-3">Employee Portal</p>
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => openMobileTab(item.id)}
                                    className={`w-full flex items-center px-3 py-2 text-sm rounded-[4px] transition-colors ${
                                        activeTab === item.id 
                                        ? 'bg-[#F7F6F3] text-[#111111] font-medium' 
                                        : 'text-[#787774] hover:bg-[#F7F6F3] hover:text-[#111111]'
                                    }`}
                                >
                                    <span className="mr-3">{item.icon}</span>
                                    {item.name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Enabled Modules Assigned to this Employee */}
                    {user?.activeModules && user.activeModules.length > 0 && (
                        <div className="pt-4 border-t border-[#EAEAEA]">
                            <p className="px-3 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center">
                                Assigned Modules
                            </p>
                            <nav className="space-y-1">
                                {user.activeModules.includes('sales') && (
                                    <Link
                                        to="/sales"
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[4px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                                    >
                                        <div className="flex items-center">
                                            <Briefcase size={18} strokeWidth={1.5} className="mr-3 text-blue-600" />
                                            <span className="font-medium">Sales & Leads</span>
                                        </div>
                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-blue-500" />
                                    </Link>
                                )}
                                {user.activeModules.includes('dashboard') && (
                                    <Link
                                        to="/dashboard"
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[4px] text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
                                    >
                                        <div className="flex items-center">
                                            <LayoutDashboard size={18} strokeWidth={1.5} className="mr-3 text-indigo-600" />
                                            <span className="font-medium">Overview Stats</span>
                                        </div>
                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-indigo-500" />
                                    </Link>
                                )}
                                {user.activeModules.includes('calendar') && (
                                    <Link
                                        to="/calendar"
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[4px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
                                    >
                                        <div className="flex items-center">
                                            <CalendarDays size={18} strokeWidth={1.5} className="mr-3 text-emerald-600" />
                                            <span className="font-medium">Calendar</span>
                                        </div>
                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-emerald-500" />
                                    </Link>
                                )}
                                {user.activeModules.includes('finance') && (
                                    <>
                                        <Link
                                            to="/finance"
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[4px] text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors group"
                                        >
                                            <div className="flex items-center">
                                                <FileText size={18} strokeWidth={1.5} className="mr-3 text-amber-600" />
                                                <span className="font-medium">Finance</span>
                                            </div>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-amber-500" />
                                        </Link>
                                        <Link
                                            to="/accounts"
                                            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[4px] text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors group"
                                        >
                                            <div className="flex items-center">
                                                <Landmark size={18} strokeWidth={1.5} className="mr-3 text-blue-600" />
                                                <span className="font-medium">Accounts</span>
                                            </div>
                                            <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-orange-500" />
                                        </Link>
                                    </>
                                )}
                                {user.activeModules.includes('hr') && (
                                    <Link
                                        to="/hr"
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[4px] text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors group"
                                    >
                                        <div className="flex items-center">
                                            <CalendarClock size={18} strokeWidth={1.5} className="mr-3 text-purple-600" />
                                            <span className="font-medium">HR Management</span>
                                        </div>
                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-purple-500" />
                                    </Link>
                                )}
                                {user.activeModules.includes('projects') && (
                                    <Link
                                        to="/projects"
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[4px] text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors group"
                                    >
                                        <div className="flex items-center">
                                            <FolderKanban size={18} strokeWidth={1.5} className="mr-3 text-cyan-600" />
                                            <span className="font-medium">Projects</span>
                                        </div>
                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-cyan-500" />
                                    </Link>
                                )}
                            </nav>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-[#EAEAEA]">
                    <div className="flex items-center space-x-3 px-3 py-2 mb-2 bg-[#F7F6F3] rounded-[6px]">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                            {user?.name?.charAt(0) || 'E'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-[#111111] truncate">{user?.name || 'Employee'}</p>
                            <p className="text-[10px] font-semibold text-blue-600 truncate">{user?.role || 'Employee'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center px-3 py-2 text-sm text-[#9F2F2D] hover:bg-[#FDEBEC] rounded-[4px] transition-colors cursor-pointer"
                    >
                        <LogOut size={18} strokeWidth={1.5} className="mr-3" />
                        Log out
                    </button>
                </div>
            </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
            <header className={`employee-portal-header h-16 bg-white border-b border-[#EAEAEA] flex items-center justify-between px-6 shrink-0 ${activeTab === 'dashboard' ? 'employee-portal-home-header' : ''}`}>
                <div className="flex items-center space-x-3">
                    <button
                            onClick={toggleSidebar}
                        title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
                            className="employee-desktop-toggle p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border border-[#EAEAEA] active:scale-95"
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                    <h1 className="text-lg font-medium text-[#111111] capitalize">
                        {activeTab.replace('-', ' ')}
                    </h1>
                </div>
                    <div className="text-sm font-medium text-[#787774]">
                        {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        <span className="mx-2">·</span>
                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </header>

                <main className="employee-portal-content flex-1 overflow-y-auto overflow-x-hidden p-8">
                    <div className="max-w-5xl mx-auto">
                        {activeTab === 'dashboard' && (
                            <EmployeeMobileHome name={user?.name} now={currentTime} attendance={attendance}
                                shift={shift} pendingPrevious={pendingPrevious} duration={calculateDuration(attendance?.checkInTime)}
                                taskSummary={taskSummary} followUps={myFollowUps} salesEnabled={salesEnabled}
                                loading={loading} onOpenProfile={() => setMobileMenuOpen(true)}
                                onCheckIn={handleCheckIn} onCheckOut={() => setIsCheckOutModalOpen(true)}
                                onMissedCheckOut={() => setIsPreviousCheckoutModalOpen(true)} />
                        )}
                        {activeTab === 'dashboard' ? (
                            <details className="employee-overview-disclosure" open>
                                <summary>Attendance, requests and assigned work</summary>
                                {renderContent()}
                            </details>
                        ) : renderContent()}
                    </div>
                </main>
            </div>

            <nav className="employee-bottom-nav" aria-label="Employee navigation">
                <button type="button" aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => openMobileTab('dashboard')}>Home</button>
                {salesEnabled && <Link to="/sales">Leads</Link>}
                <button type="button" aria-current={activeTab === 'tasks' ? 'page' : undefined} onClick={() => openMobileTab('tasks')}>Tasks</button>
                <button type="button" aria-controls="employee-portal-menu" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(open => !open)}>Me</button>
            </nav>

            {/* Modals - Minimalist Style */}
            {/* Modal for Missed Previous Day Checkout */}
            {isPreviousCheckoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsPreviousCheckoutModalOpen(false)}></div>
                    <div className="relative z-10 w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-fade-up">
                        <div className="bg-amber-600 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle size={20} />
                                <h3 className="text-base font-bold">Missed Shift Check-Out</h3>
                            </div>
                            <button 
                                onClick={() => setIsPreviousCheckoutModalOpen(false)} 
                                className="text-amber-100 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed">
                                <p className="font-bold mb-1">⚠️ Attendance Policy Penalty Notice:</p>
                                <p>
                                    You checked in on <strong>{new Date(pendingPrevious?.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong> but did not check out at the end of that day. Because you are checking out today, this shift will be recorded as <strong className="text-rose-900 underline">Absent</strong> in your attendance history.
                                </p>
                            </div>
                            <form id="previousCheckOutForm" onSubmit={handlePreviousCheckOutSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Shift Date & Check-in Time
                                    </label>
                                    <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 font-medium">
                                        {new Date(pendingPrevious?.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                        {' · Checked in at '}
                                        {pendingPrevious?.checkInTime ? new Date(pendingPrevious.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Description / Reason for Missed Checkout <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows="4"
                                        placeholder="Briefly describe what tasks you worked on and why you forgot to checkout yesterday..."
                                        value={previousCheckoutReason}
                                        onChange={(e) => setPreviousCheckoutReason(e.target.value)}
                                        className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 resize-none bg-slate-50/50"
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setIsPreviousCheckoutModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="previousCheckOutForm"
                                className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-transform active:scale-[0.98] shadow-sm cursor-pointer"
                            >
                                Submit Checkout & Unlock Today
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCheckOutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsCheckOutModalOpen(false)}></div>
                    <div className="relative z-10 w-full max-w-md bg-white border border-[#EAEAEA] rounded-[6px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-[#111111] mb-1">End of Day Report</h3>
                            <p className="text-sm text-[#787774] mb-4">Please log your completed tasks for today.</p>
                            
                            <form id="checkOutForm" onSubmit={handleCheckOutSubmit}>
                                <textarea 
                                    required 
                                    rows="4" 
                                    placeholder="Briefly describe what you worked on..." 
                                    value={taskDescription} 
                                    onChange={(e) => setTaskDescription(e.target.value)} 
                                    className="w-full text-sm border border-[#EAEAEA] rounded-[4px] p-3 focus:outline-none focus:border-[#111111] resize-none bg-[#FBFBFA]"
                                ></textarea>
                            </form>
                        </div>
                        <div className="border-t border-[#EAEAEA] bg-[#F9F9F8] px-6 py-4 flex justify-end space-x-3">
                            <button type="button" onClick={() => setIsCheckOutModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#787774] hover:text-[#111111] transition-colors">Cancel</button>
                            <button type="submit" form="checkOutForm" className="px-4 py-2 text-sm font-medium text-white bg-[#111111] rounded-[4px] hover:bg-[#333333] transition-transform active:scale-[0.98]">Confirm Checkout</button>
                        </div>
                    </div>
                </div>
            )}

            {isLeaveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm" onClick={() => setIsLeaveModalOpen(false)}></div>
                    <div className="relative z-10 w-full max-w-md bg-white border border-[#EAEAEA] rounded-[6px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-[#111111] mb-1">Request Time Off</h3>
                            <p className="text-sm text-[#787774] mb-4">Submit a new leave request to your manager.</p>
                            
                            <form id="leaveForm" onSubmit={handleLeaveSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#787774] uppercase tracking-wider mb-1">Leave Type</label>
                                    <select 
                                        required 
                                        value={leaveData.leaveType} 
                                        onChange={(e) => setLeaveData({...leaveData, leaveType: e.target.value})} 
                                        className="w-full text-sm border border-[#EAEAEA] rounded-[4px] p-2.5 focus:outline-none focus:border-[#111111] bg-[#FBFBFA]"
                                    >
                                        <option value="Casual Leave">Casual Leave</option>
                                        <option value="Sick Leave">Sick Leave</option>
                                        <option value="Earned Leave">Earned Leave</option>
                                        <option value="Unpaid Leave">Unpaid Leave</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#787774] uppercase tracking-wider mb-1">Start Date</label>
                                        <input type="date" required value={leaveData.startDate} onChange={(e) => setLeaveData({...leaveData, startDate: e.target.value})} className="w-full text-sm border border-[#EAEAEA] rounded-[4px] p-2.5 focus:outline-none focus:border-[#111111] bg-[#FBFBFA]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#787774] uppercase tracking-wider mb-1">End Date</label>
                                        <input type="date" required value={leaveData.endDate} onChange={(e) => setLeaveData({...leaveData, endDate: e.target.value})} className="w-full text-sm border border-[#EAEAEA] rounded-[4px] p-2.5 focus:outline-none focus:border-[#111111] bg-[#FBFBFA]" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#787774] uppercase tracking-wider mb-1">Reason</label>
                                    <textarea required rows="2" placeholder="Explain briefly..." value={leaveData.reason} onChange={(e) => setLeaveData({...leaveData, reason: e.target.value})} className="w-full text-sm border border-[#EAEAEA] rounded-[4px] p-2.5 focus:outline-none focus:border-[#111111] resize-none bg-[#FBFBFA]"></textarea>
                                </div>
                            </form>
                        </div>
                        <div className="border-t border-[#EAEAEA] bg-[#F9F9F8] px-6 py-4 flex justify-end space-x-3">
                            <button type="button" onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#787774] hover:text-[#111111] transition-colors">Cancel</button>
                            <button type="submit" form="leaveForm" className="px-4 py-2 text-sm font-medium text-white bg-[#111111] rounded-[4px] hover:bg-[#333333] transition-transform active:scale-[0.98]">Submit Request</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Request Modal */}
            {isPermissionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsPermissionModalOpen(false)}></div>
                    <div className="relative z-10 w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-fade-up">
                        {/* Header */}
                        <div className="px-6 py-5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border-b border-indigo-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-sm">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Request Permission</h3>
                                    <p className="text-xs text-slate-500 font-medium">Apply for short duration permission (1-4 hours) during your shift.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsPermissionModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form id="permissionForm" onSubmit={handlePermissionSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Date */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Permission Date <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    required 
                                    value={permissionData.date} 
                                    onChange={(e) => setPermissionData({ ...permissionData, date: e.target.value })} 
                                    className="w-full text-xs font-bold border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 bg-slate-50/50" 
                                />
                            </div>

                            {/* Duration / Hours Chips */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Duration (Hours) <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {[1, 2, 3, 4].map((h) => (
                                        <button
                                            type="button"
                                            key={h}
                                            onClick={() => setPermissionData({ ...permissionData, hours: h })}
                                            className={`py-2.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                                                permissionData.hours === h
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            {h} {h === 1 ? 'Hour' : 'Hours'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Slot */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Preferred Time Slot (e.g. 10:00 AM - 12:00 PM)
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {[
                                        '10:00 AM - 12:00 PM',
                                        '02:00 PM - 04:00 PM',
                                        '04:00 PM - 06:00 PM'
                                    ].map((slot) => (
                                        <button
                                            type="button"
                                            key={slot}
                                            onClick={() => setPermissionData({ ...permissionData, timeSlot: slot })}
                                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                                                permissionData.timeSlot === slot
                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Or type custom time (e.g. 11:30 AM to 01:30 PM)"
                                    value={permissionData.timeSlot} 
                                    onChange={(e) => setPermissionData({ ...permissionData, timeSlot: e.target.value })} 
                                    className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 bg-slate-50/50" 
                                />
                            </div>

                            {/* Permission Type */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Permission Type
                                </label>
                                <select 
                                    value={permissionData.type} 
                                    onChange={(e) => setPermissionData({ ...permissionData, type: e.target.value })} 
                                    className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 bg-slate-50/50 cursor-pointer"
                                >
                                    <option value="Personal Work">Personal Work</option>
                                    <option value="Late Coming">Late Coming</option>
                                    <option value="Early Leaving">Early Leaving</option>
                                    <option value="During Shift">During Shift</option>
                                    <option value="Medical / Emergency">Medical / Emergency</option>
                                </select>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Reason / Description <span className="text-rose-500">*</span>
                                </label>
                                <textarea 
                                    required 
                                    rows="3" 
                                    placeholder="Explain why you need this permission (e.g., Bank visit, hospital consultation, urgent personal work)..." 
                                    value={permissionData.reason} 
                                    onChange={(e) => setPermissionData({ ...permissionData, reason: e.target.value })} 
                                    className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 resize-none bg-slate-50/50"
                                ></textarea>
                            </div>

                            {/* Previous Submissions List inside modal if any */}
                            {myPermissions.length > 0 && (
                                <div className="pt-3 border-t border-slate-100">
                                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">My Recent Permissions</h4>
                                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                        {myPermissions.slice(0, 3).map((p) => (
                                            <div key={p._id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-bold text-slate-900">{p.hours}h ({p.type})</span>
                                                    <span className="text-slate-400 text-[11px] ml-1.5">
                                                        {new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    p.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                                    p.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Footer */}
                        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">HR approval required</span>
                            <div className="flex space-x-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsPermissionModalOpen(false)} 
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    form="permissionForm" 
                                    disabled={isSubmittingPerm}
                                    className="px-5 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmittingPerm ? 'Submitting...' : 'Submit Permission Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}






