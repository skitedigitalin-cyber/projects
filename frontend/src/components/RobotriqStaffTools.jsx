import { lazy, Suspense, useState } from 'react';
import RobotriqItems from './RobotriqItems';
import RobotriqBoms from './RobotriqBoms';
import RobotriqCustomers from './RobotriqCustomers';
import RobotriqEnquiries from './RobotriqEnquiries';
import RobotriqSalesOverview from './RobotriqSalesOverview';
import RobotriqLedger from './RobotriqLedger';

const Quotes = lazy(() => import('./RobotriqSalesQuotes'));

const tools = [
    ['salesDashboard', 'Mine Power dashboard'],
    ['salesLeads', 'Mine Power enquiries'], ['salesCustomers', 'Customers'],
    ['salesItems', 'Items Master'], ['salesBom', 'Bills of Materials'], ['salesQuotation', 'Mine Power quotations'],
    ['salesExpenses', 'Mine Power expenses'], ['salesAccounts', 'Mine Power sale accounts']
];

export function hasRobotriqStaffTools(permissions, role) {
    return role === 'Sales' || tools.some(([key]) => permissions?.[key] === true);
}

export default function RobotriqStaffTools({ permissions, role }) {
    const [requested, setRequested] = useState('');
    const [status, setStatus] = useState('');
    const available = tools.filter(([id]) => role === 'Sales' || permissions?.[id] === true);
    const active = available.some(([id]) => id === requested) ? requested : available[0]?.[0];
    if (!active) return null;
    return <section className="grid gap-4">
        <nav aria-label="Robotriq sales tools" className="flex flex-wrap gap-2">
            {available.map(([id, label]) => <button className={`rounded border px-3 py-2 ${active === id ? 'bg-slate-900 text-white' : 'bg-white'}`}
                key={id} type="button" aria-current={active === id ? 'page' : undefined} onClick={() => {
                    setStatus('');
                    setRequested(id);
                }}>{label}</button>)}
        </nav>
        {active === 'salesDashboard' && <RobotriqSalesOverview openEnquiries={available.some(([id]) => id === 'salesLeads')
            ? value => { setStatus(value); setRequested('salesLeads'); } : undefined} />}
        {active === 'salesLeads' && <RobotriqEnquiries key={status} mode="sales" initialStatus={status} personal={role !== 'Sales'} />}
        {active === 'salesCustomers' && <RobotriqCustomers />}
        {active === 'salesItems' && <RobotriqItems />}
        {active === 'salesBom' && <RobotriqBoms />}
        {active === 'salesQuotation' && <Suspense fallback={<p role="status">Loading quotations…</p>}><Quotes /></Suspense>}
        {active === 'salesExpenses' && <RobotriqLedger expenseManagement />}
        {active === 'salesAccounts' && <RobotriqEnquiries mode="accounts" />}
    </section>;
}
