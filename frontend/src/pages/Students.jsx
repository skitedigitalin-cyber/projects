import React, { useState } from 'react';
import Layout from '../components/Layout';
import StudentManagement from '../components/StudentManagement';
import StudentAttendance from '../components/StudentAttendance';
import StudentTasks from '../components/StudentTasks';
import './Students.css';

export default function Students() {
    const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'attendance' | 'tasks'

    const views = [['directory', 'Directory & admissions'], ['attendance', 'Attendance logs'], ['tasks', 'Student tasks']];
    return (
        <Layout workspace compactTools>
            <div className="students-workspace">
                <header className="students-page-heading">
                    <div><p>Student management</p><h1>Students</h1></div>
                    <nav aria-label="Student views">
                        {views.map(([id, label]) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}
                    </nav>
                </header>
                {activeTab === 'directory' ? <StudentManagement /> : activeTab === 'attendance' ? <StudentAttendance /> : <StudentTasks />}
            </div>
        </Layout>
    );
}
