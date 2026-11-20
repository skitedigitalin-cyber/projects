import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import HRDashboard from '../components/HRDashboard';
import EmployeeManagement from '../components/EmployeeManagement';
import AttendanceManagement from '../components/AttendanceManagement';
import LeaveManagement from '../components/LeaveManagement';
import TaskManagement from '../components/TaskManagement';
import PayrollManagement from '../components/PayrollManagement';
import { Users, Clock, CalendarRange, Settings, Briefcase, FileSignature, CheckSquare, Banknote } from 'lucide-react';

export default function HR() {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <HRDashboard />;
            case 'employees':
                return <EmployeeManagement />;
            case 'attendance':
                return <AttendanceManagement />;
            case 'leaves':
                return <LeaveManagement />;
            case 'tasks':
                return <TaskManagement />;
            case 'payroll':
                return <PayrollManagement />;
            case 'reports':
                return (
                    <div className="p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 group animate-fade-up delay-200">
                        <div className="bg-white rounded-[1.5rem] p-12 text-center shadow-sm group-hover:shadow-lg transition-all duration-300">
                            <p className="text-slate-500 font-medium group-hover:scale-110 transition-transform duration-300">HR Reports Under Development</p>
                        </div>
                    </div>
                );
            default:
                return <HRDashboard />;
        }
    };

    return (
        <Layout noPadding={true}>
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
                
                /* Custom Scrollbar */
                .custom-scrollbar::-webkit-scrollbar {
                    height: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}} />
            <div className="flex-1 flex flex-col h-full bg-slate-50/50">
                {/* Header section with Tabs */}
                <div className="bg-white border-b border-slate-100 animate-fade-up">
                    <div className="px-8 py-8">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Attendance & HR</h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium">Manage employees, attendance, leaves, and payroll.</p>
                    </div>
                    
                    <div className="px-8 flex space-x-2 overflow-x-auto custom-scrollbar pb-1">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-5 py-3 text-sm font-bold flex items-center border-b-2 transition-all whitespace-nowrap group ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'} rounded-t-xl`}
                        >
                            <Briefcase size={18} className="mr-2 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" /> Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('employees')}
                            className={`px-5 py-3 text-sm font-bold flex items-center border-b-2 transition-all whitespace-nowrap group ${activeTab === 'employees' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'} rounded-t-xl`}
                        >
                            <Users size={18} className="mr-2 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" /> Employees
                        </button>
                        <button
                            onClick={() => setActiveTab('attendance')}
                            className={`px-5 py-3 text-sm font-bold flex items-center border-b-2 transition-all whitespace-nowrap group ${activeTab === 'attendance' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'} rounded-t-xl`}
                        >
                            <Clock size={18} className="mr-2 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" /> Attendance
                        </button>
                        <button
                            onClick={() => setActiveTab('leaves')}
                            className={`px-5 py-3 text-sm font-bold flex items-center border-b-2 transition-all whitespace-nowrap group ${activeTab === 'leaves' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'} rounded-t-xl`}
                        >
                            <FileSignature size={18} className="mr-2 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" /> Leaves
                        </button>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`px-5 py-3 text-sm font-bold flex items-center border-b-2 transition-all whitespace-nowrap group ${activeTab === 'tasks' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'} rounded-t-xl`}
                        >
                            <CheckSquare size={18} className="mr-2 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" /> Assign Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('payroll')}
                            className={`px-5 py-3 text-sm font-bold flex items-center border-b-2 transition-all whitespace-nowrap group ${activeTab === 'payroll' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'} rounded-t-xl`}
                        >
                            <Banknote size={18} className="mr-2 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" /> Payroll
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 animate-fade-up delay-100">
                    {renderTabContent()}
                </div>
            </div>
        </Layout>
    );
}
