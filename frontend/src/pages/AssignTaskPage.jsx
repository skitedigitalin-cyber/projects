import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { ArrowLeft, CheckSquare, Users, AlertCircle, Calendar, Save, Sparkles, FileText } from 'lucide-react';

export default function AssignTaskPage() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [employeeId, setEmployeeId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/hr/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/hr/tasks', {
                employeeId,
                title,
                description,
                priority,
                dueDate
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/hr');
        } catch (error) {
            console.error('Error assigning task:', error);
            alert(error.response?.data?.message || 'Failed to assign task');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-4xl mx-auto w-full animate-fade-up">
                
                {/* Sticky Header Action Bar */}
                <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200 py-4 px-6 flex items-center justify-between rounded-t-3xl shadow-sm mb-8 -mx-2 mt-2">
                    <div className="flex items-center space-x-4">
                        <button 
                            type="button"
                            onClick={() => navigate('/hr')} 
                            className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
                                <Sparkles size={12} />
                                <span>HR & Team Tasks</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assign New Task</h1>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button 
                            type="button" 
                            onClick={() => navigate('/hr')} 
                            className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="taskForm" 
                            disabled={saving || loading} 
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20 flex items-center disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? 'Assigning...' : <><Save size={18} className="mr-2" /> Assign Task</>}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <form id="taskForm" onSubmit={handleSubmit} className="space-y-8 pb-12">
                        
                        {/* Block 1: Assignee & Core Info */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 rounded-l-[2rem]"></div>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center pl-2">
                                <Users size={16} className="mr-2 text-indigo-600" /> Task Delegation
                            </h3>

                            <div className="space-y-6 pl-2">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Assign To Employee *</label>
                                    <div className="relative">
                                        <select 
                                            required 
                                            value={employeeId} 
                                            onChange={e => setEmployeeId(e.target.value)} 
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Employee...</option>
                                            {employees.map(emp => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.firstName} {emp.lastName} — {emp.designation || 'Staff'} ({emp.department || 'General'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">The assigned team member will see this in their Employee Portal.</p>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Task Title *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <CheckSquare size={18} />
                                        </div>
                                        <input 
                                            required 
                                            type="text" 
                                            value={title} 
                                            onChange={e => setTitle(e.target.value)} 
                                            placeholder="e.g. Prepare Monthly Sales Audit & Review" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Task Description & Instructions</label>
                                    <div className="relative">
                                        <textarea 
                                            rows="4" 
                                            value={description} 
                                            onChange={e => setDescription(e.target.value)} 
                                            placeholder="Provide detailed instructions, goals, deliverables or helpful links for this task..." 
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 resize-none"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Block 2: Timeline & Priority */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 rounded-l-[2rem]"></div>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center pl-2">
                                <AlertCircle size={16} className="mr-2 text-amber-500" /> Priority & Deadline
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Priority Level</label>
                                    <select 
                                        value={priority} 
                                        onChange={e => setPriority(e.target.value)} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none cursor-pointer"
                                    >
                                        <option value="High">🔥 High Priority (Urgent)</option>
                                        <option value="Normal">⚡ Normal Priority</option>
                                        <option value="Low">🌱 Low Priority (Routine)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Due Date</label>
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)} 
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                )}
            </div>
        </Layout>
    );
}
