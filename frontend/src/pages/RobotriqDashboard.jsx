import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight, Award, Bell, BriefcaseBusiness, CalendarCheck, CalendarDays, ClipboardCheck,
    FileText, GraduationCap, Landmark, ListChecks, ReceiptText, UserPlus, Users
} from 'lucide-react';
import axios from 'axios';
import API_BASE_URL from '../api';
import Layout from '../components/Layout';

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

export default function RobotriqDashboard({ viewSwitch }) {
    const [counts, setCounts] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${API_BASE_URL}/api/robotriq/dashboard`, { signal: controller.signal })
            .then(({ data }) => { if (!controller.signal.aborted) setCounts(data); })
            .catch(() => {});
        return () => controller.abort();
    }, []);

    return <Layout workspace compactTools pendingCount={counts?.pendingLeave || 0}>
        <div className="dashboard-intro-actions mb-4">{viewSwitch}</div>
        <div className="grid gap-7">
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
        </div>
    </Layout>;
}
