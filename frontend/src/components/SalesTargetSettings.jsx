import { useEffect, useState } from 'react';
import axios from 'axios';
import './SalesLeadList.css';

const monthKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
const endpoint = 'http://localhost:5000/api/leads/sales-target';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function SalesTargetSettings({ canManage }) {
    const [month, setMonth] = useState(() => monthKey.format(new Date()).slice(0, 7));
    const [amount, setAmount] = useState('');
    const [loadedMonth, setLoadedMonth] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!canManage || !month) return;
        const controller = new AbortController();
        setLoadedMonth(null);
        setAmount('');
        setError('');
        setStatus('');
        axios.get(endpoint, { params: { month }, headers: headers(), signal: controller.signal }).then(({ data }) => {
            setAmount(data.target == null ? '' : String(data.target));
            setLoadedMonth(month);
        }).catch(error => {
            if (!controller.signal.aborted) setError(error.response?.data?.message || 'Could not load the target.');
        });
        return () => controller.abort();
    }, [month, canManage]);

    const save = async event => {
        event.preventDefault();
        if (!month || month !== loadedMonth || saving) return;
        setError('');
        setStatus('');
        setSaving(true);
        try {
            await axios.put(endpoint, { month, target: amount === '' ? null : Number(amount) }, { headers: headers() });
            setStatus(amount === '' ? 'Monthly target cleared.' : 'Monthly target saved.');
        } catch (error) {
            setError(error.response?.data?.message || 'Could not save the target.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="sales-list-panel sales-target-panel" aria-labelledby="sales-target-title">
            <h2 id="sales-target-title">Sales targets</h2>
            <p>Targets are measured against payments collected on invoices during the selected month.</p>
            {canManage ? <form onSubmit={save}>
                <label>Month<input type="month" required name="month" min="2000-01" max="2099-12" value={month}
                    disabled={saving} onChange={event => setMonth(event.target.value)} /></label>
                <label>Target amount (₹)<input type="number" name="target" min="1" step="1" placeholder="No target set"
                    disabled={month !== loadedMonth || saving} value={amount} onChange={event => setAmount(event.target.value)} /></label>
                <button type="submit" disabled={month !== loadedMonth || saving}>{saving ? 'Saving…' : 'Save target'}</button>
                {status && <p role="status">{status}</p>}
                {error && <p role="alert">{error}</p>}
            </form> : <p>A workspace admin can set the monthly target.</p>}
        </section>
    );
}
