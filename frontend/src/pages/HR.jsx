import { useState } from 'react';
import Layout from '../components/Layout';
import HRDashboard from '../components/HRDashboard';
import EmployeeManagement from '../components/EmployeeManagement';
import AttendanceManagement from '../components/AttendanceManagement';
import LeaveManagement from '../components/LeaveManagement';
import TaskManagement from '../components/TaskManagement';
import PayrollManagement from '../components/PayrollManagement';
import HRWorkspace, { HRWorkspaceHeading } from '../components/HRWorkspace';
import './HR.css';

export default function HR() {
    const [activeTab, setActiveTab] = useState('overview');
    const [summary, setSummary] = useState(null);

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

    const views = [
        ['overview', 'Overview'], ['dashboard', 'Metrics'], ['employees', 'Employees'], ['attendance', 'Attendance'],
        ['leaves', 'Leaves'], ['tasks', 'Assign tasks'], ['payroll', 'Payroll'],
    ];

    return (
        <Layout workspace compactTools>
            <div className="hr-workspace">
                <HRWorkspaceHeading summary={summary} title={activeTab === 'dashboard' ? 'Workforce today' : activeTab === 'overview' ? undefined : views.find(([id]) => id === activeTab)?.[1]} />
                <nav className="hr-workspace-tabs" aria-label="HR views">
                    {views.map(([id, label]) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}
                </nav>
                {activeTab === 'overview' && <HRWorkspace onSummaryChange={setSummary}
                    onViewLeaves={() => setActiveTab('leaves')} onViewAttendance={() => setActiveTab('attendance')} />}
                {activeTab !== 'overview' && <div>{renderTabContent()}</div>}
            </div>
        </Layout>
    );
}
