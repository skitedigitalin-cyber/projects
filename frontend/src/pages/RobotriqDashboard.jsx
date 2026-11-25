import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowUpRight, Award, Bell, BriefcaseBusiness, CalendarCheck, CalendarDays, ClipboardCheck,
    FileText, GraduationCap, Landmark, ListChecks, ReceiptText, UserPlus, Users
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../api';
import Layout from '../components/Layout';
import '../components/DashboardNumbers.css';
import '../components/DashboardActivity.css';

const sections = [
    ['Training', [
        ['Add Student', '/students?view=directory&action=add', UserPlus],
        ['Student Details', '/students', GraduationCap, 'students'],
        ['Student Attendance', '/students?view=attendance', CalendarCheck],
        ['Student Tasks', '/students?view=tasks', ListChecks],
        ['Class Schedule', '/students?view=schedule', CalendarDays],
        ['Class Bookings', '/students?view=bookings', CalendarCheck, 'pendingBookings'],
        ['Certifications', '/students?view=certificates', Award]
    ]],
    ['Staff', [
        ['Add Employee', '/hr/employee/add', UserPlus],
        ['Employee Details', '/hr?view=employees', Users, 'employees'],
        ['Staff Access', '/hr?view=staff-access', Users],
        ['Employee Attendance', '/hr?view=attendance', CalendarCheck],
        ['Assign Tasks', '/hr?view=tasks', ListChecks],
        ['Employee Payroll', '/hr?view=payroll', Landmark],
        ['Leave Requests', '/hr?view=leaves', ClipboardCheck, 'pendingLeave']
    ]],
    ['Sales and accounts', [
        ['Manage Leads', '/sales?view=training-leads', Users],
        ['Lead Reminders', '/sales?view=robotriq-reminders', Bell],
        ['Customers', '/finance?view=customers', Users],
        ['Robotriq Enquiries', '/sales?view=direct-enquiries', BriefcaseBusiness],
        ['Quotations', '/finance?view=quotations', FileText],
        ['Legacy Quotations', '/finance?view=legacy-quotations', FileText],
        ['Accounts Hub', '/accounts', Landmark],
        ['Payment Receipt', '/finance?view=receipts', ReceiptText]
    ]],
];

const metrics = [
    ['students', 'Students', 'Open student directory', '/students'],
    ['employees', 'Active employees', 'Open employee directory', '/hr?view=employees'],
    ['pendingBookings', 'Pending class bookings', 'Review class bookings', '/students?view=bookings']
];

const quickLinks = [
    ['Training leads', '/sales?view=training-leads'],
    ['Robotriq enquiries', '/sales?view=direct-enquiries'],
    ['Quotations', '/finance?view=quotations'],
    ['Student receipts', '/finance?view=receipts'],
    ['Accounts Hub', '/accounts'],
    ['Student Login', '/robotriq/student']
];

function ModernDashboard({ counts, failed }) {
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata'
    }).format(now);
    const hour = Number(new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata'
    }).format(now));
    const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
    const pending = counts ? counts.pendingLeave + counts.pendingBookings : null;

    return <div className="skite-dashboard">
        <section className="dashboard-intro">
            <div>
                <time className="dashboard-intro-date" dateTime={now.toISOString()}>{date}</time>
                <h1>{greeting} <span>{pending == null ? 'Here’s your Robotriq overview.' :
                    pending === 1 ? '1 request needs your attention.' : `${pending} requests need your attention.`}</span></h1>
            </div>
            <div className="dashboard-intro-actions">
                <Link to="/students?view=directory&action=add"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111] px-5 font-medium text-white hover:bg-[#303030]">
                    <UserPlus size={16} aria-hidden="true" /> Add student
                </Link>
            </div>
        </section>

        {failed && <p role="alert" className="mb-4">Could not load dashboard totals.</p>}
        <section className="dashboard-numbers" aria-label="Robotriq totals" aria-busy={!counts && !failed}>
            {metrics.map(([key, label, action, to], index) =>
                <article key={key} className={index === 0 ? 'dashboard-number dashboard-number-collected' : 'dashboard-number'}>
                    <div className={index === 0 ? 'dashboard-collection-value' : 'dashboard-number-detail'}>
                        <span className="dashboard-number-label">{label}</span>
                        <strong>{counts?.[key] ?? '—'}</strong>
                        <Link className="dashboard-number-note hover:underline" to={to}>{action} →</Link>
                    </div>
                </article>
            )}
        </section>

        <div className="dashboard-activity">
            <section className="dashboard-panel" aria-labelledby="robotriq-dashboard-requests">
                <header><h2 id="robotriq-dashboard-requests">Pending requests</h2></header>
                <ul className="dashboard-followups">
                    {[
                        ['Leave requests', 'pendingLeave', '/hr?view=leaves'],
                        ['Class bookings', 'pendingBookings', '/students?view=bookings']
                    ].map(([label, key, to]) => <li key={key}>
                        <Link to={to}>
                            <strong>{counts?.[key] ?? '—'}</strong><span>{label}</span>
                            <span className="dashboard-followup-open" aria-hidden="true"><ArrowUpRight size={15} /></span>
                        </Link>
                    </li>)}
                </ul>
            </section>
            <section className="dashboard-panel" aria-labelledby="robotriq-dashboard-shortcuts">
                <header><h2 id="robotriq-dashboard-shortcuts">Shortcuts</h2></header>
                <div className="grid gap-2 sm:grid-cols-2">
                    {quickLinks.map(([label, to]) => <Link key={to} to={to}
                        className="flex min-h-11 items-center justify-between gap-2 rounded-xl bg-[#f5f5f3] px-3 hover:bg-[#ededea]">
                        {label}<ArrowUpRight size={15} aria-hidden="true" />
                    </Link>)}
                </div>
            </section>
        </div>
    </div>;
}

export default function RobotriqDashboard() {
    const [counts, setCounts] = useState(null);
    const [failed, setFailed] = useState(false);
    const [params, setParams] = useSearchParams();
    const legacy = params.get('view') === 'legacy';

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${API_BASE_URL}/api/robotriq/dashboard`, { signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setCounts(data); })
            .catch(() => { if (!controller.signal.aborted) setFailed(true); });
        return () => controller.abort();
    }, []);

    return <Layout workspace compactTools={legacy} pendingCount={counts?.pendingLeave || 0}>
        <div className="dashboard-intro-actions mb-4">
            <div className="dashboard-periods" role="group" aria-label="Dashboard view">
                <button type="button" aria-pressed={!legacy} onClick={() => setParams({})}>Modern</button>
                <button type="button" aria-pressed={legacy} onClick={() => setParams({ view: 'legacy' })}>Legacy</button>
            </div>
        </div>
        {legacy ? <div className="grid gap-7">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                    <p className="text-sm text-slate-600">Robotriq Automation</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
                </div>
                <Link to="/robotriq/student" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
                    <GraduationCap size={18} aria-hidden="true" /> Student Login
                    <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
            </header>
            {sections.map(([title, entries]) => <section key={title} aria-label={title}>
                <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {entries.map(([label, path, Icon, metric]) => {
                        const count = metric ? counts?.[metric] : undefined;
                        const pending = metric === 'pendingLeave' || metric === 'pendingBookings';
                        return <Link key={path} to={path}
                            className="flex min-h-14 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-slate-900">
                            <Icon className="shrink-0 text-slate-600" size={18} aria-hidden="true" />
                            <span className="font-medium">{label}</span>
                            {count != null && (!pending || count > 0) &&
                                <span className="ml-auto text-xs tabular-nums text-slate-600">{count}{pending ? ' pending' : ''}</span>}
                        </Link>;
                    })}
                </div>
            </section>)}
        </div> : <ModernDashboard counts={counts} failed={failed} />}
    </Layout>;
}
