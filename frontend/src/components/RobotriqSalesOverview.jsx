import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';
import { robotriqEnquiryStatuses } from './RobotriqEnquiries';

const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'short' });

export default function RobotriqSalesOverview({ openEnquiries }) {
    const [overview, setOverview] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${API_BASE_URL}/api/robotriq/sales-overview`, { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) setOverview(data);
        }).catch(() => {
            if (!controller.signal.aborted) setError(true);
        });
        return () => controller.abort();
    }, []);

    if (!overview) return <p role={error ? 'alert' : 'status'}>{error ? 'Could not load the Mine Power dashboard.' : 'Loading the Mine Power dashboard…'}</p>;
    const counts = new Map(overview.counts.map(({ _id, count }) => [_id, count]));
    const statuses = [...new Set([...robotriqEnquiryStatuses, ...counts.keys()])];

    return <section className="grid gap-4 rounded border bg-white p-4">
        <p className="font-semibold">{overview.total} total enquiries</p>
        <section aria-label="Enquiry status breakdown" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {statuses.map(status => {
                const props = { className: 'rounded border px-3 py-2 text-left', children: <>{status} <strong>{counts.get(status) || 0}</strong></> };
                return openEnquiries ? <button type="button" key={status} {...props} onClick={() => openEnquiries(status)} />
                    : <div key={status} {...props} />;
            })}
        </section>
        <h2 className="font-semibold">Recent enquiries</h2>
        {overview.recent.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr>{['Date', 'Enquiry ID', 'Customer', 'Type', 'Status'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
            <tbody>{overview.recent.map(row => <tr className="border-t" key={row._id}>
                <td className="p-2">{row.enquiryDate ? day.format(new Date(row.enquiryDate)) : '—'}</td><td className="p-2">{row.enquiryId}</td>
                <td className="p-2">{row.customerName}</td><td className="p-2">{row.type || '—'}</td><td className="p-2">{row.status || 'New'}</td>
            </tr>)}</tbody>
        </table></div> : <p>No recent enquiries.</p>}
    </section>;
}
