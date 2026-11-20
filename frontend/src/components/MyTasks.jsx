import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    CheckSquare, 
    CheckCircle2, 
    Clock, 
    Calendar, 
    Building2, 
    User, 
    Sparkles, 
    Filter, 
    Send, 
    FileText, 
    Video, 
    Palette, 
    AlertCircle,
    Check,
    ChevronDown,
    ChevronUp,
    Globe,
    Search,
    ListChecks,
    ExternalLink,
    Layers
} from 'lucide-react';

const formatTo12HourString = (str) => {
    if (!str) return '';
    return str.split('-').map(part => {
        const trimmed = part.trim();
        if (!trimmed || trimmed === '-') return '';
        if (trimmed.includes('AM') || trimmed.includes('PM') || trimmed.includes('am') || trimmed.includes('pm')) return trimmed;
        const sub = trimmed.split(':');
        if (sub.length >= 2) {
            let hour = parseInt(sub[0], 10);
            const minute = sub[1].slice(0, 2);
            if (isNaN(hour)) return trimmed;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12 || 12;
            return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
        }
        return trimmed;
    }).filter(Boolean).join(' - ');
};

const formatDateClean = (d) => {
    if (!d) return '-';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const parseTaskDetails = (task) => {
    const desc = task.description || '';
    const lines = desc.split('\n').map(l => l.trim()).filter(Boolean);
    
    const parsed = {
        businessName: task.webDevProject?.businessName || task.seoProject?.businessName || '',
        clientContact: '',
        stage: '',
        targetDate: '',
        time: '',
        instructions: '',
        rawRemaining: []
    };

    // Attempt to extract business name and contact from title if bracketed: e.g. [Trading (Bala)] or [Trading]
    const titleMatch = (task.title || '').match(/\[(.*?)\]/);
    if (titleMatch) {
        const inside = titleMatch[1];
        if (inside.includes('(') && inside.includes(')')) {
            const b = inside.split('(')[0].trim();
            const c = inside.split('(')[1].replace(')', '').trim();
            if (!parsed.businessName) parsed.businessName = b;
            parsed.clientContact = c;
        } else if (inside.includes('-')) {
            const parts = inside.split('-');
            if (!parsed.businessName) parsed.businessName = parts[0].trim();
            parsed.clientContact = parts[1].trim();
        } else if (!parsed.businessName && inside !== 'Web Dev' && inside !== 'SEO Project' && inside !== 'Script') {
            parsed.businessName = inside.trim();
        }
    }

    lines.forEach(line => {
        if (/^Business Name:/i.test(line)) {
            parsed.businessName = line.replace(/^Business Name:/i, '').trim();
        } else if (/^Client Contact( Name)?:/i.test(line)) {
            parsed.clientContact = line.replace(/^Client Contact( Name)?:/i, '').trim();
        } else if (/^Client:/i.test(line)) {
            const val = line.replace(/^Client:/i, '').trim();
            if (!parsed.businessName) parsed.businessName = val;
        } else if (/^Stage:/i.test(line)) {
            parsed.stage = line.replace(/^Stage:/i, '').trim();
        } else if (/^Target Date:/i.test(line)) {
            const dVal = line.replace(/^Target Date:/i, '').trim();
            parsed.targetDate = dVal && dVal !== '-' ? formatDateClean(dVal) : '';
        } else if (/^Time:/i.test(line)) {
            const tVal = line.replace(/^Time:/i, '').trim();
            parsed.time = tVal && tVal !== '-' ? formatTo12HourString(tVal) : '';
        } else if (/^Details & Instructions:/i.test(line)) {
            parsed.instructions = line.replace(/^Details & Instructions:/i, '').trim();
        } else {
            parsed.rawRemaining.push(line);
        }
    });

    if (!parsed.targetDate && task.dueDate) {
        parsed.targetDate = formatDateClean(task.dueDate);
    }

    return parsed;
};

const getStageBadge = (stage) => {
    switch ((stage || '').toLowerCase()) {
        case 'script':
            return {
                label: 'Script Writing',
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
                icon: <FileText size={12} className="mr-1 text-blue-600" />
            };
        case 'shoot':
            return {
                label: 'Video Shooting',
                bg: 'bg-purple-50 text-purple-700 border-purple-200',
                icon: <Video size={12} className="mr-1 text-purple-600" />
            };
        case 'edit':
            return {
                label: 'Video Editing',
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: <Palette size={12} className="mr-1 text-amber-600" />
            };
        case 'post':
        case 'postschedule':
            return {
                label: 'Social Publishing',
                bg: 'bg-orange-50 text-orange-700 border-orange-200',
                icon: <Send size={12} className="mr-1 text-orange-600" />
            };
        default:
            return stage ? {
                label: stage,
                bg: 'bg-slate-100 text-slate-700 border-slate-200',
                icon: <Sparkles size={12} className="mr-1 text-slate-500" />
            } : null;
    }
};

const isProjectChecklistTask = (task) => {
    if (!task) return false;
    // A project checklist task MUST actually have milestone checklist items
    if (task.webDevProject && Array.isArray(task.webDevProject.checklist) && task.webDevProject.checklist.length > 0) return true;
    if (task.seoProject && Array.isArray(task.seoProject.checklist) && task.seoProject.checklist.length > 0) return true;
    return false;
};

export default function MyTasks({ initialTaskType = 'general' }) {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [taskTypeTab, setTaskTypeTab] = useState(initialTaskType || 'general'); // 'general' | 'project'
    const [filterTab, setFilterTab] = useState('All'); // 'All', 'Pending', 'Completed'
    
    // Collapsible checklist states (keyed by taskId)
    const [expandedChecklists, setExpandedChecklists] = useState({});
    
    // SEO Category filter states (keyed by taskId)
    const [seoCategoryMap, setSeoCategoryMap] = useState({});

    useEffect(() => {
        if (initialTaskType) {
            setTaskTypeTab(initialTaskType);
        }
    }, [initialTaskType]);

    const fetchTasks = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/hr/tasks/my-tasks', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setTasks(res.data);
            
            // Default all checklists to expanded
            const initExpand = {};
            (res.data || []).forEach(t => {
                if (t.webDevProject || t.seoProject) {
                    initExpand[t._id] = true;
                }
            });
            setExpandedChecklists(prev => ({ ...initExpand, ...prev }));
        } catch (error) {
            console.error("Error fetching tasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const toggleExpand = (taskId) => {
        setExpandedChecklists(prev => ({
            ...prev,
            [taskId]: prev[taskId] === undefined ? false : !prev[taskId]
        }));
    };

    const setSeoCategory = (taskId, category) => {
        setSeoCategoryMap(prev => ({
            ...prev,
            [taskId]: category
        }));
    };

    const markTaskCompleted = async (taskId) => {
        try {
            // Optimistic update
            setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'Completed' } : t));
            if (!String(taskId).startsWith('web_') && !String(taskId).startsWith('seo_')) {
                await axios.put(`http://localhost:5000/api/hr/tasks/${taskId}/status`, { status: 'Completed' }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            }
            fetchTasks();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to update task");
            fetchTasks();
        }
    };

    // Web Dev Checklist Item Toggle Handler
    const handleToggleWebChecklist = async (taskId, projectId, itemId) => {
        setTasks(prev => prev.map(t => {
            if (t._id === taskId && t.webDevProject && String(t.webDevProject._id) === String(projectId)) {
                const nextChecklist = (t.webDevProject.checklist || []).map(c => {
                    if (String(c._id) === String(itemId)) {
                        return { ...c, status: c.status === 'Completed' ? 'Pending' : 'Completed' };
                    }
                    return c;
                });
                const allDone = nextChecklist.length > 0 && nextChecklist.every(c => c.status === 'Completed');
                return {
                    ...t,
                    status: allDone ? 'Completed' : (t.status === 'Completed' ? 'Pending' : t.status),
                    webDevProject: {
                        ...t.webDevProject,
                        checklist: nextChecklist
                    }
                };
            }
            return t;
        }));

        try {
            await axios.put(`http://localhost:5000/api/team-management/webdev/${projectId}/checklist/${itemId}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (error) {
            console.error("Error toggling Web Dev checklist item", error);
            fetchTasks();
        }
    };

    // Web Dev Requirement Status Toggle Handler
    const handleToggleWebRequirement = async (taskId, projectId, reqId, currentStatus) => {
        const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
        setTasks(prev => prev.map(t => {
            if (t._id === taskId && t.webDevProject && String(t.webDevProject._id) === String(projectId)) {
                const nextReqs = (t.webDevProject.requirements || []).map(r => {
                    if (String(r._id) === String(reqId)) {
                        return { ...r, status: nextStatus };
                    }
                    return r;
                });
                return {
                    ...t,
                    webDevProject: {
                        ...t.webDevProject,
                        requirements: nextReqs
                    }
                };
            }
            return t;
        }));

        try {
            await axios.put(`http://localhost:5000/api/team-management/webdev/${projectId}/requirements/${reqId}`, { status: nextStatus }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (error) {
            console.error("Error updating web requirement", error);
            fetchTasks();
        }
    };

    // SEO Checklist Item Toggle Handler
    const handleToggleSeoChecklist = async (taskId, projectId, itemId) => {
        setTasks(prev => prev.map(t => {
            if (t._id === taskId && t.seoProject && String(t.seoProject._id) === String(projectId)) {
                const nextChecklist = (t.seoProject.checklist || []).map(c => {
                    if (String(c._id) === String(itemId)) {
                        return { ...c, isCompleted: !c.isCompleted };
                    }
                    return c;
                });
                const allDone = nextChecklist.length > 0 && nextChecklist.every(c => c.isCompleted);
                return {
                    ...t,
                    status: allDone ? 'Completed' : (t.status === 'Completed' ? 'Pending' : t.status),
                    seoProject: {
                        ...t.seoProject,
                        checklist: nextChecklist
                    }
                };
            }
            return t;
        }));

        try {
            await axios.put(`http://localhost:5000/api/team-management/seo/${projectId}/checklist/${itemId}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (error) {
            console.error("Error toggling SEO checklist item", error);
            fetchTasks();
        }
    };

    // SEO Custom Task Status Toggle Handler
    const handleToggleSeoCustomTask = async (taskId, projectId, customTaskId, currentStatus) => {
        const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
        setTasks(prev => prev.map(t => {
            if (t._id === taskId && t.seoProject && String(t.seoProject._id) === String(projectId)) {
                const nextTasks = (t.seoProject.customTasks || []).map(ct => {
                    if (String(ct._id) === String(customTaskId)) {
                        return { ...ct, status: nextStatus };
                    }
                    return ct;
                });
                return {
                    ...t,
                    seoProject: {
                        ...t.seoProject,
                        customTasks: nextTasks
                    }
                };
            }
            return t;
        }));

        try {
            await axios.put(`http://localhost:5000/api/team-management/seo/${projectId}/custom-tasks/${customTaskId}`, { status: nextStatus }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (error) {
            console.error("Error updating custom SEO task", error);
            fetchTasks();
        }
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-400 font-medium text-sm flex items-center justify-center space-x-2">
                <Clock className="animate-spin text-orange-500" size={18} />
                <span>Loading your workspace tasks...</span>
            </div>
        );
    }

    // Separate into General Tasks and Project Tasks (with checklists)
    const projectTasks = tasks.filter(isProjectChecklistTask);
    const generalTasks = tasks.filter(t => !isProjectChecklistTask(t));

    const generalPendingCount = generalTasks.filter(t => t.status !== 'Completed').length;
    const generalCompletedCount = generalTasks.filter(t => t.status === 'Completed').length;

    const projectPendingCount = projectTasks.filter(t => t.status !== 'Completed').length;
    const projectCompletedCount = projectTasks.filter(t => t.status === 'Completed').length;

    const activePool = taskTypeTab === 'project' ? projectTasks : generalTasks;
    const activeTotalCount = activePool.length;
    const activePendingCount = taskTypeTab === 'project' ? projectPendingCount : generalPendingCount;
    const activeCompletedCount = taskTypeTab === 'project' ? projectCompletedCount : generalCompletedCount;

    const filteredTasks = activePool.filter(task => {
        if (filterTab === 'Pending') return task.status !== 'Completed';
        if (filterTab === 'Completed') return task.status === 'Completed';
        return true;
    }).sort((a, b) => {
        const aPending = a.status !== 'Completed';
        const bPending = b.status !== 'Completed';
        
        // 1. Pending tasks ALWAYS appear on top!
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;

        // 2. High priority first
        const priorityWeight = { 'High': 3, 'Medium': 2, 'Normal': 2, 'Low': 1 };
        const weightA = priorityWeight[a.priority] || 2;
        const weightB = priorityWeight[b.priority] || 2;
        if (weightA !== weightB) return weightB - weightA;

        // 3. Newest / due date
        const timeA = new Date(a.dueDate || a.createdAt || 0).getTime();
        const timeB = new Date(b.dueDate || b.createdAt || 0).getTime();
        return timeB - timeA;
    });

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Primary Task Type Switcher: General Tasks vs Project Tasks */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-xl text-xs sm:text-sm font-semibold">
                    <button
                        type="button"
                        onClick={() => { setTaskTypeTab('general'); setFilterTab('All'); }}
                        className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                            taskTypeTab === 'general'
                                ? 'bg-white text-slate-900 shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        <CheckSquare size={16} className={taskTypeTab === 'general' ? 'text-orange-500' : 'text-slate-400'} />
                        <span>General Tasks</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            taskTypeTab === 'general' ? 'bg-orange-100 text-orange-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {generalTasks.length}
                        </span>
                        {generalPendingCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setTaskTypeTab('project'); setFilterTab('All'); }}
                        className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                            taskTypeTab === 'project'
                                ? 'bg-white text-slate-900 shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        <ListChecks size={16} className={taskTypeTab === 'project' ? 'text-blue-600' : 'text-slate-400'} />
                        <span>Project Tasks (Checklists)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            taskTypeTab === 'project' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                            {projectTasks.length}
                        </span>
                        {projectPendingCount > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        )}
                    </button>
                </div>

                <div className="text-xs text-slate-500 px-2 font-medium flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>
                        {taskTypeTab === 'project'
                            ? `${projectPendingCount} active checklist project${projectPendingCount === 1 ? '' : 's'}`
                            : `${generalPendingCount} pending general task${generalPendingCount === 1 ? '' : 's'}`
                        }
                    </span>
                </div>
            </div>

            {/* Header with Quick Navigation Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2.5">
                        <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold shadow-xs ${
                            taskTypeTab === 'project' ? 'bg-blue-600' : 'bg-orange-500'
                        }`}>
                            {taskTypeTab === 'project' ? <ListChecks size={18} /> : <CheckSquare size={18} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                {taskTypeTab === 'project' ? 'Project Tasks (Checklists)' : 'General Assigned Tasks'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {taskTypeTab === 'project'
                                    ? (projectPendingCount === 0 ? "All project milestone checklists are completed!" : `You have ${projectPendingCount} active project checklist task${projectPendingCount > 1 ? 's' : ''}.`)
                                    : (generalPendingCount === 0 ? "All caught up! No pending general tasks." : `You have ${generalPendingCount} pending general task${generalPendingCount > 1 ? 's' : ''} to complete.`)
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center bg-slate-100/80 p-1 rounded-xl text-xs font-semibold space-x-1">
                    <button
                        onClick={() => setFilterTab('All')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            filterTab === 'All'
                                ? 'bg-white text-slate-900 shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        All ({activeTotalCount})
                    </button>
                    <button
                        onClick={() => setFilterTab('Pending')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            filterTab === 'Pending'
                                ? `bg-white ${taskTypeTab === 'project' ? 'text-blue-600' : 'text-orange-600'} shadow-xs font-bold`
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Pending ({activePendingCount})
                    </button>
                    <button
                        onClick={() => setFilterTab('Completed')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            filterTab === 'Completed'
                                ? 'bg-white text-emerald-600 shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Completed ({activeCompletedCount})
                    </button>
                </div>
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 mx-auto flex items-center justify-center">
                        {taskTypeTab === 'project' ? <ListChecks size={22} /> : <CheckSquare size={22} />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                        No {filterTab !== 'All' ? filterTab.toLowerCase() : ''} {taskTypeTab === 'project' ? 'project checklist' : 'general'} tasks found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        {filterTab === 'Pending' 
                            ? (taskTypeTab === 'project' ? 'Great job! All project milestone checklists have been completed.' : 'Great job! You have completed all your general assigned tasks.')
                            : (taskTypeTab === 'project' ? 'Projects with milestone checklists assigned to you will appear right here.' : 'Tasks assigned to you by administrators or team managers will appear right here.')
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTasks.map((task) => {
                        const isCompleted = task.status === 'Completed';
                        const details = parseTaskDetails(task);
                        const stageBadge = getStageBadge(details.stage);
                        const isExpanded = expandedChecklists[task._id] !== false; // Default expanded

                        // Web Dev checklist stats
                        const webChecklist = task.webDevProject?.checklist || [];
                        const completedWebCount = webChecklist.filter(c => c.status === 'Completed').length;
                        const totalWebCount = webChecklist.length;
                        const webProgress = totalWebCount > 0 ? Math.round((completedWebCount / totalWebCount) * 100) : 0;

                        // SEO checklist stats
                        const seoChecklist = task.seoProject?.checklist || [];
                        const completedSeoCount = seoChecklist.filter(c => c.isCompleted).length;
                        const totalSeoCount = seoChecklist.length;
                        const seoProgress = totalSeoCount > 0 ? Math.round((completedSeoCount / totalSeoCount) * 100) : 0;

                        return (
                            <div 
                                key={task._id} 
                                className={`p-1.5 rounded-[1.8rem] transition-all ${
                                    isCompleted 
                                        ? 'bg-slate-100/60 border border-slate-200/50 opacity-90' 
                                        : 'bg-slate-50/80 border border-slate-200/80 hover:border-orange-200'
                                }`}
                            >
                                <div className="bg-white rounded-[1.4rem] p-5 shadow-xs hover:shadow-md transition-all space-y-4">
                                    {/* Top Row: Title, Priority, Status */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-start space-x-3">
                                            <button
                                                onClick={() => !isCompleted && markTaskCompleted(task._id)}
                                                disabled={isCompleted}
                                                title={isCompleted ? "Task Completed" : "Click to mark complete"}
                                                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                                    isCompleted 
                                                        ? 'bg-emerald-500 border-emerald-500 text-white cursor-default' 
                                                        : 'border-slate-300 hover:border-orange-500 hover:bg-orange-50 cursor-pointer'
                                                }`}
                                            >
                                                {isCompleted && <Check size={13} strokeWidth={3} />}
                                            </button>

                                            <div>
                                                <h3 className={`text-sm sm:text-base font-bold ${
                                                    isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                                                }`}>
                                                    {task.title}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
                                            {/* Priority Pill */}
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                task.priority === 'High' 
                                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                                    : task.priority === 'Low' 
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>
                                                {task.priority || 'Normal'} Priority
                                            </span>

                                            {/* Status Badge */}
                                            {isCompleted ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 size={12} className="mr-1 text-emerald-600" /> Completed
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span> Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Structured Metadata Badges Strip */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                                        {/* Business Name Pill */}
                                        {details.businessName && (
                                            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xs">
                                                <Building2 size={13} className="mr-1.5 text-orange-400" />
                                                <span>{details.businessName}</span>
                                            </div>
                                        )}

                                        {/* Client Contact Name Pill */}
                                        {details.clientContact && (
                                            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-semibold">
                                                <User size={13} className="mr-1.5 text-indigo-600" />
                                                <span>{details.clientContact}</span>
                                            </div>
                                        )}

                                        {/* Web Dev Website Link */}
                                        {task.webDevProject?.website && (
                                            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                                                <Globe size={13} className="mr-1.5 text-blue-600" />
                                                <span>{task.webDevProject.website}</span>
                                            </div>
                                        )}

                                        {/* SEO Website Link */}
                                        {task.seoProject?.website && (
                                            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                                                <Globe size={13} className="mr-1.5 text-emerald-600" />
                                                <span>{task.seoProject.website}</span>
                                            </div>
                                        )}

                                        {/* Stage Badge */}
                                        {stageBadge && (
                                            <div className={`inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${stageBadge.bg}`}>
                                                {stageBadge.icon}
                                                <span>{stageBadge.label}</span>
                                            </div>
                                        )}

                                        {/* Target Date Pill */}
                                        {details.targetDate && (
                                            <div className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-medium">
                                                <Calendar size={13} className="mr-1.5 text-slate-500" />
                                                <span>Target: <strong className="text-slate-900">{details.targetDate}</strong></span>
                                            </div>
                                        )}

                                        {/* Post / Target Time Pill (12-Hour AM/PM) */}
                                        {details.time && (
                                            <div className="inline-flex items-center px-2.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200/80 text-orange-800 text-xs font-semibold">
                                                <Clock size={13} className="mr-1.5 text-orange-600" />
                                                <span>Time: <strong className="text-orange-950 font-bold">{details.time}</strong></span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Instructions & Details Box */}
                                    {details.instructions && (
                                        <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl p-3 text-xs space-y-1">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                                                <FileText size={12} className="text-slate-400" />
                                                <span>Details & Instructions</span>
                                            </div>
                                            <p className="text-slate-800 font-medium whitespace-pre-line pl-0.5">
                                                {details.instructions}
                                            </p>
                                        </div>
                                    )}

                                    {/* Fallback for unparsed raw description if exists (only if no web/seo project) */}
                                    {!task.webDevProject && !task.seoProject && details.rawRemaining.length > 0 && (
                                        <div className="text-xs text-slate-500 whitespace-pre-line">
                                            {details.rawRemaining.join('\n')}
                                        </div>
                                    )}

                                    {/* =========================================================================
                                        1. WEB DEVELOPMENT MILESTONE CHECKLIST (INTERACTIVE)
                                       ========================================================================= */}
                                    {taskTypeTab === 'project' && task.webDevProject && totalWebCount > 0 && (
                                        <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-4 space-y-3.5">
                                            {/* Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                                                <div className="flex items-center space-x-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                                                        <Globe size={15} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                                                {task.webDevProject.websiteType || 'Web Dev'} Milestone Checklist
                                                            </h4>
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                                {task.webDevProject.websiteType || 'Development'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500">
                                                            Click each item as you complete it. Admin Team Management syncs in real time.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 self-start sm:self-auto">
                                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        {completedWebCount} / {totalWebCount} Completed ({webProgress}%)
                                                    </span>
                                                    <button
                                                        onClick={() => toggleExpand(task._id)}
                                                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                                        title={isExpanded ? "Collapse checklist" : "Expand checklist"}
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                                                    style={{ width: `${webProgress}%` }}
                                                />
                                            </div>

                                            {/* Checklist Items Grid */}
                                            {isExpanded && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                                    {task.webDevProject.checklist.map((item) => {
                                                        const isItemDone = item.status === 'Completed';
                                                        return (
                                                            <div
                                                                key={item._id}
                                                                onClick={() => handleToggleWebChecklist(task._id, task.webDevProject._id, item._id)}
                                                                className={`p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all select-none ${
                                                                    isItemDone
                                                                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-2xs'
                                                                        : 'bg-white border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/20 text-slate-800 shadow-2xs'
                                                                }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                                                    isItemDone ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                                                }`}>
                                                                    {isItemDone && <Check size={11} strokeWidth={3} />}
                                                                </div>
                                                                <span className={`text-xs font-semibold leading-tight ${
                                                                    isItemDone ? 'line-through text-emerald-800/70' : 'text-slate-800'
                                                                }`}>
                                                                    {item.item}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Requirements & Client Changes (if any assigned) */}
                                            {task.webDevProject.requirements && task.webDevProject.requirements.length > 0 && (
                                                <div className="pt-2 border-t border-slate-200/70 space-y-2">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                                                        <Layers size={12} className="text-blue-500" />
                                                        <span>Client Requirements & Changes ({task.webDevProject.requirements.length})</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {task.webDevProject.requirements.map(reqItem => {
                                                            const isReqDone = reqItem.status === 'Completed';
                                                            return (
                                                                <div 
                                                                    key={reqItem._id}
                                                                    onClick={() => handleToggleWebRequirement(task._id, task.webDevProject._id, reqItem._id, reqItem.status)}
                                                                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                                        isReqDone 
                                                                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                                                                            : 'bg-white border-slate-200 text-slate-800 hover:border-blue-300'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center space-x-2.5">
                                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                                                            isReqDone ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                                                        }`}>
                                                                            {isReqDone && <Check size={11} strokeWidth={3} />}
                                                                        </div>
                                                                        <div>
                                                                            <span className={`text-xs font-semibold ${isReqDone ? 'line-through text-emerald-800/70' : ''}`}>
                                                                                {reqItem.description}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 block">
                                                                                Type: {reqItem.type || 'Requirement'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                        isReqDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                        {reqItem.status || 'Pending'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* =========================================================================
                                        2. SEO 46-POINT MASTER CHECKLIST (INTERACTIVE)
                                       ========================================================================= */}
                                    {taskTypeTab === 'project' && task.seoProject && totalSeoCount > 0 && (
                                        <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-4 space-y-3.5">
                                            {/* Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                                                <div className="flex items-center space-x-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                                                        <Search size={15} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                                                46-Point SEO Master Checklist
                                                            </h4>
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                Campaign Tasks
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500">
                                                            Check off completed SEO tasks. Synchronized live with Admin Team Management.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 self-start sm:self-auto">
                                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        {completedSeoCount} / {totalSeoCount} Done ({seoProgress}%)
                                                    </span>
                                                    <button
                                                        onClick={() => toggleExpand(task._id)}
                                                        className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                                        title={isExpanded ? "Collapse checklist" : "Expand checklist"}
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 ease-out"
                                                    style={{ width: `${seoProgress}%` }}
                                                />
                                            </div>

                                            {/* Category Filter Pills */}
                                            {isExpanded && (
                                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                    {[
                                                        { key: 'All', label: 'All Tasks (46)' },
                                                        { key: 'Keyword Research & Technical SEO', label: 'Tech & Keyword' },
                                                        { key: 'Content & On-Page SEO', label: 'On-Page' },
                                                        { key: 'Off-Page SEO Tasks', label: 'Off-Page' },
                                                        { key: 'Local SEO Tasks', label: 'Local SEO' }
                                                    ].map(cat => (
                                                        <button
                                                            key={cat.key}
                                                            onClick={() => setSeoCategory(task._id, cat.key)}
                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                                                (seoCategoryMap[task._id] || 'All') === cat.key
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {cat.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* SEO Checklist Items Grid */}
                                            {isExpanded && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 max-h-96 overflow-y-auto pr-1">
                                                    {task.seoProject.checklist
                                                        .filter(item => {
                                                            const activeCat = seoCategoryMap[task._id] || 'All';
                                                            return activeCat === 'All' || item.category === activeCat;
                                                        })
                                                        .map((item) => {
                                                            const isItemDone = !!item.isCompleted;
                                                            return (
                                                                <div
                                                                    key={item._id}
                                                                    onClick={() => handleToggleSeoChecklist(task._id, task.seoProject._id, item._id)}
                                                                    className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all select-none ${
                                                                        isItemDone
                                                                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 shadow-2xs'
                                                                            : 'bg-white border-slate-200/80 hover:border-emerald-400 hover:bg-emerald-50/20 text-slate-800 shadow-2xs'
                                                                    }`}
                                                                >
                                                                    <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                                                        isItemDone ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                                                    }`}>
                                                                        {isItemDone && <Check size={11} strokeWidth={3} />}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <span className={`text-xs font-semibold block leading-tight ${
                                                                            isItemDone ? 'line-through text-emerald-800/70' : 'text-slate-800'
                                                                        }`}>
                                                                            {item.taskName}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                            {item.category}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}

                                            {/* Custom SEO Tasks (if any assigned) */}
                                            {task.seoProject.customTasks && task.seoProject.customTasks.length > 0 && (
                                                <div className="pt-2 border-t border-slate-200/70 space-y-2">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                                                        <Sparkles size={12} className="text-emerald-500" />
                                                        <span>Custom SEO Campaigns ({task.seoProject.customTasks.length})</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {task.seoProject.customTasks.map(ct => {
                                                            const isCtDone = ct.status === 'Completed';
                                                            return (
                                                                <div 
                                                                    key={ct._id}
                                                                    onClick={() => handleToggleSeoCustomTask(task._id, task.seoProject._id, ct._id, ct.status)}
                                                                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                                        isCtDone 
                                                                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
                                                                            : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-300'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center space-x-2.5">
                                                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                                                            isCtDone ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                                                        }`}>
                                                                            {isCtDone && <Check size={11} strokeWidth={3} />}
                                                                        </div>
                                                                        <div>
                                                                            <span className={`text-xs font-semibold ${isCtDone ? 'line-through text-emerald-800/70' : ''}`}>
                                                                                {ct.description}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 block">
                                                                                Category: {ct.type || 'SEO'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                        isCtDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                        {ct.status || 'Pending'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Bottom Action Footer */}
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-[11px] text-slate-400">
                                            {task.dueDate && (
                                                <span>Due by {formatDateClean(task.dueDate)}</span>
                                            )}
                                        </div>

                                        {!isCompleted ? (
                                            <button
                                                onClick={() => markTaskCompleted(task._id)}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                                            >
                                                <Check size={14} />
                                                <span>Mark Complete</span>
                                            </button>
                                        ) : (
                                            <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                                                <CheckCircle2 size={14} />
                                                <span>Finished</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
