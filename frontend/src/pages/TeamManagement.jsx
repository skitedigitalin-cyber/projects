import React, { useState, useEffect, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import TeamOverview from '../components/TeamOverview';
import TeamLiveTasks from '../components/TeamLiveTasks';
import { AuthContext } from '../context/AuthContext';
import { 
    Briefcase, Share2, Globe, Search, Plus, Trash2, CheckCircle2, Clock, 
    Calendar, User, Phone, Mail, Link as LinkIcon, ExternalLink, ArrowLeft, 
    Check, Edit2, AlertCircle, Sparkles, Filter, ChevronRight, Layers,
    Video, FileText, Send, Palette, ListTodo, ShieldAlert, CheckSquare,
    DollarSign, ArrowUpRight
} from 'lucide-react';

function TeamProjectRail({ rows, selected, onOpen, onDelete, describe, metadata, badge, progress }) {
    return (
        <ul className="team-project-rail" aria-label="Projects">
            {rows.map(row => {
                const name = row.businessName || row.clientName;
                const current = row._id === selected?._id;
                const details = metadata(row);
                const completion = progress?.(row);
                return <li key={row._id} data-current={current}>
                    <button type="button" aria-pressed={current} onClick={() => onOpen(row._id)}>
                        <strong>{name}</strong><small>{describe(row)}</small>
                        {details && <small>{details}</small>}
                        <small>{badge(row)}</small>
                        {completion?.total > 0 && <progress value={completion.done} max={completion.total} aria-label={`${name} progress`} />}
                    </button>
                    <button type="button" aria-label={`Delete ${name}`} onClick={event => onDelete(event, row._id)}><Trash2 size={15} /></button>
                </li>;
            })}
        </ul>
    );
}

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
    const [showAllSmStages, setShowAllSmStages] = useState(true);
    const [smMonth, setSmMonth] = useState('');
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
            await axios.put(`http://localhost:5000/api/hr/tasks/${taskId}/status`, { status: newStatus }, { headers: getHeaders() });
            await Promise.all([
                fetchAllTasks(), fetchStats(),
                selectedSmProject && loadSingleSmProject(selectedSmProject._id),
                selectedWebProject && loadSingleWebProject(selectedWebProject._id),
                selectedSeoProject && loadSingleSeoProject(selectedSeoProject._id),
            ]);
        } catch (err) {
            alert('Failed to update task');
        }
    };

    const openDepartment = (department, project) => {
        setMainTab(department);
        if (department === 'social') {
            setSelectedSmProject(null);
            setSmMonth('');
            if (project) loadSingleSmProject(project._id);
        }
        if (department === 'webdev') {
            setSelectedWebProject(null);
            if (project) loadSingleWebProject(project._id);
        }
        if (department === 'seo') {
            setSelectedSeoProject(null);
            if (project) loadSingleSeoProject(project._id);
        }
    };

    const openCreateProject = department => {
        const actions = { social: setIsAddSmModalOpen, webdev: setIsAddWebModalOpen, seo: setIsAddSeoModalOpen };
        actions[department]?.(true);
    };

    const groupNames = { social: 'Social media', webdev: 'Website development', seo: 'SEO', 'all-tasks': 'Live' };
    const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()).slice(0, 7);
    const displayedSmItems = (selectedSmProject?.contentItems || []).filter(item => !smMonth || String(item.date).slice(0, 7) === smMonth);
    const moveSocialMonth = offset => {
        const [year, month] = (smMonth || currentMonth).split('-').map(Number);
        setSmMonth(new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7));
    };
    const socialItems = smProjects.flatMap(project => project.contentItems || []).filter(item => String(item.date).slice(0, 7) === currentMonth);
    const checklist = seoProjects.flatMap(project => project.checklist || []);
    const seoGroups = new Map();
    for (const item of selectedSeoProject?.checklist || []) {
        const items = seoGroups.get(item.category) || [];
        items.push(item);
        seoGroups.set(item.category, items);
    }

    const teamTitles = {
        social: [`${smProjects.length} ${smProjects.length === 1 ? 'client' : 'clients'}`, ` · ${socialItems.length} workflow items this month`],
        webdev: [`${webProjects.length} ${webProjects.length === 1 ? 'project' : 'projects'}`, ` · ${webProjects.filter(project => project.projectStatus === 'Testing').length} in testing`],
        seo: [`${seoProjects.length} ${seoProjects.length === 1 ? 'campaign' : 'campaigns'}`, ` · ${checklist.length ? Math.round(checklist.filter(item => item.isCompleted).length * 100 / checklist.length) : 0}% of checklist done`],
        'all-tasks': ['Live team tasks', ''],
    };
    const memberCanAssign = ['Admin', 'CEO'].includes(user?.role) || user?.activeModules?.includes('hr');
    const addProjectLabel = { social: 'Add client', webdev: 'Add web client', seo: 'Add SEO project' };

    const teamTabs = (
        <nav className="team-page-tabs" aria-label="Team views">
            {[
                ['overview', 'Department overview'], ['social', 'Social media'], ['webdev', 'Website development'],
                ['seo', 'SEO'], ['all-tasks', 'Live tasks'],
            ].map(([id, label]) => (
                <button key={id} type="button" aria-current={mainTab === id ? 'page' : undefined} onClick={() => openDepartment(id)}>{label}</button>
            ))}
        </nav>
    );

    return (
        <Layout workspace compactTools>
            <div className="team-workspace pb-12">
                {mainTab === 'overview' && (
                    <TeamOverview groups={{ social: smProjects, webdev: webProjects, seo: seoProjects }} tasks={allTasks} loading={loading} navigation={teamTabs}
                        onOpenProject={openDepartment} onOpenTasks={() => setMainTab('all-tasks')} onCreate={openCreateProject} />
                )}
                
                {mainTab !== 'overview' && (
                    <header className="team-reference-heading">
                        <div>
                            <p>Team management · {groupNames[mainTab]}</p>
                            <h1>{teamTitles[mainTab][0]}<span>{teamTitles[mainTab][1]}</span></h1>
                        </div>
                        {mainTab === 'all-tasks'
                            ? memberCanAssign && <Link className="team-page-primary" to="/hr/assign-task"><Plus size={15} /> Assign task</Link>
                            : <button type="button" className="team-page-primary" onClick={() => openCreateProject(mainTab)}><Plus size={15} /> {addProjectLabel[mainTab]}</button>}
                    </header>
                )}



                {mainTab !== 'overview' && teamTabs}

                {/* =========================================================================
                   TAB 1: DEPARTMENT OVERVIEW
                ========================================================================= */}
                {mainTab === 'overview' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Card 1: Social Media Hub */}
                            <div className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all duration-300">
                                <div className="bg-white rounded-[1.5rem] p-7 shadow-xs flex flex-col justify-between h-full">
                                    <div>
                                        <div className="w-14 h-14 rounded-2xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">
                                            <Share2 size={26} />
                                        </div>
                                        <h3 className="text-lg font-bold text-[#111111] mb-2">Social Media Marketing</h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                            4-Stage Reels Workflow (Script → Shoot → Edit → Post) and Post Schedules with direct Video Editor and Content Writer task automation.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">{smProjects.length} Active Clients</span>
                                        <button 
                                            onClick={() => { setMainTab('social'); setSelectedSmProject(null); }}
                                            className="px-4 py-2 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                                        >
                                            Open Hub <ChevronRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Web Dev Hub */}
                            <div className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all duration-300">
                                <div className="bg-white rounded-[1.5rem] p-7 shadow-xs flex flex-col justify-between h-full">
                                    <div>
                                        <div className="w-14 h-14 rounded-2xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">
                                            <Globe size={26} />
                                        </div>
                                        <h3 className="text-lg font-bold text-[#111111] mb-2">Website Development</h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                            Normal, E-Commerce (17-item checklist), & Static builds with assigned developer task dispatch, client requirements, changes, and payment milestones.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">{webProjects.length} Active Projects</span>
                                        <button 
                                            onClick={() => { setMainTab('webdev'); setSelectedWebProject(null); }}
                                            className="px-4 py-2 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                                        >
                                            Open Hub <ChevronRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: SEO Projects Hub */}
                            <div className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100 group hover:shadow-lg transition-all duration-300">
                                <div className="bg-white rounded-[1.5rem] p-7 shadow-xs flex flex-col justify-between h-full">
                                    <div>
                                        <div className="w-14 h-14 rounded-2xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center font-bold mb-6 group-hover:scale-110 transition-transform">
                                            <Search size={26} />
                                        </div>
                                        <h3 className="text-lg font-bold text-[#111111] mb-2">SEO Projects</h3>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                                            Standard 46-Task Master SEO Checklist across Technical, On-Page, Off-Page, and Local SEO, plus specialist assignments and custom task tracking.
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400">{seoProjects.length} Active Projects</span>
                                        <button 
                                            onClick={() => { setMainTab('seo'); setSelectedSeoProject(null); }}
                                            className="px-4 py-2 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold flex items-center transition-colors cursor-pointer shadow-xs"
                                        >
                                            Open Hub <ChevronRight size={14} className="ml-1" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Team Activity Feed */}
                        <div className="p-2 bg-[#f5f5f3]/80 rounded-[2rem] border border-slate-100">
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-[#111111]">Live Team Tasks Monitor</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Real-time status of tasks auto-assigned to developers, video editors, and SEO specialists</p>
                                    </div>
                                    <button 
                                        onClick={() => setMainTab('all-tasks')}
                                        className="text-xs font-bold text-[#3f3f3f] hover:text-[#111111] flex items-center cursor-pointer"
                                    >
                                        View All Tasks ({allTasks.length}) <ChevronRight size={14} />
                                    </button>
                                </div>

                                <div className="space-y-2.5">
                                    {allTasks.slice(0, 5).map(task => (
                                        <div key={task._id} className="p-3.5 rounded-xl bg-[#f5f5f3] hover:bg-[#f0f0ee]/80 transition-colors flex items-center justify-between border border-slate-100">
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
                {mainTab === 'social' && (
                    <div className="team-project-workspace">
                        <TeamProjectRail rows={smProjects} selected={selectedSmProject} onOpen={id => { setSmMonth(''); loadSingleSmProject(id); }} onDelete={handleDeleteSmProject}
                            describe={row => `Contact: ${row.clientName || '—'}`} metadata={row => [row.phone, row.email, row.month].filter(Boolean).join(' · ')}
                            badge={row => (row.contentItems || []).filter(item => item.status === 'Completed').length + ' / ' + (row.contentItems || []).length + ' complete'}
                            progress={row => ({done: (row.contentItems || []).filter(item => item.status === 'Completed').length, total: row.contentItems?.length})} />
                        <div className="team-project-content">
                            {selectedSmProject ? (
                    <div className="space-y-6">
                        {/* Header with Back button */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={() => setSelectedSmProject(null)}
                                    className="p-2.5 rounded-xl border border-[#e6e6e3] hover:bg-[#f5f5f3] transition-colors text-slate-600 cursor-pointer"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-xl font-bold text-[#111111]">{selectedSmProject.businessName || selectedSmProject.clientName}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3]">
                                            Social Media Client
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Client: {selectedSmProject.clientName} {selectedSmProject.phone && `· ${selectedSmProject.phone}`} {selectedSmProject.email && `· ${selectedSmProject.email}`}
                                    </p>
                                </div>
                            </div>

                            <div className="team-social-controls">
                                <div aria-label="Workflow month" role="group">
                                    <button type="button" aria-label="Previous workflow month" onClick={() => moveSocialMonth(-1)}>‹</button>
                                    <button type="button" onClick={() => setSmMonth('')}>{smMonth
                                        ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${smMonth}-01T00:00:00Z`))
                                        : 'All months'}</button>
                                    <button type="button" aria-label="Next workflow month" onClick={() => moveSocialMonth(1)}>›</button>
                                </div>
                                <button type="button" className="team-page-primary" onClick={() => { setSmWorkflowTab('Post'); setIsAddSmItemModalOpen(true); }}><Plus size={14} /> Schedule reel</button>
                                {smWorkflowTab !== 'Post' && <button type="button" onClick={() => setIsAddSmItemModalOpen(true)}>Add {smWorkflowTab.toLowerCase()} task</button>}
                            </div>
                        </div>

                        {/* Workflow Tabs (Script, Shoot, Edit, Post, Design) */}
                        <div className="team-page-tabs team-workflow-tabs">
                            <button type="button" aria-current={showAllSmStages ? 'page' : undefined} onClick={() => setShowAllSmStages(true)}>All stages</button>
                            {[
                                { id: 'Script', label: 'Script', icon: FileText },
                                { id: 'Shoot', label: 'Shoot', icon: Video },
                                { id: 'Edit', label: 'Edit', icon: Edit2 },
                                { id: 'Post', label: 'Post', icon: Send },
                                { id: 'Design', label: 'Design Post', icon: Palette },
                            ].map(tab => {
                                const Icon = tab.icon;
                                const count = displayedSmItems.filter(i => i.type === tab.id).length;
                                return (
                                    <button
                                        key={tab.id}
                                        aria-current={!showAllSmStages && smWorkflowTab === tab.id ? 'page' : undefined}
                                        onClick={() => { setSmWorkflowTab(tab.id); setShowAllSmStages(false); }}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                                            !showAllSmStages && smWorkflowTab === tab.id
                                            ? 'bg-[#111111] text-white shadow-xs'
                                            : 'bg-white text-slate-600 hover:bg-[#f0f0ee] border border-[#e6e6e3]/80'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        <span>{tab.label}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${smWorkflowTab === tab.id ? 'bg-white/20' : 'bg-[#f0f0ee]'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Content Tasks Table */}
                        <div className="bg-white rounded-[1.75rem] border border-slate-100 shadow-xs overflow-hidden">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[#111111]">Workflow</h3>
                                <span className="text-xs text-slate-400 font-medium">Synced to employee task boards</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#f5f5f3] text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
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
                                        {displayedSmItems
                                            .filter(item => showAllSmStages || item.type === smWorkflowTab)
                                            .map(item => {
                                                const isTaskCompleted = item.assignedTaskId?.status === 'Completed' || item.status === 'Completed';
                                                const isOverdue = new Date(item.date).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0) && !isTaskCompleted;
                                                return (
                                                    <tr key={item._id} className={isOverdue ? 'bg-red-50/40' : 'hover:bg-[#f5f5f3]/50'}>
                                                        <td className="py-3.5 px-5">
                                                            <div className="font-bold text-[#111111] flex items-center space-x-1.5">
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
                                                                        <div className="w-7 h-7 rounded-full bg-[#e6e6e3] text-[#111111] flex items-center justify-center font-bold text-[11px] shadow-xs">
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
                                                                    className="px-2.5 py-1 rounded-lg border border-[#e6e6e3] text-xs font-semibold bg-white cursor-pointer outline-none"
                                                                >
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="Completed">Completed</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                                            <button 
                                                                onClick={() => handleOpenEditSmItem(item)}
                                                                className="text-slate-400 hover:text-[#3f3f3f] p-1.5 rounded-lg transition-colors cursor-pointer mr-1 hover:bg-[#f0f0ee] inline-flex items-center"
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
                                        {displayedSmItems.filter(i => showAllSmStages || i.type === smWorkflowTab).length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                                                    No tasks match this workflow view.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                            ) : <p className="team-project-placeholder">{smProjects.length ? 'Select a project to view its details.' : 'No projects yet.'}</p>}
                        </div>
                    </div>
                )}

                {/* =========================================================================
                   TAB 3: WEBSITE DEVELOPMENT HUB
                ========================================================================= */ }
                {mainTab === 'webdev' && (
                    <div className="team-project-workspace">
                        <TeamProjectRail rows={webProjects} selected={selectedWebProject} onOpen={loadSingleWebProject} onDelete={handleDeleteWebProject}
                            describe={row => `${row.websiteType || 'Normal'} · Dev: ${getEmployeeDisplayName(row.assignedDeveloper, 'Unassigned')}`} metadata={row => [row.clientName, row.website].filter(Boolean).join(' · ')}
                            badge={row => row.projectStatus || 'Pending'} />
                        <div className="team-project-content">
                            {selectedWebProject ? (
                    <div className="space-y-6">
                        {/* Header & Details Card */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-4">
                                <div className="flex items-center space-x-4">
                                    <button 
                                        onClick={() => setSelectedWebProject(null)}
                                        className="p-2.5 rounded-xl border border-[#e6e6e3] hover:bg-[#f5f5f3] transition-colors text-slate-600 cursor-pointer"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <h2 className="text-xl font-bold text-[#111111]">{selectedWebProject.businessName}</h2>
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3] uppercase">
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
                                            className="px-4 py-2 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold flex items-center cursor-pointer shadow-xs transition-colors"
                                        >
                                            <Check size={14} className="mr-1.5" /> Save Changes
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => setIsEditingWebClient(true)}
                                            className="px-4 py-2 bg-[#f0f0ee] text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center cursor-pointer transition-colors"
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
                                            className="w-full px-3 py-1.5 border border-[#e6e6e3] rounded-lg text-xs"
                                        />
                                    ) : (
                                        <div className="font-bold text-[#3f3f3f] truncate flex items-center">
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
                                            className="w-full px-2.5 py-1.5 border border-[#e6e6e3] rounded-lg text-xs font-semibold"
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
                                            className="w-full px-2.5 py-1.5 border border-[#e6e6e3] rounded-lg text-xs font-semibold"
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
                                            className="w-full px-2.5 py-1.5 border border-[#e6e6e3] rounded-lg text-xs font-semibold"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Testing">Testing</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    ) : (
                                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                            selectedWebProject.projectStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f0f0ee] text-[#111111]'
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
                            const activeWorkflowMode = webWorkflowTab || 'both';
                            const checklistItems = selectedWebProject.checklist || [];
                            const completedChecklistCount = checklistItems.filter(i => i.status === 'Completed').length;
                            const reqItems = selectedWebProject.requirements || [];

                            return (
                                <div className="space-y-4">
                                    {/* Workflow Sub-Tabs */}
                                    <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                                        <div className="team-page-tabs flex-wrap">
                                            <button type="button" aria-current={activeWorkflowMode === 'both' ? 'page' : undefined} onClick={() => setWebWorkflowTab(null)}>All</button>
                                            <button
                                                type="button"
                                                onClick={() => setWebWorkflowTab('checklist')}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                    activeWorkflowMode === 'checklist'
                                                        ? 'bg-white text-[#3f3f3f] shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-[#111111]'
                                                }`}
                                            >
                                                <CheckSquare size={13} />
                                                <span>Milestone Checklist</span>
                                                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#f0f0ee] text-[#111111] font-bold">
                                                    {checklistItems.length}
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setWebWorkflowTab('requirements')}
                                                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                                    activeWorkflowMode === 'requirements'
                                                        ? 'bg-white text-indigo-600 shadow-xs font-bold'
                                                        : 'text-slate-600 hover:text-[#111111]'
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

                                    <div className="team-web-workflow" data-show-both={activeWorkflowMode === 'both'}>
                                    {activeWorkflowMode !== 'requirements' && (
                                        /* CHECKLIST VIEW FOR E-COMMERCE, STATIC & CUSTOM */
                                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                                                <div>
                                                    <h3 className="text-base font-bold text-[#111111]">{selectedWebProject.websiteType === 'Normal' ? 'Custom' : selectedWebProject.websiteType} Milestone Checklist</h3>
                                                    <p className="text-xs text-slate-400 mt-0.5">Click any checklist item to toggle its completion status.</p>
                                                </div>
                                                <div className="text-xs font-bold text-[#3f3f3f] bg-[#f0f0ee] px-3 py-1 rounded-full">
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
                                                    className="flex-1 px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs outline-none focus:bg-white focus:border-[#111111] font-medium"
                                                />
                                                <button type="submit" className="px-4 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-[#303030] transition-colors cursor-pointer">
                                                    <Plus size={15} />
                                                </button>
                                            </form>

                                            {checklistItems.length === 0 ? (
                                                <div className="text-center py-10 bg-[#f5f5f3] rounded-2xl border border-dashed border-[#e6e6e3] space-y-2">
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
                                                                : 'bg-[#f5f5f3]/60 border-slate-100 hover:bg-white hover:border-[#e6e6e3] text-slate-800'
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
                                    )}
                                    {activeWorkflowMode !== 'checklist' && (
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
                                                            className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
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
                                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs outline-none focus:bg-white focus:border-[#111111] font-medium"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3">
                                                        <select 
                                                            value={webReqEmployee}
                                                            onChange={e => setWebReqEmployee(e.target.value)}
                                                            className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
                                                        >
                                                            <option value="">Assigned: {getEmployeeDisplayName(selectedWebProject.assignedDeveloper, 'Default')}</option>
                                                            {employees.map(emp => (
                                                                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role || 'Staff'})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-1">
                                                        <button type="submit" className="w-full py-2.5 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer">
                                                            Add
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>

                                            {/* Two Columns: Requirements vs Changes */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Left: Requirements */}
                                                <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs">
                                                    <h3 className="text-sm font-bold text-[#111111] mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                                                        <span>Project Requirements</span>
                                                        <span className="text-xs bg-[#f0f0ee] text-[#111111] px-2 py-0.5 rounded-full font-bold">
                                                            {(selectedWebProject.requirements || []).filter(r => r.type === 'Requirement').length}
                                                        </span>
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {(selectedWebProject.requirements || []).filter(r => r.type === 'Requirement').map(item => (
                                                            <div key={item._id} className="p-3.5 rounded-xl bg-[#f5f5f3] border border-slate-100 flex items-start justify-between">
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
                                                    <h3 className="text-sm font-bold text-[#111111] mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                                                        <span>Client Change Requests</span>
                                                        <span className="text-xs bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3]/80 px-2 py-0.5 rounded-full font-bold">
                                                            {(selectedWebProject.requirements || []).filter(r => r.type === 'Change').length}
                                                        </span>
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {(selectedWebProject.requirements || []).filter(r => r.type === 'Change').map(item => (
                                                            <div key={item._id} className="p-3.5 rounded-xl bg-[#f5f5f3] border border-slate-100 flex items-start justify-between">
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
                                </div>
                            );
                        })()}

                        <div className="team-web-timeline">
                            <h3>Timeline &amp; payments</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.startDate ? new Date(selectedWebProject.startDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { startDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-[#e6e6e3] rounded-lg font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target End Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.endDate ? new Date(selectedWebProject.endDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { endDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-[#e6e6e3] rounded-lg font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Advance Payment Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.advancePaymentDate ? new Date(selectedWebProject.advancePaymentDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { advancePaymentDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-[#e6e6e3] rounded-lg font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Full Payment Date</label>
                                    <input 
                                        type="date" 
                                        value={selectedWebProject.fullPaymentDate ? new Date(selectedWebProject.fullPaymentDate).toISOString().split('T')[0] : ''}
                                        onChange={e => axios.put(`http://localhost:5000/api/team-management/webdev/${selectedWebProject._id}`, { fullPaymentDate: e.target.value }, { headers: getHeaders() }).then(() => loadSingleWebProject(selectedWebProject._id))}
                                        className="w-full px-3 py-1.5 border border-[#e6e6e3] rounded-lg font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                            ) : <p className="team-project-placeholder">{webProjects.length ? 'Select a project to view its details.' : 'No projects yet.'}</p>}
                        </div>
                    </div>
                )}

                {/* =========================================================================
                   TAB 4: SEO PROJECTS HUB
                ========================================================================= */}
                {mainTab === 'seo' && (
                    <div className="team-project-workspace team-seo-workspace">
                        <TeamProjectRail rows={seoProjects} selected={selectedSeoProject} onOpen={loadSingleSeoProject} onDelete={handleDeleteSeoProject}
                            describe={row => `Specialist: ${getEmployeeDisplayName(row.assignedSpecialist, 'Unassigned')}`} metadata={row => [row.clientName, row.website].filter(Boolean).join(' · ')}
                            badge={row => (row.checklist || []).filter(item => item.isCompleted).length + ' / ' + (row.checklist || []).length + ' done'}
                            progress={row => ({done: (row.checklist || []).filter(item => item.isCompleted).length, total: row.checklist?.length})} />
                        <div className="team-project-content">
                            {selectedSeoProject ? (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={() => setSelectedSeoProject(null)}
                                    className="p-2.5 rounded-xl border border-[#e6e6e3] hover:bg-[#f5f5f3] transition-colors text-slate-600 cursor-pointer"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h2 className="text-xl font-bold text-[#111111]">{selectedSeoProject.businessName}</h2>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3]">
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
                                    className="px-3 py-1.5 border border-[#e6e6e3] rounded-xl text-xs font-bold bg-white"
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

                        <section className="team-seo-checklist">
                            <header>
                                <h3>{selectedSeoProject.businessName || selectedSeoProject.clientName} · checklist</h3>
                                <div className="team-page-tabs" aria-label="Checklist category">
                                    {['All', ...seoGroups.keys()].map(category => (
                                        <button key={category} type="button" aria-current={seoCategoryFilter === category ? 'page' : undefined}
                                            onClick={() => setSeoCategoryFilter(category)}>{category === 'All' ? 'All categories' : category}</button>
                                    ))}
                                </div>
                            </header>
                            <div className="team-seo-groups">
                                {[...seoGroups].filter(([name]) => seoCategoryFilter === 'All' || name === seoCategoryFilter).map(([name, items]) => (
                                    <section key={name}>
                                        <h4>{name}<small>{items.filter(item => item.isCompleted).length} / {items.length}</small></h4>
                                        <ul>{items.map(item => (
                                            <li key={item._id}>
                                                <button type="button" aria-pressed={item.isCompleted} onClick={() => handleToggleSeoChecklist(item._id)}>
                                                    <i aria-hidden="true">{item.isCompleted && <Check size={13} />}</i><span>{item.taskName}</span>
                                                </button>
                                            </li>
                                        ))}</ul>
                                    </section>
                                ))}
                                {!seoGroups.size && <p>No checklist items recorded.</p>}
                            </div>
                        </section>

                        {/* CUSTOM SEO TASKS (ON-PAGE, OFF-PAGE, TECHNICAL, ADS) */}
                        <div className="bg-white p-6 rounded-[1.75rem] border border-slate-100 shadow-xs space-y-4">
                            <h3 className="text-sm font-bold text-[#111111]">Linked tasks</h3>
                            
                            <form onSubmit={handleAddSeoCustomTask} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-2">
                                    <select 
                                        value={seoCustomTaskForm.type}
                                        onChange={e => setSeoCustomTaskForm({ ...seoCustomTaskForm, type: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
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
                                        placeholder="New SEO task"
                                        value={seoCustomTaskForm.description}
                                        onChange={e => setSeoCustomTaskForm({ ...seoCustomTaskForm, description: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none"
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <select 
                                        value={seoCustomTaskForm.assignedEmployee}
                                        onChange={e => setSeoCustomTaskForm({ ...seoCustomTaskForm, assignedEmployee: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
                                    >
                                        <option value="">Assigned: {selectedSeoProject.assignedSpecialist?.firstName || 'Default'}</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.role || 'Staff'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <button type="submit" className="w-full py-2.5 bg-[#111111] hover:bg-[#303030] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs">
                                        Add
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-2.5 pt-2">
                                {(selectedSeoProject.customTasks || []).map(task => (
                                    <div key={task._id} className="p-3.5 rounded-xl bg-[#f5f5f3] border border-slate-100 flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-3">
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f0ee] text-[#111111] border border-[#e6e6e3]/80">
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
                            ) : <p className="team-project-placeholder">{seoProjects.length ? 'Select a project to view its details.' : 'No projects yet.'}</p>}
                        </div>
                    </div>
                )}

                {/* =========================================================================
                   TAB 5: ALL TEAM TASKS VIEW
                ========================================================================= */}
                {mainTab === 'all-tasks' && <TeamLiveTasks tasks={allTasks}
                    groups={{ social: smProjects, webdev: webProjects, seo: seoProjects }} onToggle={handleToggleGeneralTaskStatus} />}

                {/* 2. Executive Metrics Strip */}
                <details className="team-legacy-metrics">
                    <summary>Department metrics</summary>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-1.5 bg-[#f5f5f3]/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Social Media</span>
                                <span className="text-2xl font-black text-[#111111] mt-1 block">{stats.socialMediaProjects || 0}</span>
                                <span className="text-[11px] text-[#3f3f3f] font-semibold mt-0.5 block">Reels & Post Workflows</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center font-bold">
                                <Share2 size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5 bg-[#f5f5f3]/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Web Dev Projects</span>
                                <span className="text-2xl font-black text-[#111111] mt-1 block">{stats.webDevProjects || 0}</span>
                                <span className="text-[11px] text-[#3f3f3f] font-semibold mt-0.5 block">Normal, E-Comm & Static</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center font-bold">
                                <Globe size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5 bg-[#f5f5f3]/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">SEO Projects</span>
                                <span className="text-2xl font-black text-[#111111] mt-1 block">{stats.seoProjects || 0}</span>
                                <span className="text-[11px] text-[#3f3f3f] font-semibold mt-0.5 block">46-Point Master Checklist</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center font-bold">
                                <Search size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="p-1.5 bg-[#f5f5f3]/80 rounded-[1.75rem] border border-slate-100">
                        <div className="bg-white rounded-[1.25rem] p-5 shadow-xs flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Team Tasks</span>
                                <span className="text-2xl font-black text-[#111111] mt-1 block">{stats.totalTasks || 0}</span>
                                <span className="text-[11px] text-[#3f3f3f] font-semibold mt-0.5 block">{stats.pendingTasks || 0} Pending · {stats.completedTasks || 0} Done</span>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-[#f0f0ee] text-[#3f3f3f] flex items-center justify-center font-bold">
                                <ListTodo size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                </details>

                {/* =========================================================================
                   MODALS
                ========================================================================= */}
                {/* 1. Add Social Media Client Modal */}
                {isAddSmModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <h3 className="text-lg font-bold text-[#111111] mb-1">Add Social Media Client</h3>
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Business Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Skite Digital Agency"
                                        value={newSmForm.businessName}
                                        onChange={e => setNewSmForm({ ...newSmForm, businessName: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="client@gmail.com"
                                            value={newSmForm.email}
                                            onChange={e => setNewSmForm({ ...newSmForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>
                                
                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddSmModalOpen(false)}
                                        className="w-1/2 py-2.5 bg-[#f0f0ee] text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-1/2 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-[#303030] cursor-pointer shadow-xs"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/40 backdrop-blur-xs">
                        <div className={`bg-white rounded-[2rem] p-6 md:p-8 w-full shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto ${
                            smWorkflowTab === 'Post' ? 'max-w-2xl' : 'max-w-md'
                        }`}>
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-[#111111]">
                                        {smWorkflowTab === 'Post' ? 'Schedule Reel & Assign Production Team' : `Add ${smWorkflowTab} Task`}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {smWorkflowTab === 'Post'
                                            ? 'Set Target Post Date and assign Script, Shoot, Edit, and Post production team in a single form.'
                                            : 'Assign directly to employee. This creates an automatic linked task.'}
                                    </p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#f0f0ee] text-[#111111]">
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
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                        />
                                    </div>
                                    {smWorkflowTab === 'Post' ? (
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1">Post Time</label>
                                            <input 
                                                type="time" 
                                                value={smItemForm.startTime}
                                                onChange={e => setSmItemForm({ ...smItemForm, startTime: e.target.value, endTime: '' })}
                                                className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                                    className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-1">End Time</label>
                                                <input 
                                                    type="time" 
                                                    value={smItemForm.endTime}
                                                    onChange={e => setSmItemForm({ ...smItemForm, endTime: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>

                                {/* IF POST TAB: SHOW 4-STAGE PIPELINE ASSIGNMENT */}
                                {smWorkflowTab === 'Post' ? (
                                    <div className="p-4 bg-[#f0f0ee]/60 border border-[#e6e6e3]/80 rounded-2xl space-y-3">
                                        <div className="flex items-center space-x-2 text-blue-950 font-bold text-xs">
                                            <Sparkles size={16} className="text-[#3f3f3f]" />
                                            <span>4-Stage Reel Production Team Assignment</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Stage 1: Script Writer */}
                                            <div className="bg-white p-3 rounded-xl border border-[#ededea] shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <FileText size={14} className="mr-1.5 text-[#3f3f3f]" /> 1. Script Writer
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.scriptDate}
                                                        onChange={e => setSmItemForm({ ...smItemForm, scriptDate: e.target.value })}
                                                        className="text-[10px] font-bold px-2 py-1 bg-[#f5f5f3] border border-[#e6e6e3] rounded-md"
                                                        title="Script Target Date"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.scriptWriterId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, scriptWriterId: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-[#f5f5f3] border border-[#e6e6e3] rounded-lg text-xs font-medium"
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
                                            <div className="bg-white p-3 rounded-xl border border-[#ededea] shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <Video size={14} className="mr-1.5 text-purple-600" /> 2. Shoot Person
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.shootDate}
                                                        onChange={e => setSmItemForm({ ...smItemForm, shootDate: e.target.value })}
                                                        className="text-[10px] font-bold px-2 py-1 bg-[#f5f5f3] border border-[#e6e6e3] rounded-md"
                                                        title="Shoot Target Date"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.shooterId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, shooterId: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-[#f5f5f3] border border-[#e6e6e3] rounded-lg text-xs font-medium"
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
                                            <div className="bg-white p-3 rounded-xl border border-[#ededea] shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <Palette size={14} className="mr-1.5 text-amber-600" /> 3. Video Editor
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.editDate}
                                                        onChange={e => setSmItemForm({ ...smItemForm, editDate: e.target.value })}
                                                        className="text-[10px] font-bold px-2 py-1 bg-[#f5f5f3] border border-[#e6e6e3] rounded-md"
                                                        title="Edit Target Date"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.editorId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, editorId: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-[#f5f5f3] border border-[#e6e6e3] rounded-lg text-xs font-medium"
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
                                            <div className="bg-white p-3 rounded-xl border border-[#ededea] shadow-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-slate-800 flex items-center">
                                                        <Send size={14} className="mr-1.5 text-emerald-600" /> 4. Social Media Poster
                                                    </span>
                                                    <input 
                                                        type="date"
                                                        value={smItemForm.date}
                                                        onChange={e => handleSmDateChange(e.target.value)}
                                                        className="text-[10px] font-bold px-2 py-1 bg-[#f5f5f3] border border-[#e6e6e3] rounded-md"
                                                        title="Post Target Date (Live Date)"
                                                    />
                                                </div>
                                                <select 
                                                    value={smItemForm.posterId}
                                                    onChange={e => setSmItemForm({ ...smItemForm, posterId: e.target.value, assignedEmployee: e.target.value })}
                                                    className="w-full px-2.5 py-2 bg-[#f5f5f3] border border-[#e6e6e3] rounded-lg text-xs font-medium"
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
                                            className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
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
                                        className="w-1/3 py-2.5 bg-[#f0f0ee] text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-2/3 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-[#303030] cursor-pointer shadow-xs flex items-center justify-center space-x-1.5"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-lg font-bold text-[#111111]">Edit {editSmItemForm.type} Task</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Reassign employee, update target date or details.</p>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#f0f0ee] text-[#111111]">
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
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                        />
                                    </div>

                                    {editSmItemForm.type === 'Post' ? (
                                        <div>
                                            <label className="text-xs font-bold text-slate-700 block mb-1">Post Time</label>
                                            <input 
                                                type="time" 
                                                value={editSmItemForm.startTime}
                                                onChange={e => setEditSmItemForm({ ...editSmItemForm, startTime: e.target.value, endTime: '' })}
                                                className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                                    className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-700 block mb-1">End Time</label>
                                                <input 
                                                    type="time" 
                                                    value={editSmItemForm.endTime}
                                                    onChange={e => setEditSmItemForm({ ...editSmItemForm, endTime: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>

                                {/* Reassign Employee Dropdown */}
                                <div className="p-3 bg-[#f0f0ee]/70 border border-[#e6e6e3] rounded-xl">
                                    <label className="text-xs font-bold text-blue-900 block mb-1">
                                        Reassign Employee / Team Member *
                                    </label>
                                    <select 
                                        required
                                        value={editSmItemForm.assignedEmployee}
                                        onChange={e => setEditSmItemForm({ ...editSmItemForm, assignedEmployee: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-[#e6e6e3] rounded-lg text-xs font-bold outline-none"
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
                                    <p className="text-[10px] text-[#111111] mt-1">
                                        Choosing a different employee will automatically transfer the task to their personal dashboard.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Stage Status</label>
                                    <select 
                                        value={editSmItemForm.status}
                                        onChange={e => setEditSmItemForm({ ...editSmItemForm, status: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>

                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsEditSmItemModalOpen(false)}
                                        className="w-1/3 py-2.5 bg-[#f0f0ee] text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-2/3 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-[#303030] cursor-pointer shadow-xs"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <h3 className="text-lg font-bold text-[#111111] mb-1">Add Web Development Client</h3>
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Website URL</label>
                                    <input 
                                        type="text" 
                                        placeholder="www.dundermifflin.com"
                                        value={newWebForm.website}
                                        onChange={e => setNewWebForm({ ...newWebForm, website: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Website Type</label>
                                        <select 
                                            value={newWebForm.websiteType}
                                            onChange={e => setNewWebForm({ ...newWebForm, websiteType: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
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
                                            className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
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
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="client@gmail.com"
                                            value={newWebForm.email}
                                            onChange={e => setNewWebForm({ ...newWebForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddWebModalOpen(false)}
                                        className="w-1/2 py-2.5 bg-[#f0f0ee] text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-1/2 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-[#303030] cursor-pointer shadow-xs"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111111]/40 backdrop-blur-xs">
                        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-100">
                            <h3 className="text-lg font-bold text-[#111111] mb-1">Add SEO Client</h3>
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
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
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Website URL *</label>
                                    <input 
                                        type="text" 
                                        placeholder="www.wayne-enterprises.com"
                                        value={newSeoForm.website}
                                        onChange={e => setNewSeoForm({ ...newSeoForm, website: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-[#111111]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Assigned SEO Specialist</label>
                                    <select 
                                        value={newSeoForm.assignedSpecialist}
                                        onChange={e => setNewSeoForm({ ...newSeoForm, assignedSpecialist: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-bold"
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
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="client@gmail.com"
                                            value={newSeoForm.email}
                                            onChange={e => setNewSeoForm({ ...newSeoForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-[#f5f5f3] border border-[#e6e6e3] rounded-xl text-xs font-medium outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-3 pt-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddSeoModalOpen(false)}
                                        className="w-1/2 py-2.5 bg-[#f0f0ee] text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="w-1/2 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-[#303030] cursor-pointer shadow-xs"
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
