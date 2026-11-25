import { Link } from 'react-router-dom';
import './PublicPages.css';
import './Students.css';
import '../components/RobotriqWorkspace.css';
import { useRef, useState } from 'react';
import API_BASE_URL from '../api';
import RobotriqLeave from '../components/RobotriqLeave';
import RobotriqBookings from '../components/RobotriqBookings';

async function studentRequest(path, options) {
    const response = await fetch(`${API_BASE_URL}/api/robotriq/student/${path}`, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || 'Could not open the student portal.');
    return data;
}

export default function RobotriqStudentPortal() {
    const [profile, setProfile] = useState(null);
    const [studentToken, setStudentToken] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [topic, setTopic] = useState('');
    const [notice, setNotice] = useState('');
    const [portalBusy, setPortalBusy] = useState(false);
    const [showLegacyAttendance, setShowLegacyAttendance] = useState(false);
    const portalRequest = useRef(null);

    async function signIn(event) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const { identifier, password } = Object.fromEntries(new FormData(form));
        setBusy(true);
        setMessage('');
        try {
            const { token } = await studentRequest('login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            const data = await studentRequest('me', { headers: { Authorization: `Bearer ${token}` } });
            form.reset();
            setStudentToken(token);
            setProfile(data);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setBusy(false);
        }
    }

    async function updatePortal(path, method, body, success) {
        if (portalBusy) return;
        const controller = new AbortController();
        portalRequest.current = controller;
        const headers = { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' };
        setPortalBusy(true);
        setNotice('');
        try {
            if (path) {
                await studentRequest(path, { method, headers, signal: controller.signal, body: body ? JSON.stringify(body) : undefined });
                if (!controller.signal.aborted) {
                    setNotice(success);
                    if (path === 'attendance/check-out') setTopic('');
                }
            }
            const data = await studentRequest('me', { headers, signal: controller.signal });
            if (!controller.signal.aborted) setProfile(data);
        } catch (error) {
            if (!controller.signal.aborted) setNotice(error.message);
        } finally {
            if (!controller.signal.aborted) setPortalBusy(false);
        }
    }

    if (!profile) {
        return (
            <main className="public-page login-page">
                <section className="login-brand-panel" aria-label="Skite">
                    <Link to="/" className="public-brand"><span aria-hidden="true" /> skite</Link>
                    <p className="login-tagline">Robotriq student portal</p>
                    <ul className="public-mono login-modules">
                        <li>Attendance</li><li>Class schedule</li><li>Assignments</li>
                    </ul>
                </section>
                <section className="login-form-panel" aria-labelledby="student-login-heading">
                    <div className="login-form-content">
                        <h1 id="student-login-heading">Student sign-in</h1>
                        <p>Sign in to your Robotriq student account.</p>
                        <form onSubmit={signIn} className="login-form">
                            {message && <p className="login-error" role="alert">{message}</p>}
                            <div>
                                <label htmlFor="student-identifier">Student ID or email</label>
                                <input id="student-identifier" name="identifier" autoComplete="username" maxLength={254} required />
                            </div>
                            <div>
                                <label htmlFor="student-password">Password</label>
                                <input id="student-password" name="password" type="password" autoComplete="current-password" required />
                            </div>
                            <button className="public-button" type="submit" disabled={busy}>
                                {busy ? 'Signing in…' : <>Sign in <span aria-hidden="true">→</span></>}
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        );
    }

    const { student, attendance, activeAttendance, legacyAttendance, tasks, schedule } = profile;
    const records = showLegacyAttendance ? legacyAttendance : attendance;
    const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    return (
        <main className="robotriq-workflow mx-auto grid max-w-6xl gap-6 px-6 py-10">
            <header className="students-page-heading flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">{student.fullName}</h1>
                    <p>{student.studentId} · {student.course}</p>
                </div>
                <button className="robotriq-secondary" type="button" onClick={() => {
                    portalRequest.current?.abort();
                    setPortalBusy(false);
                    setTopic('');
                    setNotice('');
                    setShowLegacyAttendance(false);
                    setStudentToken('');
                    setProfile(null);
                }}>Sign out</button>
            </header>
            <section className="robotriq-panel">
                <h2 className="font-semibold">Fees</h2>
                <dl className="robotriq-portal-fees grid gap-3 sm:grid-cols-3">
                    {[['Total fees', student.fees], ['Paid', student.paidAmount], ['Balance', student.pendingAmount]].map(([label, amount]) =>
                        <div key={label}><dt>{label}</dt><dd>{currency.format(amount || 0)}</dd></div>)}
                </dl>
            </section>
            <section className="robotriq-panel">
                <h2 className="font-semibold">Attendance</h2>
                <div className="my-3 flex flex-wrap items-start gap-3">
                    {activeAttendance ? <form className="grid gap-2" onSubmit={event => {
                        event.preventDefault();
                        updatePortal('attendance/check-out', 'POST', { workSummary: topic }, 'Checked out.');
                    }}>
                        <p>Checked in at {activeAttendance.checkIn}</p>
                        <label className="grid gap-1">Today’s topic
                            <textarea className="robotriq-field" autoComplete="off" required minLength={5} maxLength={2000}
                                value={topic} onChange={event => setTopic(event.target.value)} />
                        </label>
                        <button className="justify-self-start robotriq-primary" disabled={portalBusy}>Check out</button>
                    </form> : <button className="robotriq-primary" type="button" disabled={portalBusy}
                        onClick={() => updatePortal('attendance/check-in', 'POST', undefined, 'Checked in.')}>Check in</button>}
                    <button className="robotriq-secondary" type="button" disabled={portalBusy}
                        onClick={() => updatePortal()}>Refresh records</button>
                </div>
                {notice && <p role="status">{notice}</p>}
                <label className="mb-3 grid max-w-xs gap-1">Attendance history
                    <select className="robotriq-field" value={showLegacyAttendance ? 'legacy' : 'current'}
                        onChange={event => setShowLegacyAttendance(event.target.value === 'legacy')}>
                        <option value="current">SkiteCRM records</option>
                        <option value="legacy">Legacy Robotriq records</option>
                    </select>
                </label>
                {records?.length ? <ul className="divide-y">{records.map(row =>
                    <li key={row._id} className="py-2">
                        <p>{row.date} · {row.checkIn || '—'} to {row.checkOut || '—'} · {row.status}{row.duration && ` · ${row.duration}`}</p>
                        {row.workSummary && <p>{row.workSummary}</p>}
                    </li>
                )}</ul> : <p>No attendance recorded.</p>}
            </section>
            <section className="robotriq-panel">
                <h2 className="font-semibold">Class schedule</h2>
                {schedule.length ? <ul className="divide-y">{schedule.map((slot, index) =>
                    <li key={slot._id || index} className="py-2">
                        <p>{slot.day || `Day ${slot.dayNum || index + 1}`} · {slot.topic}</p>
                        {slot.trainer && <p>{slot.trainer}</p>}
                        {/^[\t ]*https?:\/\//i.test(slot.link || '') &&
                            <a href={slot.link.trim()} target="_blank" rel="noopener noreferrer" className="underline">Class link</a>}
                    </li>
                )}</ul> : <p>No schedule published for this course.</p>}
            </section>
            <section className="robotriq-panel">
                <h2 className="font-semibold">Assigned tasks</h2>
                {tasks.length ? <ul className="divide-y">{tasks.map(task =>
                    <li key={`${task.legacy ? 'legacy' : 'current'}-${task._id}`} className="py-2">
                        <p>{task.title} · {task.status}{task.dueDate ? ` · Due ${task.dueDate}` : ''}</p>
                        {task.description && <p>{task.description}</p>}
                        {task.status !== 'Completed' && <button type="button" disabled={portalBusy}
                            className="mt-2 robotriq-secondary" onClick={() => updatePortal(
                                `tasks/${task._id}/complete${task.legacy ? '?source=legacy' : ''}`, 'PATCH', undefined, 'Task completed.'
                            )}>Mark completed</button>}
                    </li>
                )}</ul> : <p>No assigned tasks.</p>}
            </section>
            <RobotriqBookings studentToken={studentToken} />
            <RobotriqLeave studentToken={studentToken} />
        </main>
    );
}
