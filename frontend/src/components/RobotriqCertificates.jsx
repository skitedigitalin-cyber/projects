import RobotriqPagedTable from './RobotriqPagedTable';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../api';
import { robotriqCertificatePdf } from '../utils/robotriqCertificatePdf';

const endpoint = `${API_BASE_URL}/api/robotriq/certificates`;
const control = 'rounded border bg-white px-3 py-2';
const primary = 'rounded bg-slate-900 px-3 py-2 text-white';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', dateStyle: 'short' }).format(new Date());
const blank = () => ({ studentName: '', uid: '', courseName: '', brand: '', products: '', date: today() });
const fields = [
    ['studentName', 'Student name', 160, true], ['uid', 'Certificate UID', 100, true],
    ['courseName', 'Course', 220, true], ['brand', 'Brand', 160], ['products', 'Products', 400]
];

export default function RobotriqCertificates({ delegated = false }) {
    const [history, setHistory] = useState(null);
    const [draft, setDraft] = useState(blank);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [failed, setFailed] = useState(false);
    const [search, setSearch] = useState('');
    const [preview, setPreview] = useState('');
    const upload = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(endpoint, { signal: controller.signal }).then(({ data }) => {
            if (!controller.signal.aborted) setHistory(data);
        }).catch(() => {
            if (!controller.signal.aborted) {
                setFailed(true);
                setNotice('Could not load certificate history.');
            }
        });
        return () => controller.abort();
    }, []);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    async function perform(work, failure) {
        setBusy(true);
        setNotice('');
        try {
            await work();
        } catch (error) {
            setNotice(error.response?.data?.message || failure);
        } finally {
            setBusy(false);
        }
    }

    async function download(record, showPreview = false) {
        await perform(async () => {
            const doc = await robotriqCertificatePdf(record);
            if (showPreview) setPreview(URL.createObjectURL(doc.output('blob')));
            else doc.save(`Robotriq_Certificate_${(record.studentName || record.uid).replace(/[^\p{L}\p{N}_-]+/gu, '_')}.pdf`);
        }, 'Could not generate the certificate PDF.');
    }

    function save(event) {
        event.preventDefault();
        perform(async () => {
            const { data } = await axios.post(endpoint, draft);
            setHistory(current => [data, ...(current || [])]);
            setDraft(blank());
            setNotice('Certificate saved.');
        }, 'Could not save the certificate.');
    }

    function importHistory(event) {
        event.preventDefault();
        const file = upload.current?.files[0];
        if (!file) return;
        if (file.size > 2_000_000) {
            setNotice('Choose a history file smaller than 2 MB.');
            return;
        }
        perform(async () => {
            const records = JSON.parse(await file.text());
            const { data: result } = await axios.post(`${endpoint}/import-history`, { records });
            setNotice(`Imported ${result.imported}. Already present: ${result.alreadyPresent}.`);
            upload.current.value = '';
            try {
                const { data } = await axios.get(endpoint);
                setHistory(data);
                setFailed(false);
            } catch {
                setNotice(`Imported ${result.imported}. Reload to refresh the history.`);
            }
        }, 'Could not import the legacy history. Check that the file is valid JSON.');
    }

    const query = search.trim().toLowerCase();
    const visible = history?.filter(row => [row.studentName, row.uid, row.courseName]
        .some(value => value.toLowerCase().includes(query)));

    return <section className="grid gap-4">
        <form className="rounded border bg-white p-4" onSubmit={save}>
            <fieldset className="grid gap-3 sm:grid-cols-2" disabled={busy || failed}>
                <legend className="font-semibold">Issue a certificate</legend>
                {fields.map(([field, label, limit, required]) => <label key={field} className="grid gap-1">{label}
                    <input className={control} value={draft[field]} maxLength={limit} required={required}
                        onChange={event => setDraft({ ...draft, [field]: event.target.value })} />
                </label>)}
                <label className="grid gap-1">Issue date
                    <input className={control} type="date" required value={draft.date}
                        onChange={event => setDraft({ ...draft, date: event.target.value })} />
                </label>
                <div className="flex gap-2">
                    <button className={primary} disabled={!history}>Save certificate</button>
                    <button className={control} type="button" onClick={() => download(draft, true)}>Preview PDF</button>
                </div>
            </fieldset>
        </form>
        {preview && <section className="rounded border bg-white p-3">
            <button className={control} type="button" onClick={() => setPreview('')}>Close preview</button>
            <iframe className="mt-3 h-[32rem] w-full" src={preview} title="Robotriq certificate PDF preview" />
        </section>}
        {!delegated && <form className="flex flex-wrap items-end gap-3 rounded border bg-white p-4" onSubmit={importHistory}>
            <label className="grid gap-1">Legacy browser history JSON
                <input type="file" ref={upload} accept=".json,application/json" disabled={busy} required />
            </label>
            <button className={control} disabled={busy}>Import history</button>
        </form>}
        {notice && <p role="status">{notice}</p>}
        {!history && !failed && <p role="status">Loading certificate history…</p>}
        {history && <label className="grid max-w-sm gap-1">Search certificates
            <input className={control} value={search} onChange={event => setSearch(event.target.value)} />
        </label>}
        {visible?.length > 0 && <RobotriqPagedTable rows={visible}>{pageRows =>
<table className="w-full text-left text-sm">
                <thead><tr>{['UID', 'Student', 'Course', 'Issue date', 'Actions'].map(label =>
                    <th key={label} className="p-3">{label}</th>)}</tr></thead>
                <tbody>{pageRows.map(row => <tr key={row._id} className="border-t">
                    {[row.uid, row.studentName, row.courseName, row.date].map((value, index) => <td key={index} className="p-3">{value}</td>)}
                    <td className="space-x-2 whitespace-nowrap p-3">
                        <button type="button" disabled={busy} onClick={() => download(row, true)}>Preview</button>
                        <button type="button" disabled={busy} onClick={() => download(row)}>Download PDF</button>
                        {!delegated && <button type="button" disabled={busy} onClick={() => {
                            if (window.confirm(`Delete certificate ${row.uid}?`)) perform(async () => {
                                await axios.delete(`${endpoint}/${row._id}`);
                                setHistory(current => current.filter(entry => entry._id !== row._id));
                                setNotice('Certificate deleted.');
                            }, 'Could not delete the certificate.');
                        }}>Delete</button>}
                    </td>
                </tr>)}</tbody>
            </table>
}</RobotriqPagedTable>}
        {visible?.length === 0 && <p>No matching certificates.</p>}
    </section>;
}
