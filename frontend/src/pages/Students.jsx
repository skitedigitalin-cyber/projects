import { lazy, Suspense } from 'react';
import Layout from '../components/Layout';
import StudentManagement from '../components/StudentManagement';
import StudentAttendance from '../components/StudentAttendance';
import StudentTasks from '../components/StudentTasks';
import RobotriqClassSchedule from '../components/RobotriqClassSchedule';
import RobotriqBookings from '../components/RobotriqBookings';
import { useAuth } from '../context/AuthContext';
import { getWorkspaceBrand } from '../utils/workspaceBrand';
import { useRobotriqView } from '../utils/useRobotriqView';
import './Students.css';

const RobotriqCertificates = lazy(() => import('../components/RobotriqCertificates'));

export default function Students() {
    const { user } = useAuth();
    const robotriqAdmin = getWorkspaceBrand(user) === 'robotriq' && user?.role === 'Admin';
    const views = [['directory', 'Directory & admissions'], ['attendance', 'Attendance logs'], ['tasks', 'Student tasks']];
    if (robotriqAdmin) views.push(['schedule', 'Class schedule'], ['bookings', 'Class bookings'], ['certificates', 'Certifications']);
    const [activeTab, setActiveTab, action] = useRobotriqView(robotriqAdmin, 'directory', views.map(([id]) => id));
    const addingStudent = action === 'add';
    return (
        <Layout workspace compactTools>
            <div className="students-workspace">
                <header className="students-page-heading">
                    <div><p>Student management</p><h1>Students</h1></div>
                    <nav aria-label="Student views">
                        {views.map(([id, label]) => <button key={id} type="button" aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}
                    </nav>
                </header>
                {activeTab === 'directory' && <StudentManagement key={addingStudent ? 'admission' : 'directory'} startInAdmission={addingStudent} />}
                {activeTab !== 'directory' && <div className={robotriqAdmin ? 'student-tab-content' : undefined}>
                    {activeTab === 'attendance' && <StudentAttendance />}
                    {activeTab === 'tasks' && <StudentTasks />}
                    {activeTab === 'schedule' && robotriqAdmin && <RobotriqClassSchedule />}
                    {activeTab === 'bookings' && robotriqAdmin && <RobotriqBookings admin />}
                    {activeTab === 'certificates' && robotriqAdmin && <Suspense fallback={<p role="status">Loading certifications…</p>}>
                        <RobotriqCertificates />
                    </Suspense>}
                </div>}
            </div>
        </Layout>
    );
}
