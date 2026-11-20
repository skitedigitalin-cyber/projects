import React, { useState } from 'react';
import Layout from '../components/Layout';
import StudentManagement from '../components/StudentManagement';
import StudentAttendance from '../components/StudentAttendance';
import StudentTasks from '../components/StudentTasks';
import { GraduationCap, CalendarClock, CheckSquare } from 'lucide-react';

export default function Students() {
    const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'attendance' | 'tasks'

    return (
        <Layout>
            <div className="space-y-6">
                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setActiveTab('directory')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                            activeTab === 'directory'
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <GraduationCap size={16} />
                        <span>Students Directory & Admissions</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('attendance')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                            activeTab === 'attendance'
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <CalendarClock size={16} />
                        <span>Attendance Logs</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                            activeTab === 'tasks'
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <CheckSquare size={16} />
                        <span>Student Tasks</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'directory' ? (
                        <StudentManagement />
                    ) : activeTab === 'attendance' ? (
                        <StudentAttendance />
                    ) : (
                        <StudentTasks />
                    )}
                </div>
            </div>
        </Layout>
    );
}
