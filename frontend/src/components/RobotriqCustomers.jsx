import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';
import { useAuth } from '../context/AuthContext';

const endpoint = `${API_BASE_URL}/api/robotriq/customers`;
const fields = [
    ['companyName', 'Company'], ['customerName', 'Customer'], ['phone', 'Phone'],
    ['email', 'Email'], ['gstNo', 'GST number'], ['address', 'Address']
];

export default function RobotriqCustomers() {
    const { user } = useAuth();
    const [customers, setCustomers] = useState(null);
    const [editor, setEditor] = useState(null);
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data }) => setCustomers(data)).catch(() => {
            if (!controller.signal.aborted) setMessage('Could not load Robotriq customers.');
        });
        return () => controller.abort();
    }, []);

    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            const payload = Object.fromEntries(new FormData(event.currentTarget));
            const { data } = editor._id
                ? await axios.put(`${endpoint}/${editor._id}`, payload)
                : await axios.post(endpoint, payload);
            setCustomers(current => editor._id
                ? current.map(customer => customer._id === data._id ? data : customer)
                : [data, ...current]);
            setEditor(null);
            setMessage('Customer saved.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Could not save the customer.');
        } finally {
            setBusy(false);
        }
    }

    async function remove(customer) {
        if (!window.confirm(`Delete ${customer.customerName}?`)) return;
        setBusy(true);
        setMessage('');
        try {
            await axios.delete(`${endpoint}/${customer._id}`);
            setCustomers(current => current.filter(row => row._id !== customer._id));
            setMessage('Customer deleted.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Could not delete the customer.');
        } finally {
            setBusy(false);
        }
    }

    const visible = customers?.filter(customer => fields.some(([field]) =>
        (customer[field] || '').toLowerCase().includes(search.trim().toLowerCase())));
    return (
        <section className="grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1">Search customers
                    <input className="rounded border bg-white px-3 py-2" value={search} onChange={event => setSearch(event.target.value)} />
                </label>
                <button className="rounded bg-slate-900 px-3 py-2 text-white" type="button"
                    disabled={!customers || busy || !!editor} onClick={() => setEditor({})}>Add customer</button>
            </div>
            {message && <p role="status">{message}</p>}
            {editor && (
                <form className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-2" onSubmit={save}>
                    <h2 className="font-semibold sm:col-span-2">{editor._id ? 'Edit customer' : 'New customer'}</h2>
                    {fields.map(([field, label]) => (
                        <label className="grid gap-1" key={field}>{label}
                            <input className="rounded border px-3 py-2" name={field} defaultValue={editor[field] || ''} />
                        </label>
                    ))}
                    <div className="flex gap-2 sm:col-span-2">
                        <button className="rounded bg-slate-900 px-3 py-2 text-white" disabled={busy}>Save customer</button>
                        <button className="rounded border px-3 py-2" disabled={busy} type="button" onClick={() => setEditor(null)}>Cancel</button>
                    </div>
                </form>
            )}
            {visible?.length > 0 && (
                <div className="overflow-x-auto rounded border bg-white">
                    <table className="w-full text-left text-sm">
                        <thead><tr>{fields.map(([field, label]) => <th className="p-3" key={field}>{label}</th>)}<th className="p-3">Actions</th></tr></thead>
                        <tbody>{visible.map(customer => <tr className="border-t" key={customer._id}>
                            {fields.map(([field]) => <td className="p-3" key={field}>{customer[field] || '—'}</td>)}
                            <td className="space-x-2 whitespace-nowrap p-3">
                                <button type="button" disabled={busy || !!editor} onClick={() => setEditor(customer)}>Edit</button>
                                {user.role === 'Admin' && <button type="button" disabled={busy || !!editor} onClick={() => remove(customer)}>Delete</button>}
                            </td>
                        </tr>)}</tbody>
                    </table>
                </div>
            )}
            {visible?.length === 0 && <p>No matching customers.</p>}
            {!customers && !message && <p role="status">Loading customers…</p>}
        </section>
    );
}
