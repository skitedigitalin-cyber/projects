import { useState, useEffect } from 'react';
import axios from 'axios';
import './HRViews.css';

const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
const time = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export default function HRDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [workspace, setWorkspace] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const options = {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        };
        axios.get('http://localhost:5000/api/hr/dashboard', options)
            .then(({ data }) => setStats(data))
            .catch(() => {})
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        axios.get('http://localhost:5000/api/hr/workspace', options)
            .then(({ data }) => setWorkspace(data))
            .catch(() => {});
        return () => controller.abort();
    }, []);

    if (loading) return <p role="status">Loading workforce metrics…</p>;
    if (!stats) return <p role="alert">Workforce metrics are unavailable.</p>;

    const attendanceRate = stats.totalEmployees > 0 ? Math.round(stats.presentToday / stats.totalEmployees * 100) : 0;
    const cards = [
        ['Present today', stats.presentToday], ['Absent today', stats.absentToday],
        ['On leave today', stats.onLeaveToday], ['Pending leaves', stats.pendingLeaves],
    ];
    const today = workspace?.today;
    const staff = new Map((workspace?.staff ?? []).map(employee => [String(employee._id), employee]));
    const arrivals = (workspace?.records ?? []).filter(record =>
        staff.has(String(record.employeeId)) && record.checkInTime && day.format(new Date(record.checkInTime)) === today
    );
    const atWork = new Set(arrivals
        .filter(record => ['Present','Half Day','WFH'].includes(record.status))
        .map(record => String(record.employeeId)));
    const departments = new Map();
    for (const [id, employee] of staff) {
        const name = employee.department || 'Unassigned';
        const counts = departments.get(name) ?? { total: 0, present: 0 };
        counts.total++;
        if (atWork.has(id)) counts.present++;
        departments.set(name, counts);
    }

    return (
        <div className="hr-views-stack">
            <dl className="hr-metrics-summary">{cards.map(([label, value]) => (
                <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}</dl>
            <div className="hr-metrics-grid">
                <section className="hr-view-panel hr-workforce-total">
                    <h2>Total staff</h2>
                    <strong>{stats.totalEmployees}</strong>
                    <p>{stats.presentToday} present · {stats.absentToday + stats.onLeaveToday} absent or on leave</p>
                    <progress max={100} value={Math.max(0, Math.min(100, attendanceRate))} aria-label="Attendance rate" />
                    <small>{attendanceRate}% present</small>
                </section>
                <section className="hr-view-panel">
                    <h2>Activity <small>Today</small></h2>
                    {arrivals.length ? <ul className="hr-view-rows">{arrivals.map(record => {
                        const employee = staff.get(String(record.employeeId));
                        return <li key={record._id}>
                            <time dateTime={record.checkInTime}>{time.format(new Date(record.checkInTime))}</time>
                            <span>{employee.firstName} {employee.lastName} checked in</span>
                        </li>;
                    })}</ul> : <p>{workspace ? 'No check-ins today.' : 'Activity data unavailable.'}</p>}
                </section>
                <section className="hr-view-panel">
                    <h2>By department</h2>
                    {departments.size ? <ul className="hr-view-rows">{[...departments].map(([name, count]) =>
                        <li key={name}><span>{name}</span><strong>{count.present} / {count.total} in</strong></li>
                    )}</ul> : <p>{workspace ? 'No active staff.' : 'Department data unavailable.'}</p>}
                </section>
            </div>
        </div>
    );
}
