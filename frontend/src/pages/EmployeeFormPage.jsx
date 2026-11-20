import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
    ArrowLeft, UserCheck, Users, Briefcase, Mail, Phone, ShieldCheck, Key, Save, 
    Sparkles, LayoutDashboard, CalendarDays, FileText, CalendarClock, FolderKanban, 
    Check, CreditCard, Landmark, Building2, Hash, FileCheck2, Camera, Upload, Calendar
} from 'lucide-react';

const AVAILABLE_MODULES = [
    { id: 'sales', name: 'Sales & Leads', desc: 'Leads pipeline, drag & drop stages, call history', icon: <Briefcase size={20} className="text-blue-600" /> },
    { id: 'dashboard', name: 'Sales & Overview Dashboard', desc: 'KPI metrics, revenue velocity, deal feeds', icon: <LayoutDashboard size={20} className="text-indigo-600" /> },
    { id: 'calendar', name: 'Workspace Calendar', desc: 'Manage meetings, notes, company events', icon: <CalendarDays size={20} className="text-emerald-600" /> },
    { id: 'finance', name: 'Finance & Invoicing', desc: 'Invoices, purchases, payments and profit analysis', icon: <FileText size={20} className="text-amber-600" /> },
    { id: 'hr', name: 'Attendance & HR Management', desc: 'Staff directory, time tracking, leaves, assign tasks', icon: <CalendarClock size={20} className="text-purple-600" /> },
    { id: 'projects', name: 'Projects & Tasks', desc: 'Client project delivery, boards, and milestones', icon: <FolderKanban size={20} className="text-cyan-600" /> },
];

const EMPLOYEE_ROLES = [
    'Employee',
    'Sales',
    'Finance',
    'HR',
    'SEO analyst',
    'Content Writer',
    'video editor',
    'Videographer',
    'web developer',
    'manager',
    'Designer'
];

export default function EmployeeFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form States
    const [employeeId, setEmployeeId] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [photo, setPhoto] = useState('');
    const [photoPreview, setPhotoPreview] = useState('');
    const fileInputRef = React.useRef(null);
    const [department, setDepartment] = useState('');
    const [designation, setDesignation] = useState('');
    const [shift, setShift] = useState('General');
    const [dateOfJoining, setDateOfJoining] = useState(new Date().toISOString().split('T')[0]);
    const [password, setPassword] = useState('');
    const [perDaySalary, setPerDaySalary] = useState('');
    const [role, setRole] = useState('Employee');
    const [activeModules, setActiveModules] = useState([]);

    // Statutory & Bank Details
    const [panNumber, setPanNumber] = useState('');
    const [aadharNumber, setAadharNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');

    const handlePhotoSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) {
            alert('Photo size must be less than 3MB!');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            setPhotoPreview(base64);
            setPhoto(base64);
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        if (isEditMode) {
            fetchEmployeeDetails();
        }
    }, [id]);

    const fetchEmployeeDetails = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/hr/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const emp = res.data.find(e => e._id === id);
            if (emp) {
                setEmployeeId(emp.employeeId || '');
                setFirstName(emp.firstName || '');
                setLastName(emp.lastName || '');
                setEmail(emp.email || '');
                setPhone(emp.phone || '');
                setDob(emp.dob || '');
                setPhoto(emp.photo || '');
                setPhotoPreview(emp.photo || '');
                setDepartment(emp.department || '');
                setDesignation(emp.designation || '');
                setShift(emp.shift || 'General');
                setDateOfJoining(emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '');
                setPerDaySalary(emp.perDaySalary !== undefined ? emp.perDaySalary : '');
                setPassword('');
                setRole(emp.role || emp.userId?.role || 'Employee');
                setActiveModules(Array.isArray(emp.userId?.activeModules) ? emp.userId.activeModules : []);
                setPanNumber(emp.panNumber || '');
                setAadharNumber(emp.aadharNumber || '');
                setBankName(emp.bankName || '');
                setAccountNumber(emp.accountNumber || '');
                setIfscCode(emp.ifscCode || '');
            }
        } catch (error) {
            console.error('Error fetching employee details:', error);
            alert('Failed to load employee details');
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (moduleId) => {
        if (activeModules.includes(moduleId)) {
            setActiveModules(activeModules.filter(m => m !== moduleId));
        } else {
            setActiveModules([...activeModules, moduleId]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const resolvedEmail = email || `${employeeId.toLowerCase().replace(/[^a-z0-9]/g, '')}@robotriq.com`;
        const payload = {
            employeeId, 
            firstName, 
            lastName, 
            fullName: `${firstName} ${lastName}`.trim(),
            email: resolvedEmail, 
            phone, 
            dob,
            photo,
            department, designation, shift, dateOfJoining,
            perDaySalary: Number(perDaySalary) || 0,
            salary: Number(perDaySalary) || 0,
            role,
            activeModules,
            panNumber: panNumber ? panNumber.trim().toUpperCase() : '',
            aadharNumber: aadharNumber ? aadharNumber.trim() : '',
            bankName: bankName ? bankName.trim() : '',
            accountNumber: accountNumber ? accountNumber.trim() : '',
            accNumber: accountNumber ? accountNumber.trim() : '',
            ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : ''
        };
        if (password) {
            payload.password = password;
        }

        try {
            const token = localStorage.getItem('token');
            if (isEditMode) {
                await axios.put(`http://localhost:5000/api/hr/employees/${id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/hr/employees', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            navigate('/hr');
        } catch (error) {
            console.error('Error saving employee:', error);
            alert(error.response?.data?.message || 'Error saving employee details');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-5xl mx-auto w-full animate-fade-up">
                
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
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-1">
                                <Sparkles size={12} />
                                <span>Employee Management</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                {isEditMode ? 'Edit Employee & Module Access' : 'Onboard New Employee'}
                            </h1>
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
                            form="employeeForm" 
                            disabled={saving || loading} 
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 flex items-center disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? 'Saving...' : <><Save size={18} className="mr-2" /> {isEditMode ? 'Save Changes' : 'Onboard Employee'}</>}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <form id="employeeForm" onSubmit={handleSubmit} className="space-y-8 pb-12">
                        
                        {/* Block 1: Personal Details */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 rounded-l-[2rem]"></div>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center pl-2">
                                <Users size={16} className="mr-2 text-blue-600" /> Personal Information
                            </h3>

                            {/* Profile Photo Upload */}
                            <div className="flex flex-col items-center justify-center mb-8 pb-4 border-b border-slate-100">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handlePhotoSelect} 
                                    accept="image/*" 
                                    style={{ display: 'none' }} 
                                />
                                <div 
                                    className="w-24 h-24 rounded-full bg-slate-100 border-4 border-teal-500 flex items-center justify-center overflow-hidden cursor-pointer shadow-md mb-2 hover:opacity-90 transition-opacity"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={36} className="text-slate-400" />
                                    )}
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Upload size={14} />
                                    <span>{photoPreview ? 'Change Photo' : 'Upload Staff Photo'}</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">First Name *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={firstName} 
                                        onChange={e => setFirstName(e.target.value)} 
                                        placeholder="e.g. Rahul" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Last Name</label>
                                    <input 
                                        type="text" 
                                        value={lastName} 
                                        onChange={e => setLastName(e.target.value)} 
                                        placeholder="e.g. Sharma" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">
                                        Email ID (Login ID) <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Mail size={18} />
                                        </div>
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={e => setEmail(e.target.value)} 
                                            placeholder="Optional (auto-fills if empty)" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Phone size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={phone} 
                                            onChange={e => setPhone(e.target.value)} 
                                            placeholder="+91 98765 43210" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" 
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
                                        <Calendar size={16} className="text-teal-600" /> Date of Birth
                                    </label>
                                    <input 
                                        type="date" 
                                        value={dob} 
                                        onChange={e => setDob(e.target.value)} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-800" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Block 2: Work & Organization Details */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 rounded-l-[2rem]"></div>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center pl-2">
                                <Briefcase size={16} className="mr-2 text-indigo-600" /> Work & Organization Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-2">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Employee ID *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={employeeId} 
                                        onChange={e => setEmployeeId(e.target.value)} 
                                        placeholder="EMP-001" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-800 uppercase" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2 flex items-center justify-between">
                                        <span>Role *</span>
                                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Default: Employee</span>
                                    </label>
                                    <select 
                                        required 
                                        value={role} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setRole(val);
                                            if (!isEditMode) {
                                                if (val === 'Sales' && !activeModules.includes('sales')) {
                                                    setActiveModules(prev => [...new Set([...prev, 'sales', 'dashboard', 'calendar'])]);
                                                } else if (val === 'Finance' && !activeModules.includes('finance')) {
                                                    setActiveModules(prev => [...new Set([...prev, 'finance', 'dashboard', 'calendar'])]);
                                                } else if (val === 'HR' && !activeModules.includes('hr')) {
                                                    setActiveModules(prev => [...new Set([...prev, 'hr', 'dashboard', 'calendar'])]);
                                                }
                                            }
                                        }} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-semibold text-slate-800 cursor-pointer"
                                    >
                                        {EMPLOYEE_ROLES.map((r) => (
                                            <option key={r} value={r}>
                                                {r} {r === 'Employee' ? '(Default)' : ''}
                                            </option>
                                        ))}
                                        {!EMPLOYEE_ROLES.includes(role) && role && (
                                            <option value={role}>{role}</option>
                                        )}
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Select organizational role for access and permissions.</p>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Date of Joining *</label>
                                    <input 
                                        required 
                                        type="date" 
                                        value={dateOfJoining} 
                                        onChange={e => setDateOfJoining(e.target.value)} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Working Shift</label>
                                    <select 
                                        value={shift} 
                                        onChange={e => setShift(e.target.value)} 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800 appearance-none cursor-pointer"
                                    >
                                        <option value="General">General (9:00 AM - 6:00 PM)</option>
                                        <option value="Morning">Morning Shift</option>
                                        <option value="Evening">Evening Shift</option>
                                        <option value="Night">Night Shift</option>
                                        <option value="Flexible">Flexible Timing</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Department</label>
                                    <input 
                                        type="text" 
                                        value={department} 
                                        onChange={e => setDepartment(e.target.value)} 
                                        placeholder="e.g. Sales, IT, Finance, HR" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Designation / Role Title</label>
                                    <input 
                                        type="text" 
                                        value={designation} 
                                        onChange={e => setDesignation(e.target.value)} 
                                        placeholder="e.g. Senior Software Engineer" 
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Per-Day Salary (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={perDaySalary} 
                                            onChange={e => setPerDaySalary(e.target.value)} 
                                            placeholder="e.g. 1000" 
                                            className="w-full pl-9 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-800" 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Daily wage used to auto-calculate payroll for present days.</p>
                                </div>
                            </div>
                        </div>

                        {/* Block 3: Statutory & Identity Details */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-amber-500 rounded-l-[2rem]"></div>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center pl-2">
                                <FileCheck2 size={16} className="mr-2 text-amber-500" /> Statutory & Identity Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2 flex items-center justify-between">
                                        <span>PAN Card Number</span>
                                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">10-Digit Alphanumeric</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <CreditCard size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            maxLength={10}
                                            value={panNumber} 
                                            onChange={e => setPanNumber(e.target.value.toUpperCase())} 
                                            placeholder="ABCDE1234F" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-slate-800 tracking-wider uppercase" 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Permanent Account Number for statutory TDS & compliance.</p>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2 flex items-center justify-between">
                                        <span>Aadhaar Number</span>
                                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">12-Digit UID</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Hash size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            maxLength={14}
                                            value={aadharNumber} 
                                            onChange={e => {
                                                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
                                                setAadharNumber(cleaned);
                                            }} 
                                            placeholder="1234 5678 9012" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-bold text-slate-800 tracking-wider" 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Government identity number for KYC records.</p>
                                </div>
                            </div>
                        </div>

                        {/* Block 4: Bank Account Details */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 rounded-l-[2rem]"></div>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center pl-2">
                                <Landmark size={16} className="mr-2 text-emerald-600" /> Bank Account Details (Salary Disbursement)
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-2">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Bank Name</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Building2 size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={bankName} 
                                            onChange={e => setBankName(e.target.value)} 
                                            placeholder="e.g. HDFC Bank, SBI, ICICI" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800" 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Name of the official bank branch.</p>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Account Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <CreditCard size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={accountNumber} 
                                            onChange={e => setAccountNumber(e.target.value.replace(/\s/g, ''))} 
                                            placeholder="e.g. 50100234567890" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono font-bold text-slate-800" 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Savings or salary account number.</p>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2 flex items-center justify-between">
                                        <span>IFSC Code</span>
                                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">11-Digit Code</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Hash size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            maxLength={11}
                                            value={ifscCode} 
                                            onChange={e => setIfscCode(e.target.value.toUpperCase().replace(/\s/g, ''))} 
                                            placeholder="e.g. HDFC0001234" 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono font-bold text-slate-800 uppercase tracking-wider" 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Bank branch IFSC code for NEFT / RTGS transfers.</p>
                                </div>
                            </div>
                        </div>

                        {/* Block 5: Enabled Dashboard Sections & Modules (Requested feature) */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 rounded-l-[2rem]"></div>
                            
                            <div className="flex justify-between items-start mb-6 pl-2">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center mb-1">
                                        <LayoutDashboard size={16} className="mr-2 text-blue-600" /> Enabled Dashboard Modules & Sections
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium">
                                        Select which sections (e.g. Sales & Leads, Finance, Calendar) this employee is allowed to see on their sidebar and dashboard.
                                    </p>
                                </div>
                                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                                    {activeModules.length} enabled
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
                                {AVAILABLE_MODULES.map((mod) => {
                                    const isEnabled = activeModules.includes(mod.id);
                                    return (
                                        <div 
                                            key={mod.id}
                                            onClick={() => toggleModule(mod.id)}
                                            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                                                isEnabled 
                                                ? 'border-blue-600 bg-blue-50/40 shadow-sm' 
                                                : 'border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-white'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-xs">
                                                    {mod.icon}
                                                </div>
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                                                    isEnabled 
                                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                                    : 'border-slate-300 bg-white'
                                                }`}>
                                                    {isEnabled && <Check size={14} strokeWidth={3} />}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{mod.name}</h4>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Block 4: App Access & Security */}
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 rounded-l-[2rem]"></div>
                            
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center pl-2">
                                <ShieldCheck size={16} className="mr-2 text-emerald-500" /> App Access & Security
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">Assigned Role & Portal Access</label>
                                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                                <UserCheck size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900">{role} Account</h4>
                                                <p className="text-[11px] text-slate-500 mt-0.5">Permissions strictly controlled by the modules enabled above.</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
                                            {role}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">Logs in via the Employee tab using company email & password.</p>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-2">
                                        {isEditMode ? 'Change Password (Leave blank to keep existing)' : 'Initial Temporary Password *'}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Key size={18} />
                                        </div>
                                        <input 
                                            type="password" 
                                            required={!isEditMode} 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            placeholder={isEditMode ? '••••••••' : 'Default: Skite@123'} 
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800" 
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">The employee will use this password to sign into the system.</p>
                                </div>
                            </div>
                        </div>

                    </form>
                )}
            </div>
        </Layout>
    );
}
