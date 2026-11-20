import React, { useState } from 'react';
import Layout from '../components/Layout';
import StudentManagement from '../components/StudentManagement';
import StudentAttendance from '../components/StudentAttendance';
import { GraduationCap, CalendarClock } from 'lucide-react';

export default function Students() {
    const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'attendance'

    return (
        <Layout>
            <div className="space-y-6">
                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('directory')}
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
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
                        className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                            activeTab === 'attendance'
                                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <CalendarClock size={16} />
                        <span>Attendance Logs</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === 'directory' ? (
                        <StudentManagement />
                    ) : (
                        <StudentAttendance />
                    )}
                </div>
            </div>
        </Layout>
    );
}
