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
            <main className="mx-auto max-w-md px-6 py-16">
                <form onSubmit={signIn} className="grid gap-4 rounded-lg border bg-white p-6">
                    <h1 className="text-2xl font-semibold">Robotriq Student Login</h1>
                    <label className="grid gap-1">
                        Student ID or email
                        <input className="rounded border p-2" name="identifier" autoComplete="username" maxLength={254} required />
                    </label>
                    <label className="grid gap-1">
                        Password
                        <input className="rounded border p-2" name="password" type="password" autoComplete="current-password" required />
                    </label>
                    {message && <p role="alert">{message}</p>}
                    <button className="rounded bg-slate-900 p-2 text-white" type="submit" disabled={busy}>
                        {busy ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
            </main>
        );
    }

    const { student, attendance, activeAttendance, legacyAttendance, tasks, schedule } = profile;
    const records = showLegacyAttendance ? legacyAttendance : attendance;
    const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    return (
        <main className="mx-auto grid max-w-4xl gap-6 px-6 py-10">
            <header className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">{student.fullName}</h1>
                    <p>{student.studentId} · {student.course}</p>
                </div>
                <button className="rounded border px-3 py-2" type="button" onClick={() => {
                    portalRequest.current?.abort();
                    setPortalBusy(false);
                    setTopic('');
                    setNotice('');
                    setShowLegacyAttendance(false);
                    setStudentToken('');
                    setProfile(null);
                }}>Sign out</button>
            </header>
            <section className="rounded-lg border bg-white p-4">
                <h2 className="font-semibold">Fees</h2>
                <dl className="grid gap-3 sm:grid-cols-3">
                    {[['Total fees', student.fees], ['Paid', student.paidAmount], ['Balance', student.pendingAmount]].map(([label, amount]) =>
                        <div key={label}><dt>{label}</dt><dd>{currency.format(amount || 0)}</dd></div>)}
                </dl>
            </section>
            <section className="rounded-lg border bg-white p-4">
                <h2 className="font-semibold">Attendance</h2>
                <div className="my-3 flex flex-wrap items-start gap-3">
                    {activeAttendance ? <form className="grid gap-2" onSubmit={event => {
                        event.preventDefault();
                        updatePortal('attendance/check-out', 'POST', { workSummary: topic }, 'Checked out.');
                    }}>
                        <p>Checked in at {activeAttendance.checkIn}</p>
                        <label className="grid gap-1">Today’s topic
                            <textarea className="rounded border p-2" autoComplete="off" required minLength={5} maxLength={2000}
                                value={topic} onChange={event => setTopic(event.target.value)} />
                        </label>
                        <button className="justify-self-start rounded bg-slate-900 px-3 py-2 text-white" disabled={portalBusy}>Check out</button>
                    </form> : <button className="rounded bg-slate-900 px-3 py-2 text-white" type="button" disabled={portalBusy}
                        onClick={() => updatePortal('attendance/check-in', 'POST', undefined, 'Checked in.')}>Check in</button>}
                    <button className="rounded border px-3 py-2" type="button" disabled={portalBusy}
                        onClick={() => updatePortal()}>Refresh records</button>
                </div>
                {notice && <p role="status">{notice}</p>}
                <label className="mb-3 grid max-w-xs gap-1">Attendance history
                    <select className="rounded border p-2" value={showLegacyAttendance ? 'legacy' : 'current'}
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
            <section className="rounded-lg border bg-white p-4">
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
            <section className="rounded-lg border bg-white p-4">
                <h2 className="font-semibold">Assigned tasks</h2>
                {tasks.length ? <ul className="divide-y">{tasks.map(task =>
                    <li key={`${task.legacy ? 'legacy' : 'current'}-${task._id}`} className="py-2">
                        <p>{task.title} · {task.status}{task.dueDate ? ` · Due ${task.dueDate}` : ''}</p>
                        {task.description && <p>{task.description}</p>}
                        {task.status !== 'Completed' && <button type="button" disabled={portalBusy}
                            className="mt-2 rounded border px-3 py-1" onClick={() => updatePortal(
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
