import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Building, CheckCircle, XCircle, Plus, LayoutDashboard, Briefcase, FileText, CalendarClock, FolderKanban, Settings, Clock, Trash2 } from 'lucide-react';

export default function CeoDashboard() {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/');
    };
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [extendDays, setExtendDays] = useState(1);

    const [formData, setFormData] = useState({
        companyName: '',
        subDomain: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        activeModules: ['dashboard', 'sales', 'finance', 'hr', 'projects', 'calendar'],
        trialDays: 1
    });

    const [subscriptionPrice, setSubscriptionPrice] = useState(1000);
    const [isSavingPrice, setIsSavingPrice] = useState(false);

    const ALL_MODULES = [
        { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard size={14} className="mr-1" /> },
        { id: 'sales', name: 'Sales & Leads', icon: <Briefcase size={14} className="mr-1" /> },
        { id: 'finance', name: 'Finance', icon: <FileText size={14} className="mr-1" /> },
        { id: 'hr', name: 'Attendance & HR', icon: <CalendarClock size={14} className="mr-1" /> },
        { id: 'projects', name: 'Projects', icon: <FolderKanban size={14} className="mr-1" /> },
        { id: 'calendar', name: 'Calendar', icon: <CalendarClock size={14} className="mr-1" /> }
    ];

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/ceo/settings', {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            const priceSetting = res.data.find(s => s.key === 'monthly_subscription_price');
            if (priceSetting) setSubscriptionPrice(priceSetting.value);
        } catch (error) {
            console.error("Error fetching settings", error);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/ceo/clients', {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            setClients(res.data);
        } catch (error) {
            console.error("Error fetching clients", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
        fetchSettings();
    }, []);

    const handleUpdatePrice = async () => {
        setIsSavingPrice(true);
        try {
            await axios.post('http://localhost:5000/api/ceo/settings', {
                key: 'monthly_subscription_price',
                value: subscriptionPrice
            }, {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            alert('Global subscription price updated successfully!');
        } catch (error) {
            console.error("Error updating price", error);
            alert('Failed to update price');
        } finally {
            setIsSavingPrice(false);
        }
    };

    const handleCreateClient = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/ceo/clients', formData, {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            setIsModalOpen(false);
            fetchClients();
            setFormData({ companyName: '', subDomain: '', adminName: '', adminEmail: '', adminPassword: '', activeModules: ['dashboard', 'sales', 'finance', 'hr', 'projects', 'calendar'], trialDays: 1 });
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating client');
        }
    };

    const handleExtendTrial = async (e) => {
        e.preventDefault();
        if (!selectedClient) return;
        try {
            await axios.put(`http://localhost:5000/api/ceo/clients/${selectedClient._id}/trial`, { trialDays: extendDays }, {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            setIsTrialModalOpen(false);
            setSelectedClient(null);
            fetchClients();
        } catch (error) {
            alert('Error extending trial');
        }
    };

    const toggleStatus = async (id) => {
        try {
            await axios.put('http://localhost:5000/api/ceo/clients/' + id + '/toggle-status', {}, {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
            });
            fetchClients();
        } catch (error) {
            alert('Error toggling status');
        }
    };

    const handleDeleteWorkspace = async (client) => {
        if (window.confirm(`Are you sure you want to permanently delete workspace "${client.companyName}" (${client.subDomain})? All its users, leads, invoices and data will be wiped permanently.`)) {
            try {
                await axios.delete('http://localhost:5000/api/ceo/clients/' + client._id, {
                    headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
                });
                fetchClients();
            } catch (error) {
                alert(error.response?.data?.message || 'Error deleting workspace');
            }
        }
    };

    const toggleModuleSelection = (moduleId) => {
        setFormData(prev => ({
            ...prev,
            activeModules: prev.activeModules.includes(moduleId)
                ? prev.activeModules.filter(m => m !== moduleId)
                : [...prev.activeModules, moduleId]
        }));
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-up { animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .delay-100 { animation-delay: 100ms; opacity: 0; }
                .delay-200 { animation-delay: 200ms; opacity: 0; }
            `}} />
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fade-up">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
                        <p className="text-slate-500 mt-1">Manage tenants, subscriptions, and global settings</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold transition-colors cursor-pointer"
                    >
                        <LogOut size={18} className="mr-2" /> Logout
                    </button>
                </div>

                {/* Global Settings */}
                <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 animate-fade-up delay-100">
                    <div className="bg-white p-6 rounded-[1.5rem] shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                            <Settings size={20} className="mr-2 text-blue-600" /> Global Pricing Settings
                        </h2>
                        <div className="flex flex-col sm:flex-row items-end gap-4 max-w-lg">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Monthly Subscription Price (₹)</label>
                                <input 
                                    type="number" 
                                    value={subscriptionPrice}
                                    onChange={(e) => setSubscriptionPrice(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-bold text-slate-900"
                                />
                            </div>
                            <button 
                                onClick={handleUpdatePrice}
                                disabled={isSavingPrice}
                                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isSavingPrice ? 'Saving...' : 'Save Price'}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">This is the amount all tenants will be asked to pay after their trial expires.</p>
                    </div>
                </div>

                {/* Clients Header */}
                <div className="flex justify-between items-center animate-fade-up delay-200">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Building size={24} className="mr-3 text-blue-600" />
                        Registered Workspaces
                    </h2>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg hover:-translate-y-0.5 transition-all font-bold"
                    >
                        <Plus size={20} className="mr-2" /> Add New Workspace
                    </button>
                </div>

                {/* Clients Table */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-2 animate-fade-up delay-200">
                    <div className="bg-slate-50/50 rounded-[1.5rem] border border-slate-100/50 overflow-x-auto">
                        <table className="w-full text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4">Workspace</th>
                                    <th className="p-4">Subdomain</th>
                                    <th className="p-4">Admin Detail</th>
                                    <th className="p-4">Subscription</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" className="text-center p-8 text-slate-500">Loading workspaces...</td></tr>
                                ) : clients.map(client => (
                                    <tr key={client._id} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900">{client.companyName}</div>
                                            <div className="text-xs text-slate-500 mt-1">Created: {new Date(client.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-mono text-sm font-bold">
                                                {client.subDomain}.skitec.rm
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-700">{client.adminUser?.name || 'N/A'}</div>
                                            <div className="text-xs text-slate-500">{client.adminUser?.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={"px-2 py-1 rounded-md text-xs font-bold uppercase " + (client.status === 'active' ? 'bg-emerald-100 text-emerald-700' : client.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                                                    {client.status || 'TRIAL'}
                                                </span>
                                                <button 
                                                    onClick={() => { setSelectedClient(client); setExtendDays(1); setIsTrialModalOpen(true); }}
                                                    className="p-1.5 bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Extend Trial"
                                                >
                                                    <Clock size={14} />
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-1 font-mono">Until: {new Date(client.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                        </td>
                                        <td className="p-4">
                                            {client.isActive ? (
                                                <span className="flex items-center text-emerald-600 font-bold text-sm">
                                                    <CheckCircle size={16} className="mr-1" /> Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-rose-500 font-bold text-sm">
                                                    <XCircle size={16} className="mr-1" /> Suspended
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => toggleStatus(client._id)}
                                                    className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " + (client.isActive ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100")}
                                                >
                                                    {client.isActive ? 'Suspend' : 'Activate'}
                                                </button>
                                                {client.subDomain !== 'hq' && (
                                                    <button 
                                                        onClick={() => handleDeleteWorkspace(client)}
                                                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors"
                                                        title="Delete Workspace Permanently"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Trial Edit Modal */}
            {isTrialModalOpen && selectedClient && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Extend Access</h3>
                        <p className="text-sm text-slate-500 mb-6">Modify validity for <span className="font-bold text-slate-900">{selectedClient.companyName}</span></p>
                        
                        <form onSubmit={handleExtendTrial}>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Days to extend from today</label>
                            <input 
                                type="number" required value={extendDays}
                                onChange={e => setExtendDays(e.target.value)}
                                min="1"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none mb-6 font-bold"
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsTrialModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Apply Extension</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Client Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-up flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Add New Workspace</h3>
                                <p className="text-sm text-slate-500 font-medium">Provision a new tenant environment</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <XCircle size={24} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto">
                            <form id="create-client-form" onSubmit={handleCreateClient} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name</label>
                                        <input 
                                            type="text" required value={formData.companyName}
                                            onChange={e => setFormData({...formData, companyName: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-medium outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subdomain</label>
                                        <div className="flex">
                                            <input 
                                                type="text" required value={formData.subDomain}
                                                onChange={e => setFormData({...formData, subDomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-l-xl focus:bg-white focus:border-blue-500 transition-all font-medium outline-none"
                                            />
                                            <span className="px-3 py-3 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-slate-500 font-medium whitespace-nowrap">.skitec.rm</span>
                                        </div>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Free Trial Days</label>
                                        <input 
                                            type="number" required value={formData.trialDays}
                                            onChange={e => setFormData({...formData, trialDays: e.target.value})}
                                            min="1"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition-all font-medium outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-slate-900 mb-4">Admin Account Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Name</label>
                                            <input 
                                                type="text" required value={formData.adminName}
                                                onChange={e => setFormData({...formData, adminName: e.target.value})}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Email</label>
                                            <input 
                                                type="email" required value={formData.adminEmail}
                                                onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admin Password</label>
                                            <input 
                                                type="password" required value={formData.adminPassword}
                                                onChange={e => setFormData({...formData, adminPassword: e.target.value})}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Modules</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {ALL_MODULES.map(module => (
                                            <button
                                                type="button"
                                                key={module.id}
                                                onClick={() => toggleModuleSelection(module.id)}
                                                className={"flex items-center px-4 py-3 rounded-xl border text-sm font-bold transition-all " + (formData.activeModules.includes(module.id) ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                                            >
                                                {module.icon}
                                                {module.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end sticky bottom-0 z-10">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors mr-2">
                                Cancel
                            </button>
                            <button type="submit" form="create-client-form" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                Provision Workspace
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
