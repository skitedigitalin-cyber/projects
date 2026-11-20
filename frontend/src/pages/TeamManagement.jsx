import React, { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { 
    Briefcase, Share2, Globe, Search, Plus, Trash2, CheckCircle2, Clock, 
    Calendar, User, Phone, Mail, Link as LinkIcon, ExternalLink, ArrowLeft, 
    Check, Edit2, AlertCircle, Sparkles, Filter, ChevronRight, Layers,
    Video, FileText, Send, Palette, ListTodo, ShieldAlert, CheckSquare,
    DollarSign, ArrowUpRight
} from 'lucide-react';

export default function TeamManagement() {
    const { user } = useContext(AuthContext);
    const isSkite = 
        user?.isSkiteTenant === true ||
        user?.tenantId === '6af2c94a9d29730751ed2d01' ||
        (user?.companyName && user.companyName.toLowerCase().includes('skite')) ||
        (user?.email && user.email.toLowerCase().includes('skite'));

    if (user && !isSkite) {
        return <Navigate to="/dashboard" replace />;
    }

    // Top-level Navigation Tabs
    const [mainTab, setMainTab] = useState('overview'); // 'overview' | 'social' | 'webdev' | 'seo' | 'all-tasks'
    
    // Overview Stats
    const [stats, setStats] = useState({
        socialMediaProjects: 0,
        webDevProjects: 0,
        seoProjects: 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0
    });
    
    // Eligible Employees list for dropdowns
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Social Media States
    const [smProjects, setSmProjects] = useState([]);
    const [selectedSmProject, setSelectedSmProject] = useState(null);
    const [isAddSmModalOpen, setIsAddSmModalOpen] = useState(false);
    const [newSmForm, setNewSmForm] = useState({ clientName: '', businessName: '', phone: '', email: '', month: '' });
    const [smWorkflowTab, setSmWorkflowTab] = useState('Script'); // 'Script' | 'Shoot' | 'Edit' | 'Post' | 'Design'
    const [isAddSmItemModalOpen, setIsAddSmItemModalOpen] = useState(false);
    const [smItemForm, setSmItemForm] = useState({ 
        date: '', 
        startTime: '', 
        endTime: '', 
        details: '', 
        assignedEmployee: '', 
        scriptWriterId: '',
        scriptDate: '',
        shooterId: '',
        shootDate: '',
        editorId: '',
        editDate: '',
        posterId: ''
    });
    const [isEditSmItemModalOpen, setIsEditSmItemModalOpen] = useState(false);
    const [editSmItemForm, setEditSmItemForm] = useState({
        itemId: '',
        type: '',
        date: '',
        startTime: '',
        endTime: '',
        details: '',
        assignedEmployee: '',
        status: 'Pending'
    });

    // Web Dev States
    const [webProjects, setWebProjects] = useState([]);
    const [selectedWebProject, setSelectedWebProject] = useState(null);
    const [isAddWebModalOpen, setIsAddWebModalOpen] = useState(false);
    const [newWebForm, setNewWebForm] = useState({ clientName: '', businessName: '', phone: '', email: '', website: '', websiteType: 'Normal', assignedDeveloper: '' });
    const [isEditingWebClient, setIsEditingWebClient] = useState(false);
    const [webEditData, setWebEditData] = useState({});
    const [webReqInput, setWebReqInput] = useState('');
    const [webReqType, setWebReqType] = useState('Requirement'); // 'Requirement' | 'Change'
    const [webReqEmployee, setWebReqEmployee] = useState('');
    const [customWebChecklistInput, setCustomWebChecklistInput] = useState('');
    const [webWorkflowTab, setWebWorkflowTab] = useState(null); // null (auto by websiteType) | 'checklist' | 'requirements'

    // SEO States
    const [seoProjects, setSeoProjects] = useState([]);
    const [selectedSeoProject, setSelectedSeoProject] = useState(null);
    const [isAddSeoModalOpen, setIsAddSeoModalOpen] = useState(false);
    const [newSeoForm, setNewSeoForm] = useState({ clientName: '', businessName: '', phone: '', email: '', website: '', assignedSpecialist: '' });
    const [seoCategoryFilter, setSeoCategoryFilter] = useState('All');
    const [seoCustomTaskForm, setSeoCustomTaskForm] = useState({ type: 'OnPage', description: '', assignedEmployee: '' });

    // All Tasks state
    const [allTasks, setAllTasks] = useState([]);
    const [taskFilter, setTaskFilter] = useState('all');
    const [tasksPage, setTasksPage] = useState(1);
    const tasksPerPage = 15;

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        return { Authorization: `Bearer ${token}` };
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchStats(),
                fetchEmployees(),
                fetchSocialMediaProjects(),
                fetchWebDevProjects(),
                fetchSEOProjects(),
                fetchAllTasks()
            ]);
        } catch (err) {
            console.error('Error fetching initial team management data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/team-management/stats', { headers: getHeaders() });
            setStats(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/team-management/employees', { headers: getHeaders() });
            setEmployees(res.data || []);
        } catch (err) { console.error(err); }
    };

    const fetchAllTasks = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/hr/tasks', { headers: getHeaders() });
            setAllTasks(res.data || []);
        } catch (err) { console.error(err); }
    };

    /* =========================================================================
       TIME & ROLE HELPERS
    ========================================================================= */
    const formatTo12HourDisplay = (timeStr) => {
        if (!timeStr) return '';
        if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('am') || timeStr.includes('pm')) return timeStr;
        const parts = timeStr.trim().split(':');
        if (parts.length >= 2) {
            let hour = parseInt(parts[0], 10);
            const minute = parts[1].slice(0, 2);
            if (isNaN(hour)) return timeStr;
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12 || 12;
            return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
        }
        return timeStr;
    };

    const getEmployeeDisplayName = (empOrId, fallbackText = 'Unassigned') => {
        if (!empOrId) return fallbackText;
        if (typeof empOrId === 'object' && empOrId.firstName) {
            return `${empOrId.firstName} ${empOrId.lastName || ''}`.trim();
        }
        const id = typeof empOrId === 'object' ? empOrId._id : empOrId;
        const found = employees.find(e => String(e._id) === String(id));
        if (found) {
            return `${found.firstName} ${found.lastName || ''}`.trim();
        }
        return fallbackText;
    };

    const getEmployeesByRole = (stageOrRole) => {
        if (!employees || !Array.isArray(employees)) return [];
        const target = (stageOrRole || '').toLowerCase().trim();

        return employees.filter(emp => {
            const r = (emp.role || '').toLowerCase().trim();

            if (target === 'script' || target === 'script writer' || target === 'content writer' || target === 'content writter') {
                return r.includes('content') || r.includes('script') || r.includes('writer') || r.includes('writter');
            }
            if (target === 'shoot' || target === 'shoot person' || target === 'videographer' || target === 'shooter') {
                return r.includes('videographer') || r.includes('shoot') || r.includes('camera') || r.includes('creator');
            }
            if (target === 'edit' || target === 'video editor' || target === 'editor') {
                return r.includes('video editor') || (r.includes('editor') && !r.includes('audit')) || (r.includes('edit') && !r.includes('audit'));
            }
            if (target === 'design' || target === 'designer' || target === 'graphic designer') {
                return r.includes('design') || r.includes('graphic');
            }
            if (target === 'post' || target === 'poster' || target === 'publisher' || target === 'social media poster') {
                return r.includes('seo') || r.includes('post') || r.includes('social') || r.includes('marketing') || r.includes('publisher') || r.includes('manager') || r === 'employee';
            }
            if (target === 'developer' || target === 'web developer') {
                return r.includes('developer') || r.includes('web') || r.includes('dev');
            }
            if (target === 'seo' || target === 'seo specialist' || target === 'seo analyst') {
                return r.includes('seo') || r.includes('analyst') || r.includes('marketing');
            }
            return true;
        });
    };

    /* =========================================================================
       SOCIAL MEDIA HANDLERS
    ========================================================================= */
    const fetchSocialMediaProjects = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/team-management/social-media', { headers: getHeaders() });
            setSmProjects(res.data || []);
        } catch (err) { console.error(err); }
    };

    const loadSingleSmProject = async (id) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/team-management/social-media/${id}`, { headers: getHeaders() });
            setSelectedSmProject(res.data);
        } catch (err) { console.error(err); }
    };

    const handleCreateSmProject = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/team-management/social-media', newSmForm, { headers: getHeaders() });
            setIsAddSmModalOpen(false);
            setNewSmForm({ clientName: '', businessName: '', phone: '', email: '', month: '' });
            fetchSocialMediaProjects();
            fetchStats();
            setSelectedSmProject(res.data);
            setMainTab('social');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create social media project');
        }
    };

    const handleDeleteSmProject = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this Social Media Client and all associated tasks?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/team-management/social-media/${id}`, { headers: getHeaders() });
            if (selectedSmProject?._id === id) setSelectedSmProject(null);
            fetchSocialMediaProjects();
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete client');
        }
    };

    const handleSmDateChange = (targetDateStr) => {
        if (!targetDateStr) {
            setSmItemForm(prev => ({ ...prev, date: '' }));
            return;
        }
        const targetObj = new Date(targetDateStr);
        const toYMD = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const scriptD = new Date(targetObj);
        scriptD.setDate(targetObj.getDate() - 10);

        const shootD = new Date(targetObj);
        shootD.setDate(targetObj.getDate() - 5);

        const editD = new Date(targetObj);
        editD.setDate(targetObj.getDate() - 2);

        setSmItemForm(prev => ({
            ...prev,
            date: targetDateStr,
            scriptDate: prev.scriptDate || toYMD(scriptD),
            shootDate: prev.shootDate || toYMD(shootD),
            editDate: prev.editDate || toYMD(editD)
        }));
    };

    const handleAddSmItem = async (e) => {
        e.preventDefault();
        if (!selectedSmProject) return;

        if (smWorkflowTab === 'Post') {
            const hasAny = smItemForm.scriptWriterId || smItemForm.shooterId || smItemForm.editorId || smItemForm.posterId || smItemForm.assignedEmployee;
            if (!hasAny) {
                alert('Please select at least one team member (Script Writer, Shooter, Editor, or Poster) to assign tasks!');
                return;
            }
        }

        try {
            const payload = {
                type: smWorkflowTab,
                ...smItemForm
            };
            const res = await axios.post(`http://localhost:5000/api/team-management/social-media/${selectedSmProject._id}/items`, payload, { headers: getHeaders() });
            setSelectedSmProject(res.data);
            setIsAddSmItemModalOpen(false);
            setSmItemForm({ 
                date: '', 
                startTime: '', 
                endTime: '', 
                details: '', 
                assignedEmployee: '', 
                scriptWriterId: '',
                scriptDate: '',
                shooterId: '',
                shootDate: '',
                editorId: '',
                editDate: '',
                posterId: ''
            });
            fetchSocialMediaProjects();
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add content item');
        }
    };

    const handleUpdateSmItemStatus = async (itemId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/team-management/social-media/${selectedSmProject._id}/items/${itemId}`, { status: newStatus }, { headers: getHeaders() });
            loadSingleSmProject(selectedSmProject._id);
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleOpenEditSmItem = (item) => {
        setEditSmItemForm({
            itemId: item._id,
            type: item.type,
            date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
            startTime: item.startTime || '',
            endTime: item.endTime || '',
            details: item.details || '',
            assignedEmployee: item.assignedEmployee?._id || item.assignedEmployee || '',
            status: item.status || 'Pending'
        });
        setIsEditSmItemModalOpen(true);
    };

    const handleSaveEditSmItem = async (e) => {
        e.preventDefault();
        if (!selectedSmProject || !editSmItemForm.itemId) return;
        try {
            const res = await axios.put(
                `http://localhost:5000/api/team-management/social-media/${selectedSmProject._id}/items/${editSmItemForm.itemId}`,
                editSmItemForm,
                { headers: getHeaders() }
            );
            if (res.data?.project) {
                setSelectedSmProject(res.data.project);
            } else {
                loadSingleSmProject(selectedSmProject._id);
            }
            setIsEditSmItemModalOpen(false);
            fetchSocialMediaProjects();
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update task');
        }
    };

    const handleDeleteSmItem = async (itemId) => {
        if (!window.confirm('Delete this workflow item and linked employee task?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/team-management/social-media/${selectedSmProject._id}/items/${itemId}`, { headers: getHeaders() });
            loadSingleSmProject(selectedSmProject._id);
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete item');
        }
    };

    /* =========================================================================
       WEB DEVELOPMENT HANDLERS
    ========================================================================= */
    const fetchWebDevProjects = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/team-management/webdev', { headers: getHeaders() });
            setWebProjects(res.data || []);
        } catch (err) { console.error(err); }
    };

    const loadSingleWebProject = async (id) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/team-management/webdev/${id}`, { headers: getHeaders() });
            setSelectedWebProject(res.data);
            setWebEditData(res.data);
        } catch (err) { console.error(err); }
    };

    const handleCreateWebProject = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/team-management/webdev', newWebForm, { headers: getHeaders() });
            setIsAddWebModalOpen(false);
            setNewWebForm({ clientName: '', businessName: '', phone: '', email: '', website: '', websiteType: 'Normal', assignedDeveloper: '' });
            fetchWebDevProjects();
            fetchStats();
            setSelectedWebProject(res.data);
            setWebEditData(res.data);
            setMainTab('webdev');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create web development project');
        }
    };

    const handleDeleteWebProject = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this Web Dev Client and all associated tasks?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/team-management/webdev/${id}`, { headers: getHeaders() });
            if (selectedWebProject?._id === id) setSelectedWebProject(null);
            fetchWebDevProjects();
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete project');
        }
    };

    const handleSaveWebDetails = async () => {
        try {
            const res = await axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, webEditData, { headers: getHeaders() });
            setSelectedWebProject(res.data);
            setIsEditingWebClient(false);
            fetchWebDevProjects();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update web project details');
        }
    };

    const handleAddWebRequirement = async (e) => {
        e.preventDefault();
        if (!webReqInput.trim()) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}/requirements`, {
                type: webReqType,
                description: webReqInput,
                assignedEmployee: webReqEmployee || selectedWebProject.assignedDeveloper?._id
            }, { headers: getHeaders() });
            setSelectedWebProject(res.data);
            setWebReqInput('');
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add requirement');
        }
    };

    const handleUpdateWebReqStatus = async (reqId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}/requirements/${reqId}`, { status: newStatus }, { headers: getHeaders() });
            loadSingleWebProject(selectedWebProject._id);
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update requirement status');
        }
    };

    const handleDeleteWebReq = async (reqId) => {
        if (!window.confirm('Delete this requirement and linked task?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}/requirements/${reqId}`, { headers: getHeaders() });
            loadSingleWebProject(selectedWebProject._id);
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete requirement');
        }
    };

    const handleToggleWebChecklist = async (itemId) => {
        try {
            await axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}/checklist/${itemId}`, {}, { headers: getHeaders() });
            loadSingleWebProject(selectedWebProject._id);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddCustomWebChecklist = async (e) => {
        e.preventDefault();
        if (!customWebChecklistInput.trim()) return;
        try {
            await axios.post(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}/checklist`, { item: customWebChecklistInput }, { headers: getHeaders() });
            setCustomWebChecklistInput('');
            loadSingleWebProject(selectedWebProject._id);
        } catch (err) {
            alert('Failed to add checklist item');
        }
    };

    const handleDeleteWebChecklistItem = async (itemId) => {
        try {
            await axios.delete(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}/checklist/${itemId}`, { headers: getHeaders() });
            loadSingleWebProject(selectedWebProject._id);
        } catch (err) {
            alert('Failed to delete checklist item');
        }
    };

    /* =========================================================================
       SEO HANDLERS
    ========================================================================= */
    const fetchSEOProjects = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/team-management/seo', { headers: getHeaders() });
            setSeoProjects(res.data || []);
        } catch (err) { console.error(err); }
    };

    const loadSingleSeoProject = async (id) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/team-management/seo/${id}`, { headers: getHeaders() });
            setSelectedSeoProject(res.data);
        } catch (err) { console.error(err); }
    };

    const handleCreateSeoProject = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/team-management/seo', newSeoForm, { headers: getHeaders() });
            setIsAddSeoModalOpen(false);
            setNewSeoForm({ clientName: '', businessName: '', phone: '', email: '', website: '', assignedSpecialist: '' });
            fetchSEOProjects();
            fetchStats();
            setSelectedSeoProject(res.data);
            setMainTab('seo');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create SEO project');
        }
    };

    const handleDeleteSeoProject = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this SEO Project and all associated tasks?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/team-management/seo/${id}`, { headers: getHeaders() });
            if (selectedSeoProject?._id === id) setSelectedSeoProject(null);
            fetchSEOProjects();
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete SEO project');
        }
    };

    const handleToggleSeoChecklist = async (itemId) => {
        try {
            await axios.put(`http://localhost:5000/api/team-management/seo/${selectedSeoProject._id}/checklist/${itemId}`, {}, { headers: getHeaders() });
            loadSingleSeoProject(selectedSeoProject._id);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddSeoCustomTask = async (e) => {
        e.preventDefault();
        if (!seoCustomTaskForm.description.trim()) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/team-management/seo/${selectedSeoProject._id}/custom-tasks`, seoCustomTaskForm, { headers: getHeaders() });
            setSelectedSeoProject(res.data);
            setSeoCustomTaskForm({ type: 'OnPage', description: '', assignedEmployee: '' });
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add custom SEO task');
        }
    };

    const handleUpdateSeoCustomTaskStatus = async (taskId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/team-management/seo/${selectedSeoProject._id}/custom-tasks/${taskId}`, { status: newStatus }, { headers: getHeaders() });
            loadSingleSeoProject(selectedSeoProject._id);
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update task status');
        }
    };

    const handleDeleteSeoCustomTask = async (taskId) => {
        if (!window.confirm('Delete this SEO task and linked task?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/team-management/seo/${selectedSeoProject._id}/custom-tasks/${taskId}`, { headers: getHeaders() });
            loadSingleSeoProject(selectedSeoProject._id);
            fetchStats();
            fetchAllTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete task');
        }
    };

    const handleToggleGeneralTaskStatus = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
        try {
            await axios.put(`http://localhost:5000/api/hr/tasks/${taskId}`, { status: newStatus }, { headers: getHeaders() });
            fetchAllTasks();
            fetchStats();
            if (selectedSmProject) loadSingleSmProject(selectedSmProject._id);
            if (selectedWebProject) loadSingleWebProject(selectedWebProject._id);
            if (selectedSeoProject) loadSingleSeoProject(selectedSeoProject._id);
        } catch (err) {
            alert('Failed to update task');
        }
    };

    return (
        <Layout>
            <div className="space-y-8 pb-12">
                
                {/* 1. Header & Navigation Hub */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                            <Briefcase size={14} />
                            <span>Executive Team Operations</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Team Management</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                            Unified workflows for Social Media Marketing, Web Development, and SEO with automated employee task delegation.
                        </p>
                    </div>

                    {/* Quick Add Actions */}
                    <div className="flex items-center space-x-2.5">
                        <button 
                            onClick={() => setIsAddSmModalOpen(true)}
                            className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 rounded-xl text-xs font-bold flex items-center transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                            <Plus size={14} className="mr-1.5" /> Social Media Client
                        </button>
                        <button 
                            onClick={() => setIsAddWebModalOpen(true)}
                            className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 rounded-xl text-xs font-bold flex items-center transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                            <Plus size={14} className="mr-1.5" /> Web Dev Client
                        </button>
                        <button 
                            onClick={() => setIsAddSeoModalOpen(true)}
                            className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 rounded-xl text-xs font-bold flex items-center transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                            <Plus size={14} className="mr-1.5" /> SEO Client
                        </button>
                    </div>
                </div>

                {/* 2. Executive Metrics Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-1.5 bg-slate-50/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Social Media</span>
                                <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.socialMediaProjects || 0}</span>
                                <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Reels & Post Workflows</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <Share2 size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5 bg-slate-50/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Web Dev Projects</span>
                                <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.webDevProjects || 0}</span>
                                <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Normal, E-Comm & Static</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <Globe size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5 bg-slate-50/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">SEO Projects</span>
                                <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.seoProjects || 0}</span>
                                <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">46-Point Master Checklist</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <Search size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5 bg-slate-50/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Team Tasks</span>
                                <span className="text-2xl font-black text-slate-900 mt-1 block">{stats.totalTasks || 0}</span>
                                <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">{stats.pendingTasks || 0} Pending · {stats.completedTasks || 0} Done</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                <ListTodo size={22} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Main Navigation Pills */}
                <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-4 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Department Overview', icon: Layers },
                        { id: 'social', label: 'Social Media Marketing', count: smProjects.length, icon: Share2 },
                        { id: 'webdev', label: 'Website Development', count: webProjects.length, icon: Globe },
                        { id: 'seo', label: 'SEO Projects', count: seoProjects.length, icon: Search },
                        { id: 'all-tasks', label: 'Live Team Tasks', count: allTasks.length, icon: ListTodo },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = mainTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setMainTab(tab.id);
                                    if (tab.id === 'social') setSelectedSmProject(null);
                                    if (tab.id === 'webdev') setSelectedWebProject(null);
                                    if (tab.id === 'seo') setSelectedSeoProject(null);
                                }}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap ${
                                    isActive
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200/60'
                                }`}
                            >
                                <Icon size={15} />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* =========================================================================
                   TAB 1: DEPARTMENT OVERVIEW
                ========================================================================= */}
                {mainTab === 'overview' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Card 1: Social Media Hub */}
                            <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all duration-300">
                                <div className="bg-white rounded-[1.5rem] p-7 shadow-xs flex flex-col justify-between h-full">
                                    <div>
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">
                                            <Share2 size={26} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">Social Media Marketing</h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                            4-Stage Reels Workflow (Script → Shoot → Edit → Post) and Post Schedules with direct Video Editor and Content Writer task automation.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">{smProjects.length} Active Clients</span>
                                        <button 
                                            onClick={() => { setMainTab('social'); setSelectedSmProject(null); }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                                        >
                                            Open Hub <ChevronRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Web Dev Hub */}
                            <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all duration-300">
                                <div className="bg-white rounded-[1.5rem] p-7 shadow-xs flex flex-col justify-between h-full">
                                    <div>
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">
                                            <Globe size={26} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">Website Development</h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                            Normal, E-Commerce (17-item checklist), & Static builds with assigned developer task dispatch, client requirements, changes, and payment milestones.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">{webProjects.length} Active Projects</span>
                                        <button 
                                            onClick={() => { setMainTab('webdev'); setSelectedWebProject(null); }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                                        >
                                            Open Hub <ChevronRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: SEO Projects Hub */}
                            <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all duration-300">
                                <div className="bg-white rounded-[1.5rem] p-7 shadow-xs flex flex-col justify-between h-full">
                                    <div>
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">
                                            <Search size={26} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">SEO Projects</h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                            Standard 46-Task Master SEO Checklist across Technical, On-Page, Off-Page, and Local SEO, plus specialist assignments and custom task tracking.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">{seoProjects.length} Active Projects</span>
                                        <button 
                                            onClick={() => { setMainTab('seo'); setSelectedSeoProject(null); }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                                        >
                                            Open Hub <ChevronRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Team Activity Feed */}
                        <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100">
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Live Team Tasks Monitor</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Real-time status of tasks auto-assigned to developers, video editors, and SEO specialists</p>
                                    </div>
                                    <button 
                                        onClick={() => setMainTab('all-tasks')}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center cursor-pointer"
                                    >
                                        View All Tasks ({allTasks.length}) <ChevronRight size={14} />
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {allTasks.slice(0, 5).map(task => (
                                        <div key={task._id} className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between border border-slate-100">
                                            <div className="flex items-center space-x-3">
                                                <button 
                                                    onClick={() => handleToggleGeneralTaskStatus(task._id, task.status)}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                                        task.status === 'Completed' ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-transparent'
                                                    }`}
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </button>
                                                <div>
                                                    <h4 className={`text-xs font-bold text-slate-800 ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                                                        {task.title}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        Assigned to: <strong className="text-slate-600">{task.employeeId?.firstName} {task.employeeId?.lastName}</strong> ({task.employeeId?.department || 'Team'})
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                                    task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {task.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {allTasks.length === 0 && (
                                        <div className="text-center py-8 text-xs text-slate-400 font-medium">
                                            No tasks assigned yet. Tasks created in Social Media, Web Dev, or SEO will automatically appear here!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                   TAB 2: SOCIAL MEDIA MARKETING HUB
                ========================================================================= */}
                {mainTab === 'social' && !selectedSmProject && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Social Media Clients</h2>
                                <p className="text-xs text-slate-500 font-medium">Track client reels workflow (Script → Shoot → Edit → Post) and graphic design schedules.</p>
                            </div>
                            <button 
                                onClick={() => setIsAddSmModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                            >
                                <Plus size={16} className="mr-1.5" /> Add Client
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {smProjects.map(client => (
                                <div 
                                    key={client._id}
                                    onClick={() => setSelectedSmProject(client)}
                                    className="p-1.5 bg-slate-50/80 rounded-[1.75rem] border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative"
                                >
                                    <div className="bg-white rounded-[1.25rem] p-6 shadow-xs h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                                    <Share2 size={22} />
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    {client.month && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                                            {client.month}
                                                        </span>
                                                    )}
                                                    <button 
                                                        onClick={(e) => handleDeleteSmProject(e, client._id)}
                                                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                                                        title="Delete Client"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-900 text-base mb-1">{client.businessName || client.clientName}</h3>
                                            <p className="text-xs text-slate-500 font-medium mb-3">Contact: {client.clientName}</p>
                                            
                                            <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                                                {client.phone && <div className="flex items-center"><Phone size={13} className="mr-1.5 text-slate-400" /> {client.phone}</div>}
                                                {client.email && <div className="flex items-center"><Mail size={13} className="mr-1.5 text-slate-400" /> {client.email}</div>}
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                {client.contentItems?.length || 0} Content Tasks
                                            </span>
                                            <span className="text-xs font-bold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                                                Manage <ChevronRight size={14} className="ml-0.5" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {smProjects.length === 0 && (
                                <div className="col-span-full py-16 text-center bg-white rounded-[1.75rem] border border-slate-100">
                                    <Share2 size={36} className="mx-auto text-slate-300 mb-3" />
                                    <h4 className="font-bold text-slate-800">No Social Media Clients</h4>
                                    <p className="text-xs text-slate-400 mt-1">Click "Add Client" to onboard your first social media client.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SOCIAL MEDIA DRILL-DOWN WORKSPACE */}
                {mainTab === 'social' && selectedSmProject && (
                    <div className="space-y-6">
                        {/* Header with Back button */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={() => setSelectedSmProject(null)}
                                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-xl font-bold text-slate-900">{selectedSmProject.businessName || selectedSmProject.clientName}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            Social Media Client
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Client: {selectedSmProject.clientName} {selectedSmProject.phone && `· ${selectedSmProject.phone}`} {selectedSmProject.email && `· ${selectedSmProject.email}`}
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsAddSmItemModalOpen(true)}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                            >
                                <Plus size={16} className="mr-1.5" /> Add {smWorkflowTab} Task
                            </button>
                        </div>

                        {/* Workflow Tabs (Script, Shoot, Edit, Post, Design) */}
                        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
                            {[
                                { id: 'Script', label: 'Script', icon: FileText },
                                { id: 'Shoot', label: 'Shoot', icon: Video },
                                { id: 'Edit', label: 'Edit', icon: Edit2 },
                                { id: 'Post', label: 'Post', icon: Send },
                                { id: 'Design', label: 'Design Post', icon: Palette },
                            ].map(tab => {
                                const Icon = tab.icon;
                                const count = (selectedSmProject.contentItems || []).filter(i => i.type === tab.id).length;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setSmWorkflowTab(tab.id)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                                            smWorkflowTab === tab.id 
                                            ? 'bg-blue-600 text-white shadow-xs' 
                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        <span>{tab.label}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${smWorkflowTab === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Tasks Table */}
                        <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900">{smWorkflowTab} Stage Workflow Tasks</h3>
                                <span className="text-xs text-slate-400 font-medium">All tasks are automatically synced with employee task boards</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                                        <tr>
                                            <th className="py-3 px-5">Date & Timing</th>
                                            <th className="py-3 px-5">Description</th>
                                            <th className="py-3 px-5">Assigned Employee</th>
                                            <th className="py-3 px-5">Live Task Status</th>
                                            <th className="py-3 px-5">Stage Status</th>
                                            <th className="py-3 px-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {(selectedSmProject.contentItems || [])
                                            .filter(item => item.type === smWorkflowTab)
                                            .map(item => {
                                                const isTaskCompleted = item.assignedTaskId?.status === 'Completed' || item.status === 'Completed';
                                                const isOverdue = new Date(item.date).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0) && !isTaskCompleted;
                                                return (
                                                    <tr key={item._id} className={isOverdue ? 'bg-red-50/40' : 'hover:bg-slate-50/50'}>
                                                        <td className="py-3.5 px-5">
                                                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                                                <Calendar size={13} className={isOverdue ? 'text-red-500' : 'text-slate-400'} />
                                                                <span>{new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                                                                <Clock size={11} />
                                                                <span>{formatTo12HourDisplay(item.startTime) || 'Flexible'}{item.endTime ? ` - ${formatTo12HourDisplay(item.endTime)}` : ''}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-5 max-w-xs font-medium text-slate-800">
                                                            {item.details || 'No details provided'}
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            {(() => {
                                                                const empId = typeof item.assignedEmployee === 'object' ? item.assignedEmployee?._id : item.assignedEmployee;
                                                                const empObj = typeof item.assignedEmployee === 'object' && item.assignedEmployee?.firstName 
                                                                    ? item.assignedEmployee 
                                                                    : employees.find(e => String(e._id) === String(empId));

                                                                if (!empObj) {
                                                                    return <span className="text-slate-400 italic text-xs">Unassigned</span>;
                                                                }

                                                                const initial = empObj.firstName?.charAt(0)?.toUpperCase() || 'E';
                                                                return (
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shadow-xs">
                                                                            {initial}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-800 text-[11px]">
                                                                                {empObj.firstName} {empObj.lastName || ''}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-400 capitalize">{empObj.role || 'Staff'}</div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center ${
                                                                isTaskCompleted
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                            }`}>
                                                                {isTaskCompleted ? <CheckCircle2 size={11} className="mr-1 text-emerald-600" /> : <Clock size={11} className="mr-1 text-amber-500" />}
                                                                {isTaskCompleted ? 'Completed' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-5">
                                                            {isTaskCompleted ? (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 text-[11px] font-bold">
                                                                    <CheckCircle2 size={12} className="mr-1 text-emerald-700" /> Stage Done
                                                                </span>
                                                            ) : isOverdue ? (
                                                                <button 
                                                                    onClick={() => handleUpdateSmItemStatus(item._id, 'Completed')}
                                                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] flex items-center cursor-pointer shadow-xs"
                                                                >
                                                                    <AlertCircle size={12} className="mr-1" /> Action Required (Complete)
                                                                </button>
                                                            ) : (
                                                                <select
                                                                    value={item.status}
                                                                    onChange={(e) => handleUpdateSmItemStatus(item._id, e.target.value)}
                                                                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white cursor-pointer outline-none"
                                                                >
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="Completed">Completed</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                                            <button 
                                                                onClick={() => handleOpenEditSmItem(item)}
                                                                className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg transition-colors cursor-pointer mr-1 hover:bg-blue-50 inline-flex items-center"
                                                                title="Edit Task & Reassign Employee"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteSmItem(item._id)}
                                                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-red-50 inline-flex items-center"
                                                                title="Delete item"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        {(selectedSmProject.contentItems || []).filter(i => i.type === smWorkflowTab).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                                                    No {smWorkflowTab} tasks scheduled yet. Click "+ Add {smWorkflowTab} Task" above!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                   TAB 3: WEBSITE DEVELOPMENT HUB
                ========================================================================= */ }
                {mainTab === 'webdev' && !selectedWebProject && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Website Development Projects</h2>
                                <p className="text-xs text-slate-500 font-medium">Manage Normal, E-Commerce, and Static websites with developer task assignments & milestone checklists.</p>
                            </div>
                            <button 
                                onClick={() => setIsAddWebModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                            >
                                <Plus size={16} className="mr-1.5" /> Add Web Client
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {webProjects.map(project => (
                                <div 
                                    key={project._id}
                                    onClick={() => loadSingleWebProject(project._id)}
                                    className="p-1.5 bg-slate-50/80 rounded-[1.75rem] border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative"
                                >
                                    <div className="bg-white rounded-[1.25rem] p-6 shadow-xs h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                                    <Globe size={22} />
                                                </div>
                                                <div className="flex items-center space-x-1.5">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        project.projectStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                                    }`}>
                                                        {project.projectStatus || 'Pending'}
                                                    </span>
                                                    <button 
                                                        onClick={(e) => handleDeleteWebProject(e, project._id)}
                                                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                                                        title="Delete Project"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h3 className="font-bold text-slate-900 text-base mb-0.5">{project.businessName}</h3>
                                            <p className="text-xs text-slate-500 font-medium mb-3">{project.clientName}</p>

                                            <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                                                {project.website && (
                                                    <div className="flex items-center text-blue-600 truncate">
                                                        <LinkIcon size={12} className="mr-1.5 shrink-0" />
                                                        <span className="truncate">{project.website}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center text-slate-600">
                                                    <User size={12} className="mr-1.5 shrink-0 text-slate-400" />
                                                    <span>Dev: <strong>{getEmployeeDisplayName(project.assignedDeveloper, 'Unassigned')}</strong></span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                                                {project.websiteType || 'Normal'}
                                            </span>
                                            <span className="text-xs font-bold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                                                Manage Project <ChevronRight size={14} className="ml-0.5" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {webProjects.length === 0 && (
                                <div className="col-span-full py-16 text-center bg-white rounded-[1.75rem] border border-slate-100">
                                    <Globe size={36} className="mx-auto text-slate-300 mb-3" />
                                    <h4 className="font-bold text-slate-800">No Web Development Projects</h4>
                                    <p className="text-xs text-slate-400 mt-1">Click "Add Web Client" to create your first web development project.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* WEB DEV PROJECT DRILL-DOWN WORKSPACE */}
                {mainTab === 'webdev' && selectedWebProject && (
                    <div className="space-y-6">
                        {/* Header & Details Card */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-4">
                                <div className="flex items-center space-x-4">
                                    <button 
                                        onClick={() => setSelectedWebProject(null)}
                                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h2 className="text-xl font-bold text-slate-900">{selectedWebProject.businessName}</h2>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                                                {(isEditingWebClient ? webEditData.websiteType : selectedWebProject.websiteType) || 'Normal'} Web Project
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                                            Client: {selectedWebProject.clientName} {selectedWebProject.phone && `· ${selectedWebProject.phone}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {isEditingWebClient ? (
                                        <button 
                                            onClick={handleSaveWebDetails}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center cursor-pointer shadow-xs transition-colors"
                                        >
                                            <Check size={14} className="mr-1.5" /> Save Changes
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setIsEditingWebClient(true)}
                                            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center cursor-pointer transition-colors"
                                        >
                                            <Edit2 size={14} className="mr-1.5" /> Edit Project Info
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Website URL</label>
                                    {isEditingWebClient ? (
                                        <input 
                                            type="text" 
                                            value={webEditData.website || ''} 
                                            onChange={e => setWebEditData({ ...webEditData, website: e.target.value })}
                                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs" 
                                        />
                                    ) : (
                                        <div className="font-bold text-blue-600 truncate flex items-center">
                                            <ExternalLink size={12} className="mr-1 shrink-0" />
                                            <a href={selectedWebProject.website?.startsWith('http') ? selectedWebProject.website : `https://${selectedWebProject.website}`} target="_blank" rel="noreferrer" className="truncate hover:underline">
                                                {selectedWebProject.website || 'N/A'}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Assigned Web Developer</label>
                                    {isEditingWebClient ? (
                                        <select 
                                            value={webEditData.assignedDeveloper || ''}
                                            onChange={e => setWebEditData({ ...webEditData, assignedDeveloper: e.target.value })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                                        >
                                            <option value="">-- Choose Developer --</option>
                                            {(() => {
                                                const devs = getEmployeesByRole('developer');
                                                if (devs.length > 0) {
                                                    return devs.map(emp => (
                                                        <option key={emp._id} value={emp._id}>
                                                            {emp.firstName} {emp.lastName} ({emp.role})
                                                        </option>
                                                    ));
                                                }
                                                return (
                                                    <>
                                                        <option value="" disabled>⚠️ No employee with 'Web Developer' role found</option>
                                                        <optgroup label="Other Available Staff">
                                                            {employees.map(emp => (
                                                                <option key={emp._id} value={emp._id}>
                                                                    {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </>
                                                );
                                            })()}
                                        </select>
                                    ) : (
                                        <div className="font-bold text-slate-800">
                                            {getEmployeeDisplayName(selectedWebProject.assignedDeveloper, 'Not Assigned')}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Client Status</label>
                                    {isEditingWebClient ? (
                                        <select 
                                            value={webEditData.clientStatus || 'Pending'}
                                            onChange={e => setWebEditData({ ...webEditData, clientStatus: e.target.value })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Onboarding">Onboarding</option>
                                            <option value="Active">Active</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    ) : (
                                        <span className="font-bold text-slate-800">{selectedWebProject.clientStatus || 'Pending'}</span>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Project Status</label>
                                    {isEditingWebClient ? (
                                        <select 
                                            value={webEditData.projectStatus || 'Pending'}
                                            onChange={e => setWebEditData({ ...webEditData, projectStatus: e.target.value })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Testing">Testing</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    ) : (
                                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                            selectedWebProject.projectStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                                        }`}>
                                            {selectedWebProject.projectStatus || 'Pending'}
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Workflow / Project Type</label>
                                    {isEditingWebClient ? (
                                        <select 
                                            value={webEditData.websiteType || 'Normal'}
                                            onChange={e => setWebEditData({ ...webEditData, websiteType: e.target.value })}
                                            className="w-full px-2.5 py-1.5 border border-indigo-300 bg-indigo-50/60 rounded-lg text-xs font-bold text-indigo-950 focus:ring-1 focus:ring-indigo-500"
                                        >
                                            <option value="Normal">📋 Normal (Requirements & Changes)</option>
                                            <option value="E-Commerce">🛒 E-Commerce (17 Tasks Checklist)</option>
                                            <option value="Static">🌐 Static (10 Tasks Checklist)</option>
                                        </select>
                                    ) : (
                                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${selectedWebProject.websiteType === 'Normal' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                            {selectedWebProject.websiteType === 'Normal' ? 'Requirements' : `${selectedWebProject.websiteType || 'Normal'} Checklist`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* WORKFLOW BASED ON WEBSITE TYPE & ACTIVE WORKFLOW SUB-TAB */}
                        {(() => {
                            const activeWorkflowMode = webWorkflowTab || (selectedWebProject.websiteType === 'Normal' ? 'requirements' : 'checklist');
                            const checklistItems = selectedWebProject.checklist || [];
                            const completedChecklistCount = checklistItems.filter(i => i.status === 'Completed').length;
                            const reqItems = selectedWebProject.requirements || [];

                            return (
                                <div className="space-y-4">
                                    {/* Workflow Sub-Tabs */}
                                    <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                                        <div className="flex items-center space-x-2 bg-slate-100/90 p-1 rounded-xl text-xs font-semibold">
                                            <button
                                                type="button"
                                                onClick={() => setWebWorkflowTab('checklist')}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                    activeWorkflowMode === 'checklist'
                                                        ? 'bg-white text-blue-600 shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                <CheckSquare size={13} />
                                                <span>Milestone Checklist</span>
                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">
                                                    {checklistItems.length}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setWebWorkflowTab('requirements')}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                    activeWorkflowMode === 'requirements'
                                                        ? 'bg-white text-indigo-600 shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                <Layers size={13} />
                                                <span>Requirements & Changes</span>
                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-700 font-bold">
                                                    {reqItems.length}
                                                </span>
                                            </button>
                                        </div>

                                        <div className="text-[11px] text-slate-500 font-medium">
                                            Current Project Type: <strong className="text-slate-800 uppercase">{selectedWebProject.websiteType || 'Normal'}</strong>
                                        </div>
                                    </div>

                                    {activeWorkflowMode === 'checklist' ? (
                                        /* CHECKLIST VIEW FOR E-COMMERCE, STATIC & CUSTOM */
                                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                                                <div>
                                                    <h3 className="text-base font-bold text-slate-900">{selectedWebProject.websiteType === 'Normal' ? 'Custom' : selectedWebProject.websiteType} Milestone Checklist</h3>
                                                    <p className="text-xs text-slate-400 mt-0.5">Click any checklist item to toggle its completion status.</p>
                                                </div>
                                                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                                    {completedChecklistCount} / {checklistItems.length} Completed
                                                </div>
                                            </div>

                                            {/* Custom checklist item form */}
                                            <form onSubmit={handleAddCustomWebChecklist} className="flex gap-2 mb-6">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add custom milestone / checklist item..." 
                                                    value={customWebChecklistInput}
                                                    onChange={e => setCustomWebChecklistInput(e.target.value)}
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                                                />
                                                <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer">
                                                    <Plus size={15} />
                                                </button>
                                            </form>

                                            {checklistItems.length === 0 ? (
                                                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                                                    <CheckSquare size={28} className="mx-auto text-slate-400" />
                                                    <h4 className="text-xs font-bold text-slate-700">No Checklist Items in this Project</h4>
                                                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                                                        This project is currently set to <strong>Normal</strong> (Requirements workflow). You can change it to <strong>E-Commerce</strong> or <strong>Static</strong> in <em>Edit Project Info</em> to automatically populate the standard checklist milestones, or add custom milestones above.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {checklistItems.map(item => (
                                                        <div 
                                                            key={item._id}
                                                            onClick={() => handleToggleWebChecklist(item._id)}
                                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                                item.status === 'Completed'
                                                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                                                : 'bg-slate-50/60 border-slate-100 hover:bg-white hover:border-slate-200 text-slate-800'
                                                            }`}
                                                        >
                                                            <div className="flex items-center space-x-2.5">
                                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                                                                    item.status === 'Completed' ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                                                }`}>
                                                                    {item.status === 'Completed' && <Check size={12} strokeWidth={3} />}
                                                                </div>
                                                                <span className={`text-xs font-semibold ${item.status === 'Completed' ? 'line-through text-emerald-800/70' : ''}`}>
                                                                    {item.item}
                                                                </span>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteWebChecklistItem(item._id); }}
                                                                className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* REQUIREMENTS & CHANGES VIEW */
                                        <div className="space-y-6">
                                            {/* Add Requirement / Change Form */}
                                            <div className="bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-xs">
                                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add Requirement / Client Change</h3>
                                                <form onSubmit={handleAddWebRequirement} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                                    <div className="md:col-span-2">
                                                        <select 
                                                            value={webReqType}
                                                            onChange={e => setWebReqType(e.target.value)}
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                                        >
                                                            <option value="Requirement">Requirement</option>
                                                            <option value="Change">Change</option>
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-6">
                                                        <input 
                                                            required
                                                            type="text" 
                                                            placeholder="Describe the task or change request..." 
                                                            value={webReqInput}
                                                            onChange={e => setWebReqInput(e.target.value)}
                                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <select 
                                                            value={webReqEmployee}
                                                            onChange={e => setWebReqEmployee(e.target.value)}
                                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                                        >
                                                            <option value="">Assigned: {getEmployeeDisplayName(selectedWebProject.assignedDeveloper, 'Default')}</option>
                                                            {employees.map(emp => (
                                                                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role || 'Staff'})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">
                                                            Add
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>

                                            {/* Two Columns: Requirements vs Changes */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Left: Requirements */}
                                                <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                                                    <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                                                        <span>Project Requirements</span>
                                                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                                            {(selectedWebProject.requirements || []).filter(r => r.type === 'Requirement').length}
                                                        </span>
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {(selectedWebProject.requirements || []).filter(r => r.type === 'Requirement').map(item => (
                                                            <div key={item._id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between">
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-slate-800">{item.description}</h4>
                                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                                        Assigned: <strong className="text-slate-600">{item.assignedEmployee?.firstName} {item.assignedEmployee?.lastName}</strong>
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center space-x-2 shrink-0">
                                                                    <select
                                                                        value={item.status}
                                                                        onChange={e => handleUpdateWebReqStatus(item._id, e.target.value)}
                                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                                            item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                        }`}
                                                                    >
                                                                        <option value="Pending">Pending</option>
                                                                        <option value="Completed">Completed</option>
                                                                    </select>
                                                                    <button onClick={() => handleDeleteWebReq(item._id)} className="text-slate-300 hover:text-red-500">
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(selectedWebProject.requirements || []).filter(r => r.type === 'Requirement').length === 0 && (
                                                            <div className="text-center py-8 text-xs text-slate-400 font-medium">No initial requirements added.</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Changes */}
                                                <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                                                    <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                                                        <span>Client Change Requests</span>
                                                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full font-bold">
                                                            {(selectedWebProject.requirements || []).filter(r => r.type === 'Change').length}
                                                        </span>
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {(selectedWebProject.requirements || []).filter(r => r.type === 'Change').map(item => (
                                                            <div key={item._id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start justify-between">
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-slate-800">{item.description}</h4>
                                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                                        Assigned: <strong className="text-slate-600">{item.assignedEmployee?.firstName} {item.assignedEmployee?.lastName}</strong>
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center space-x-2 shrink-0">
                                                                    <select
                                                                        value={item.status}
                                                                        onChange={e => handleUpdateWebReqStatus(item._id, e.target.value)}
                                                                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                                            item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                        }`}
                                                                    >
                                                                        <option value="Pending">Pending</option>
                                                                        <option value="Completed">Completed</option>
                                                                    </select>
                                                                    <button onClick={() => handleDeleteWebReq(item._id)} className="text-slate-300 hover:text-red-500">
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(selectedWebProject.requirements || []).filter(r => r.type === 'Change').length === 0 && (
                                                            <div className="text-center py-8 text-xs text-slate-400 font-medium">No client changes requested yet.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Timeline & Payments Strip */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Project Timeline & Payment Milestones</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.startDate ? new Date(selectedWebProject.startDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { startDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target End Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.endDate ? new Date(selectedWebProject.endDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { endDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Advance Payment Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.advancePaymentDate ? new Date(selectedWebProject.advancePaymentDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { advancePaymentDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Full Payment Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.fullPaymentDate ? new Date(selectedWebProject.fullPaymentDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { fullPaymentDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                   TAB 4: SEO PROJECTS HUB
                ========================================================================= */}
                {mainTab === 'seo' && !selectedSeoProject && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">SEO Projects</h2>
                                <p className="text-xs text-slate-500 font-medium">46-Point Master SEO Checklist, specialist assignment, and custom On-Page/Off-Page tasks.</p>
                            </div>
                            <button 
                                onClick={() => setIsAddSeoModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                            >
                                <Plus size={16} className="mr-1.5" /> Add SEO Client
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {seoProjects.map(project => {
                                const completedCount = (project.checklist || []).filter(i => i.isCompleted).length;
                                const totalCount = (project.checklist || []).length;
                                const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                return (
                                    <div 
                                        key={project._id}
                                        onClick={() => loadSingleSeoProject(project._id)}
                                        className="p-1.5 bg-slate-50/80 rounded-[1.75rem] border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative"
                                    >
                                        <div className="bg-white rounded-[1.25rem] p-6 shadow-xs h-full flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                                                        <Search size={22} />
                                                    </div>
                                                    <button 
                                                        onClick={(e) => handleDeleteSeoProject(e, project._id)}
                                                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                                                        title="Delete Project"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>

                                                <h3 className="font-bold text-slate-900 text-base mb-0.5">{project.businessName}</h3>
                                                <p className="text-xs text-slate-500 font-medium mb-3">{project.clientName}</p>

                                                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                                                    {project.website && (
                                                        <div className="flex items-center text-blue-600 truncate">
                                                            <LinkIcon size={12} className="mr-1.5 shrink-0" />
                                                            <span className="truncate">{project.website}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center text-slate-600">
                                                        <User size={12} className="mr-1.5 shrink-0 text-slate-400" />
                                                        <span>SEO Specialist: <strong>{project.assignedSpecialist ? `${project.assignedSpecialist.firstName} ${project.assignedSpecialist.lastName}` : 'Unassigned'}</strong></span>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-1 mb-2">
                                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                                        <span>Checklist Progress</span>
                                                        <span className="text-blue-700">{progressPct}%</span>
                                                    </div>
                                                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPct}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                    {completedCount} / {totalCount} Tasks Done
                                                </span>
                                                <span className="text-xs font-bold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
                                                    Open Checklist <ChevronRight size={14} className="ml-0.5" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {seoProjects.length === 0 && (
                                <div className="col-span-full py-16 text-center bg-white rounded-[1.75rem] border border-slate-100">
                                    <Search size={36} className="mx-auto text-slate-300 mb-3" />
                                    <h4 className="font-bold text-slate-800">No SEO Projects Found</h4>
                                    <p className="text-xs text-slate-400 mt-1">Click "Add SEO Client" to create an SEO campaign with the 46-point master checklist.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SEO DRILL-DOWN WORKSPACE */}
                {mainTab === 'seo' && selectedSeoProject && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={() => setSelectedSeoProject(null)}
                                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 cursor-pointer"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-xl font-bold text-slate-900">{selectedSeoProject.businessName}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            SEO Campaign
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Client: {selectedSeoProject.clientName} {selectedSeoProject.website && `· ${selectedSeoProject.website}`}
                                    </p>
                                </div>
                            </div>

                            {/* Specialist Picker */}
                            <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-500">Specialist:</span>
                                <select
                                    value={selectedSeoProject.assignedSpecialist?._id || ''}
                                    onChange={e => axios.put(`http://localhost:5000/api/team-management/seo/${selectedSeoProject._id}`, { assignedSpecialist: e.target.value }, { headers: getHeaders() }).then(() => loadSingleSeoProject(selectedSeoProject._id))}
                                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                                >
                                    <option value="">-- Choose SEO Specialist --</option>
                                    {(() => {
                                        const seos = getEmployeesByRole('seo');
                                        if (seos.length > 0) {
                                            return seos.map(emp => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.firstName} {emp.lastName} ({emp.role})
                                                </option>
                                            ));
                                        }
                                        return (
                                            <>
                                                <option value="" disabled>⚠️ No employee with 'SEO Analyst' role found</option>
                                                <optgroup label="Other Available Staff">
                                                    {employees.map(emp => (
                                                        <option key={emp._id} value={emp._id}>
                                                            {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </>
                                        );
                                    })()}
                                </select>
                            </div>
                        </div>

                        {/* 46-POINT MASTER CHECKLIST CARD */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs space-y-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">46-Point Master SEO Checklist</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Click any checklist task to toggle its completion state.</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {['All', 'Keyword Research & Technical SEO', 'Content & On-Page SEO', 'Off-Page SEO Tasks', 'Local SEO Tasks'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSeoCategoryFilter(cat)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                                seoCategoryFilter === cat
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat === 'All' ? 'All (46)' : cat.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(selectedSeoProject.checklist || [])
                                    .filter(item => seoCategoryFilter === 'All' || item.category === seoCategoryFilter)
                                    .map(item => (
                                        <div 
                                            key={item._id}
                                            onClick={() => handleToggleSeoChecklist(item._id)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                                                item.isCompleted
                                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                                : 'bg-slate-50/70 border-slate-100 hover:bg-white hover:border-slate-200 text-slate-800'
                                            }`}
                                        >
                                            <div className="flex items-start space-x-2.5">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                                    item.isCompleted ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                                }`}>
                                                    {item.isCompleted && <Check size={12} strokeWidth={3} />}
                                                </div>
                                                <div>
                                                    <span className={`text-xs font-semibold block leading-snug ${item.isCompleted ? 'line-through text-emerald-800/60' : ''}`}>
                                                        {item.taskName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium block mt-1">
                                                        {item.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* CUSTOM SEO TASKS (ON-PAGE, OFF-PAGE, TECHNICAL, ADS) */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-slate-900">Custom SEO Tasks & Campaigns</h3>
                            
                            <form onSubmit={handleAddSeoCustomTask} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-2">
                                    <select 
                                        value={seoCustomTaskForm.type}
                                        onChange={e => setSeoCustomTaskForm({ ...seoCustomTaskForm, type: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                    >
                                        <option value="OnPage">OnPage SEO</option>
                                        <option value="OffPage">OffPage SEO</option>
                                        <option value="Technical">Technical</option>
                                        <option value="GoogleAds">Google Ads</option>
                                    </select>
                                </div>
                                <div className="md:col-span-6">
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Specific task details (e.g. Publish guest post on TechCrunch)..." 
                                        value={seoCustomTaskForm.description}
                                        onChange={e => setSeoCustomTaskForm({ ...seoCustomTaskForm, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <select 
                                        value={seoCustomTaskForm.assignedEmployee}
                                        onChange={e => setSeoCustomTaskForm({ ...seoCustomTaskForm, assignedEmployee: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                    >
                                        <option value="">Assigned: {selectedSeoProject.assignedSpecialist?.firstName || 'Default'}</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role || 'Staff'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs">
                                        Add
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-2.5 pt-2">
                                {(selectedSeoProject.customTasks || []).map(task => (
                                    <div key={task._id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-3">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                                                {task.type}
                                            </span>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{task.description}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Assigned to: <strong className="text-slate-600">{task.assignedEmployee?.firstName} {task.assignedEmployee?.lastName}</strong>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <select
                                                value={task.status}
                                                onChange={e => handleUpdateSeoCustomTaskStatus(task._id, e.target.value)}
                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                    task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                            <button onClick={() => handleDeleteSeoCustomTask(task._id)} className="text-slate-300 hover:text-red-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(selectedSeoProject.customTasks || []).length === 0 && (
                                    <div className="text-center py-6 text-xs text-slate-400 font-medium">No custom tasks scheduled yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                   TAB 5: ALL TEAM TASKS VIEW
                ========================================================================= */}
                {mainTab === 'all-tasks' && (
                    <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs space-y-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">All Project Linked Tasks</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Live status and completion monitor across Social Media, Web Development, and SEO teams.</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {['all', 'Pending', 'Completed'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => {
                                            setTaskFilter(f);
                                            setTasksPage(1);
                                        }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                                            taskFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                                    <tr>
                                        <th className="py-3 px-5">Task Details</th>
                                        <th className="py-3 px-5">Assigned Employee</th>
                                        <th className="py-3 px-5">Due Date</th>
                                        <th className="py-3 px-5">Priority</th>
                                        <th className="py-3 px-5">Status</th>
                                        <th className="py-3 px-5 text-right">Toggle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {(() => {
                                        const filteredTasks = allTasks.filter(t => taskFilter === 'all' || t.status === taskFilter);
                                        const paginatedTasks = filteredTasks.slice((tasksPage - 1) * tasksPerPage, tasksPage * tasksPerPage);

                                        if (filteredTasks.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                                                        No tasks found on record.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return paginatedTasks.map(task => (
                                            <tr key={task._id} className="hover:bg-slate-50/50">
                                                <td className="py-3.5 px-5">
                                                    <div className={`font-bold text-slate-900 ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                                                        {task.title}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5 max-w-sm truncate">
                                                        {task.description || 'No description'}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    {task.employeeId ? (
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                                                {task.employeeId.firstName?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 text-[11px]">
                                                                    {task.employeeId.firstName} {task.employeeId.lastName}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">{task.employeeId.department || 'Team'}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-5 font-medium">
                                                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                        task.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {task.priority || 'Normal'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5">
                                                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                                        task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 text-right">
                                                    <button 
                                                        onClick={() => handleToggleGeneralTaskStatus(task._id, task.status)}
                                                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                                            task.status === 'Completed'
                                                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                                                        }`}
                                                    >
                                                        {task.status === 'Completed' ? 'Mark Pending' : 'Mark Done'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar for Tasks */}
                        {(() => {
                            const filteredTasks = allTasks.filter(t => taskFilter === 'all' || t.status === taskFilter);
                            const totalPages = Math.ceil(filteredTasks.length / tasksPerPage) || 1;
                            if (filteredTasks.length <= tasksPerPage) return null;

                            return (
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <div className="text-xs text-slate-500 font-medium">
                                        Showing {(tasksPage - 1) * tasksPerPage + 1} to {Math.min(tasksPage * tasksPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            disabled={tasksPage === 1}
                                            onClick={() => setTasksPage(prev => Math.max(prev - 1, 1))}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs font-bold text-slate-600 px-2">
                                            Page {tasksPage} of {totalPages}
                                        </span>
                                        <button
                                            disabled={tasksPage >= totalPages}
                                            onClick={() => setTasksPage(prev => Math.min(prev + 1, totalPages))}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* =========================================================================
                   MODALS
                ========================================================================= */}
                {/* 1. Add Social Media Client Modal */}
                {isAddSmModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Social Media Client</h3>
                            <p className="text-xs text-slate-400 mb-6">Onboard a client for monthly reels, shoots, and graphic designs.</p>
                            
                            <form onSubmit={handleCreateSmProject} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Client Contact Name *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="e.g. John Doe"
                                        value={newSmForm.clientName}
                                        onChange={e => setNewSmForm({ ...newSmForm, clientName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Business Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Skite Digital Agency"
                                        value={newSmForm.businessName}
                                        onChange={e => setNewSmForm({ ...newSmForm, businessName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Phone</label>
                                        <input 
                                            type="text" 
                                            placeholder="+91 98765 43210"
                                            value={newSmForm.phone}
                                            onChange={e => setNewSmForm({ ...newSmForm, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="client@gmail.com"
                                            value={newSmForm.email}
                                            onChange={e => setNewSmForm({ ...newSmForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Month Tracker</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. October 2026"
                                        value={newSmForm.month}
                                        onChange={e => setNewSmForm({ ...newSmForm, month: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                
                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddSmModalOpen(false)}
                                        className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-1/2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                                    >
                                        Save Client
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2. Add Social Media Content / Workflow Step Modal */}
                {isAddSmItemModalOpen && selectedSmProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                        <div className={`bg-white rounded-[2rem] p-6 md:p-8 w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto ${
                            smWorkflowTab === 'Post' ? 'max-w-2xl' : 'max-w-md'
                        }`}>
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">
                                        {smWorkflowTab === 'Post' ? 'Schedule Reel & Assign Production Team' : `Add ${smWorkflowTab} Task`}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {smWorkflowTab === 'Post'
                                            ? 'Set Target Post Date and assign Script, Shoot, Edit, and Post production team in a single form.'
                                            : 'Assign directly to employee. This creates an automatic linked task.'}
                                    </p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                                    {selectedSmProject.businessName || selectedSmProject.clientName}
                                </span>
                            </div>
                            
                            <form onSubmit={handleAddSmItem} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            {smWorkflowTab === 'Post' ? 'Target Post Date (Live Date) *' : 'Target Date *'}
                                        </label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={smItemForm.date}
                                            onChange={e => handleSmDateChange(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                        />
                                    </div>
                                    {smWorkflowTab === 'Post' ? (
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1">Post Time</label>
                                            <input 
                                                type="time" 
                                                value={smItemForm.startTime}
                                                onChange={e => setSmItemForm({ ...smItemForm, startTime: e.target.value, endTime: '' })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-1">Start Time</label>
                                                <input 
                                                    type="time" 
                                                    value={smItemForm.startTime}
                                                    onChange={e => setSmItemForm({ ...smItemForm, startTime: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-1">End Time</label>
                                                <input 
                                                    type="time" 
                                                    value={smItemForm.endTime}
                                                    onChange={e => setSmItemForm({ ...smItemForm, endTime: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">
                                        {smWorkflowTab === 'Post' ? 'Reel Topic / Hook / Instructions *' : 'Details & Description *'}
                                    </label>
                                    <textarea 
                                        required
                                        rows={smWorkflowTab === 'Post' ? 2 : 3}
                                        placeholder="Describe the content idea, hook, or design specs..."
                                        value={smItemForm.details}
                                        onChange={e => setSmItemForm({ ...smItemForm, details: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>

                                {/* IF POST TAB: SHOW 4-STAGE PIPELINE ASSIGNMENT */}
                                {smWorkflowTab === 'Post' ? (
                                    <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-3">
                                        <div className="flex items-center space-x-2 text-blue-950 font-bold text-xs">
                                            <Sparkles size={16} className="text-blue-600" />
                                            <span>4-Stage Reel Production Team Assignment</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Stage 1: Script Writer */}
                                            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <FileText size={14} className="mr-1.5 text-blue-600" /> 1. Script Writer
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.scriptDate}
                                                        onChange={e => setSmItemForm({ ...smItemForm, scriptDate: e.target.value })}
                                                        className="text-[10px] font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                                        title="Script Target Date"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.scriptWriterId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, scriptWriterId: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                                >
                                                    <option value="">-- Choose Content Writer --</option>
                                                    {(() => {
                                                        const matches = getEmployeesByRole('script');
                                                        if (matches.length > 0) {
                                                            return matches.map(emp => (
                                                                <option key={emp._id} value={emp._id}>
                                                                    {emp.firstName} {emp.lastName} ({emp.role})
                                                                </option>
                                                            ));
                                                        }
                                                        return (
                                                            <>
                                                                <option value="" disabled>⚠️ No employee with 'Content Writer' role found</option>
                                                                <optgroup label="Other Available Staff">
                                                                    {employees.map(emp => (
                                                                        <option key={emp._id} value={emp._id}>
                                                                            {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            </>
                                                        );
                                                    })()}
                                                </select>
                                            </div>

                                            {/* Stage 2: Shoot Person */}
                                            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <Video size={14} className="mr-1.5 text-purple-600" /> 2. Shoot Person
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.shootDate}
                                                        onChange={e => setSmItemForm({ ...smItemForm, shootDate: e.target.value })}
                                                        className="text-[10px] font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                                        title="Shoot Target Date"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.shooterId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, shooterId: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                                >
                                                    <option value="">-- Choose Videographer / Shooter --</option>
                                                    {(() => {
                                                        const matches = getEmployeesByRole('shoot');
                                                        if (matches.length > 0) {
                                                            return matches.map(emp => (
                                                                <option key={emp._id} value={emp._id}>
                                                                    {emp.firstName} {emp.lastName} ({emp.role})
                                                                </option>
                                                            ));
                                                        }
                                                        return (
                                                            <>
                                                                <option value="" disabled>⚠️ No employee with 'Videographer' role found</option>
                                                                <optgroup label="Other Available Staff (Optional)">
                                                                    {employees.map(emp => (
                                                                        <option key={emp._id} value={emp._id}>
                                                                            {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            </>
                                                        );
                                                    })()}
                                                </select>
                                            </div>

                                            {/* Stage 3: Video Editor */}
                                            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <Palette size={14} className="mr-1.5 text-amber-600" /> 3. Video Editor
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.editDate}
                                                        onChange={e => setSmItemForm({ ...smItemForm, editDate: e.target.value })}
                                                        className="text-[10px] font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                                        title="Edit Target Date"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.editorId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, editorId: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                                >
                                                    <option value="">-- Choose Video Editor --</option>
                                                    {(() => {
                                                        const matches = getEmployeesByRole('edit');
                                                        if (matches.length > 0) {
                                                            return matches.map(emp => (
                                                                <option key={emp._id} value={emp._id}>
                                                                    {emp.firstName} {emp.lastName} ({emp.role})
                                                                </option>
                                                            ));
                                                        }
                                                        return (
                                                            <>
                                                                <option value="" disabled>⚠️ No employee with 'Video Editor' role found</option>
                                                                <optgroup label="Other Available Staff (Optional)">
                                                                    {employees.map(emp => (
                                                                        <option key={emp._id} value={emp._id}>
                                                                            {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            </>
                                                        );
                                                    })()}
                                                </select>
                                            </div>

                                            {/* Stage 4: Social Media Poster */}
                                            <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <Send size={14} className="mr-1.5 text-emerald-600" /> 4. Social Media Poster
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.date}
                                                        onChange={e => handleSmDateChange(e.target.value)}
                                                        className="text-[10px] font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-md"
                                                        title="Post Target Date (Live Date)"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.posterId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, posterId: e.target.value, assignedEmployee: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                                                >
                                                    <option value="">-- Choose Poster / Publisher --</option>
                                                    {(() => {
                                                        const matches = getEmployeesByRole('post');
                                                        if (matches.length > 0) {
                                                            return matches.map(emp => (
                                                                <option key={emp._id} value={emp._id}>
                                                                    {emp.firstName} {emp.lastName} ({emp.role})
                                                                </option>
                                                            ));
                                                        }
                                                        return employees.map(emp => (
                                                            <option key={emp._id} value={emp._id}>
                                                                {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                            </option>
                                                        ));
                                                    })()}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Single Task Mode for Script, Shoot, Edit, Design */
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            {smWorkflowTab === 'Script' && 'Assign Script / Content Writer *'}
                                            {smWorkflowTab === 'Shoot' && 'Assign Videographer / Creator *'}
                                            {smWorkflowTab === 'Edit' && 'Assign Video Editor *'}
                                            {smWorkflowTab === 'Design' && 'Assign Graphic Designer *'}
                                        </label>
                                        <select 
                                            required
                                            value={smItemForm.assignedEmployee}
                                            onChange={e => setSmItemForm({ ...smItemForm, assignedEmployee: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        >
                                            <option value="">-- Select Team Member --</option>
                                            {(() => {
                                                const matches = getEmployeesByRole(smWorkflowTab);
                                                if (matches.length > 0) {
                                                    return matches.map(emp => (
                                                        <option key={emp._id} value={emp._id}>
                                                            {emp.firstName} {emp.lastName} ({emp.role})
                                                        </option>
                                                    ));
                                                }
                                                return (
                                                    <>
                                                        <option value="" disabled>⚠️ No employee with '{smWorkflowTab}' role found</option>
                                                        <optgroup label="Other Available Staff">
                                                            {employees.map(emp => (
                                                                <option key={emp._id} value={emp._id}>
                                                                    {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </>
                                                );
                                            })()}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1">This will automatically create a Task in this employee's dashboard.</p>
                                    </div>
                                )}
                                
                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddSmItemModalOpen(false)}
                                        className="w-1/3 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-2/3 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs flex items-center justify-center space-x-1.5"
                                    >
                                        <Sparkles size={14} />
                                        <span>
                                            {smWorkflowTab === 'Post' ? 'Create & Assign Production Tasks' : 'Create & Assign Task'}
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2b. Edit Social Media Workflow Step / Reassign Employee Modal */}
                {isEditSmItemModalOpen && selectedSmProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Edit {editSmItemForm.type} Task</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Reassign employee, update target date or details.</p>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                                    {editSmItemForm.type} Stage
                                </span>
                            </div>

                            <form onSubmit={handleSaveEditSmItem} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">
                                            {editSmItemForm.type === 'Post' ? 'Target Post Date (Live Date) *' : 'Target Date *'}
                                        </label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={editSmItemForm.date}
                                            onChange={e => setEditSmItemForm({ ...editSmItemForm, date: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                        />
                                    </div>

                                    {editSmItemForm.type === 'Post' ? (
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1">Post Time</label>
                                            <input 
                                                type="time" 
                                                value={editSmItemForm.startTime}
                                                onChange={e => setEditSmItemForm({ ...editSmItemForm, startTime: e.target.value, endTime: '' })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-1">Start Time</label>
                                                <input 
                                                    type="time" 
                                                    value={editSmItemForm.startTime}
                                                    onChange={e => setEditSmItemForm({ ...editSmItemForm, startTime: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-1">End Time</label>
                                                <input 
                                                    type="time" 
                                                    value={editSmItemForm.endTime}
                                                    onChange={e => setEditSmItemForm({ ...editSmItemForm, endTime: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Details & Description *</label>
                                    <textarea 
                                        required
                                        rows={3}
                                        value={editSmItemForm.details}
                                        onChange={e => setEditSmItemForm({ ...editSmItemForm, details: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>

                                {/* Reassign Employee Dropdown */}
                                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                                    <label className="text-xs font-bold text-blue-900 block mb-1">
                                        Reassign Employee / Team Member *
                                    </label>
                                    <select 
                                        required
                                        value={editSmItemForm.assignedEmployee}
                                        onChange={e => setEditSmItemForm({ ...editSmItemForm, assignedEmployee: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-bold outline-none"
                                    >
                                        <option value="">-- Select Employee --</option>
                                        {(() => {
                                            const matches = getEmployeesByRole(editSmItemForm.type);
                                            if (matches.length > 0) {
                                                return matches.map(emp => (
                                                    <option key={emp._id} value={emp._id}>
                                                        {emp.firstName} {emp.lastName} ({emp.role})
                                                    </option>
                                                ));
                                            }
                                            return (
                                                <>
                                                    <option value="" disabled>⚠️ No employee with '{editSmItemForm.type}' role found</option>
                                                    <optgroup label="Other Available Staff">
                                                        {employees.map(emp => (
                                                            <option key={emp._id} value={emp._id}>
                                                                {emp.firstName} {emp.lastName} ({emp.role || 'Staff'})
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                </>
                                            );
                                        })()}
                                    </select>
                                    <p className="text-[10px] text-blue-700 mt-1">
                                        Choosing a different employee will automatically transfer the task to their personal dashboard.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Stage Status</label>
                                    <select 
                                        value={editSmItemForm.status}
                                        onChange={e => setEditSmItemForm({ ...editSmItemForm, status: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>

                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditSmItemModalOpen(false)}
                                        className="w-1/3 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-2/3 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                                    >
                                        Save & Reassign Task
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 3. Add Web Dev Client Modal */}
                {isAddWebModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Web Development Client</h3>
                            <p className="text-xs text-slate-400 mb-6">Create a new website build with automatic milestone checklists.</p>
                            
                            <form onSubmit={handleCreateWebProject} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Client Contact Name *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="e.g. Michael Scott"
                                        value={newWebForm.clientName}
                                        onChange={e => setNewWebForm({ ...newWebForm, clientName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Business Name *</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="e.g. Dunder Mifflin Paper Co."
                                        value={newWebForm.businessName}
                                        onChange={e => setNewWebForm({ ...newWebForm, businessName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Website URL</label>
                                    <input 
                                        type="text" 
                                        placeholder="www.dundermifflin.com"
                                        value={newWebForm.website}
                                        onChange={e => setNewWebForm({ ...newWebForm, website: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Website Type</label>
                                        <select 
                                            value={newWebForm.websiteType}
                                            onChange={e => setNewWebForm({ ...newWebForm, websiteType: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        >
                                            <option value="Normal">Normal (Requirements/Changes)</option>
                                            <option value="E-Commerce">E-Commerce (17 Tasks)</option>
                                            <option value="Static">Static (11 Tasks)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Developer</label>
                                        <select 
                                            value={newWebForm.assignedDeveloper}
                                            onChange={e => setNewWebForm({ ...newWebForm, assignedDeveloper: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                        >
                                            <option value="">-- Choose Dev --</option>
                                            {(() => {
                                                const devs = getEmployeesByRole('developer');
                                                if (devs.length > 0) {
                                                    return devs.map(emp => (
                                                        <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role})</option>
                                                    ));
                                                }
                                                return (
                                                    <>
                                                        <option value="" disabled>⚠️ No employee with 'Web Developer' role found</option>
                                                        <optgroup label="Other Available Staff">
                                                            {employees.map(emp => (
                                                                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role || 'Staff'})</option>
                                                            ))}
                                                        </optgroup>
                                                    </>
                                                );
                                            })()}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Phone</label>
                                        <input 
                                            type="text" 
                                            placeholder="+91 98765 43210"
                                            value={newWebForm.phone}
                                            onChange={e => setNewWebForm({ ...newWebForm, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="client@gmail.com"
                                            value={newWebForm.email}
                                            onChange={e => setNewWebForm({ ...newWebForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddWebModalOpen(false)}
                                        className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-1/2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                                    >
                                        Save Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 4. Add SEO Client Modal */}
                {isAddSeoModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Add SEO Client</h3>
                            <p className="text-xs text-slate-400 mb-6">Initializes the 46-Point Master SEO checklist across all categories.</p>
                            
                            <form onSubmit={handleCreateSeoProject} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Client Contact Name *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="e.g. Bruce Wayne"
                                        value={newSeoForm.clientName}
                                        onChange={e => setNewSeoForm({ ...newSeoForm, clientName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Business Name *</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="e.g. Wayne Enterprises"
                                        value={newSeoForm.businessName}
                                        onChange={e => setNewSeoForm({ ...newSeoForm, businessName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Website URL *</label>
                                    <input 
                                        type="text" 
                                        placeholder="www.wayne-enterprises.com"
                                        value={newSeoForm.website}
                                        onChange={e => setNewSeoForm({ ...newSeoForm, website: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Assigned SEO Specialist</label>
                                    <select 
                                        value={newSeoForm.assignedSpecialist}
                                        onChange={e => setNewSeoForm({ ...newSeoForm, assignedSpecialist: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                                    >
                                        <option value="">-- Choose SEO Specialist --</option>
                                        {(() => {
                                            const seos = getEmployeesByRole('seo');
                                            if (seos.length > 0) {
                                                return seos.map(emp => (
                                                    <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role})</option>
                                                ));
                                            }
                                            return (
                                                <>
                                                    <option value="" disabled>⚠️ No employee with 'SEO Analyst' role found</option>
                                                    <optgroup label="Other Available Staff">
                                                        {employees.map(emp => (
                                                            <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role || 'Staff'})</option>
                                                        ))}
                                                    </optgroup>
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Phone</label>
                                        <input 
                                            type="text" 
                                            placeholder="+91 98765 43210"
                                            value={newSeoForm.phone}
                                            onChange={e => setNewSeoForm({ ...newSeoForm, phone: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="client@gmail.com"
                                            value={newSeoForm.email}
                                            onChange={e => setNewSeoForm({ ...newSeoForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddSeoModalOpen(false)}
                                        className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-1/2 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                                    >
                                        Save SEO Campaign
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
