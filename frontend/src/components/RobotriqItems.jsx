import { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';

const endpoint = `${API_BASE_URL}/api/robotriq/items`;
const fields = [
    ['componentName', 'Component'], ['category', 'Category'], ['brand', 'Brand'],
    ['description', 'Description'], ['specification', 'Specification'],
    ['purchasePrice', 'Purchase price', 'number'], ['salePrice', 'Sale price', 'number'],
    ['stockQty', 'Stock quantity', 'number']
];
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function RobotriqItems({ canDelete }) {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [listing, setListing] = useState(null);
    const [editor, setEditor] = useState(null);
    const [revision, setRevision] = useState(0);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.get(endpoint, { params: { page, search }, signal: controller.signal });
                if (!data.items.length && page > 1) setPage(Math.max(1, Math.ceil(data.total / data.size)));
                else setListing(data);
            } catch {
                if (!controller.signal.aborted) setLoadFailed(true);
            }
        }, 200);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [page, search, revision]);

    async function change(method, values) {
        setBusy(true);
        setMessage('');
        try {
            const id = values._id;
            await axios({ url: id ? `${endpoint}/${id}` : endpoint, method, data: method === 'delete' ? undefined : values });
            setEditor(null);
            setLoadFailed(false);
            setListing(null);
            setRevision(value => value + 1);
            setMessage(method === 'delete' ? 'Item deleted.' : 'Item saved.');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Could not update the item.');
        } finally {
            setBusy(false);
        }
    }

    function goTo(nextPage) {
        setListing(null);
        setLoadFailed(false);
        setPage(nextPage);
    }

    return (
        <section className="grid gap-4">
            <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1">Search items
                    <input className="rounded border bg-white px-3 py-2" value={search} onChange={event => {
                        goTo(1);
                        setSearch(event.target.value);
                    }} />
                </label>
                <button type="button" disabled={busy || !!editor} className="rounded bg-slate-900 px-3 py-2 text-white"
                    onClick={() => setEditor({})}>Add item</button>
            </div>
            {message && <p role="status">{message}</p>}
            {editor && <form className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-2" onSubmit={event => {
                event.preventDefault();
                const values = Object.fromEntries(new FormData(event.currentTarget));
                change(editor._id ? 'put' : 'post', { ...values, _id: editor._id });
            }}>
                <h2 className="font-semibold sm:col-span-2">{editor._id ? 'Edit item' : 'New item'}</h2>
                {fields.map(([field, label, type]) => <label className="grid gap-1" key={field}>{label}
                    <input className="rounded border px-3 py-2" name={field} type={type || 'text'}
                        required={field === 'componentName'} min={type === 'number' ? 0 : undefined}
                        step={type === 'number' ? 'any' : undefined} defaultValue={editor[field] ?? ''} />
                </label>)}
                <div className="flex gap-2 sm:col-span-2">
                    <button className="rounded bg-slate-900 px-3 py-2 text-white" disabled={busy}>Save item</button>
                    <button className="rounded border px-3 py-2" type="button" disabled={busy} onClick={() => setEditor(null)}>Cancel</button>
                </div>
            </form>}
            {loadFailed && <p role="alert">Could not load items.</p>}
            {!listing && !loadFailed && <p role="status">Loading items…</p>}
            {listing?.items.length === 0 && <p>No matching items.</p>}
            {listing?.items.length > 0 && <>
                <div className="overflow-x-auto rounded border bg-white">
                    <table className="w-full text-left text-sm">
                        <thead><tr>{fields.map(([field, label]) => <th className="p-3" key={field}>{label}</th>)}
                            <th className="p-3">Actions</th></tr></thead>
                        <tbody>{listing.items.map(item => <tr className="border-t" key={item._id}>
                            {fields.map(([field]) => <td className="p-3" key={field}>
                                {field.endsWith('Price') ? currency.format(item[field] ?? 0) : item[field] ?? '—'}
                            </td>)}
                            <td className="space-x-2 whitespace-nowrap p-3">
                                <button type="button" disabled={busy || !!editor} onClick={() => setEditor(item)}>Edit</button>
                                {canDelete && <button type="button" disabled={busy || !!editor} onClick={() => {
                                    if (window.confirm(`Delete ${item.componentName}?`)) change('delete', item);
                                }}>Delete</button>}
                            </td>
                        </tr>)}</tbody>
                    </table>
                </div>
                <nav className="flex items-center gap-3" aria-label="Item pages">
                    <button type="button" disabled={page === 1} onClick={() => goTo(page - 1)}>Previous</button>
                    <span>Page {page} of {Math.ceil(listing.total / listing.size)}</span>
                    <button type="button" disabled={page * listing.size >= listing.total} onClick={() => goTo(page + 1)}>Next</button>
                </nav>
            </>}
        </section>
    );
}
