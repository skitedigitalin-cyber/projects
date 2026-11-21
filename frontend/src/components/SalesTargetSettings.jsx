import { useEffect, useState } from 'react';
import axios from 'axios';
import './SalesTargetSettings.css';

const monthKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
const endpoint = 'http://localhost:5000/api/leads/sales-target';
const dashboardEndpoint = 'http://localhost:5000/api/leads/dashboard-stats';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const monthName = new Intl.DateTimeFormat('en-IN', { month: 'long', timeZone: 'UTC' });
const shortMonth = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const percentage = (collected, target) => collected != null && target > 0 ? Math.round(collected / target * 100) : null;

export default function SalesTargetSettings({ canManage }) {
    const [month, setMonth] = useState(() => monthKey.format(new Date()).slice(0, 7));
    const [amount, setAmount] = useState('');
    const [loadedMonth, setLoadedMonth] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [collections, setCollections] = useState(null);
    const [targets, setTargets] = useState({});
    const [historyStatus, setHistoryStatus] = useState('loading');

    useEffect(() => {
        if (!canManage) return;
        const controller = new AbortController();
        const options = { headers: headers(), signal: controller.signal };
        axios.get(dashboardEndpoint, options).then(async ({ data }) => {
            if (!Array.isArray(data.collections?.revenue)) throw new Error('Collections history unavailable');
            if (controller.signal.aborted) return;
            setCollections(data.collections.revenue);
            const responses = await Promise.allSettled(data.collections.revenue.map(({ month }) =>
                axios.get(endpoint, { ...options, params: { month } })
            ));
            if (controller.signal.aborted) return;
            setTargets(current => ({ ...Object.fromEntries(responses.flatMap(result => result.status === 'fulfilled'
                ? [[result.value.data.month, result.value.data.target]] : [])), ...current }));
            setHistoryStatus(responses.some(result => result.status === 'rejected') ? 'partial' : 'ready');
        }).catch(() => {
            if (!controller.signal.aborted) setHistoryStatus('error');
        });
        return () => controller.abort();
    }, [canManage]);

    useEffect(() => {
        if (!canManage || !month) return;
        const controller = new AbortController();
        setLoadedMonth(null);
        setAmount('');
        setError('');
        setStatus('');
        axios.get(endpoint, { params: { month }, headers: headers(), signal: controller.signal }).then(({ data }) => {
            setAmount(data.target == null ? '' : String(data.target));
            setTargets(current => ({ ...current, [month]: data.target }));
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
            const target = amount === '' ? null : Number(amount);
            await axios.put(endpoint, { month, target }, { headers: headers() });
            setTargets(current => ({ ...current, [month]: target }));
            setStatus(amount === '' ? 'Monthly target cleared.' : 'Monthly target saved.');
        } catch (error) {
            setError(error.response?.data?.message || 'Could not save the target.');
        } finally {
            setSaving(false);
        }
    };

    const selectedIndex = collections?.findIndex(row => row.month === month) ?? -1;
    const collected = collections?.[selectedIndex]?.collected;
    const target = targets[month];
    const progress = percentage(collected, target);
    const previous = selectedIndex > 0 ? collections[selectedIndex - 1] : null;
    const previousProgress = previous ? percentage(previous.collected, targets[previous.month]) : null;
    const change = progress != null && previousProgress != null ? progress - previousProgress : null;
    const remaining = collected != null && target > 0 ? Math.max(0, target - collected) : null;
    const today = monthKey.format(new Date());
    const selectedDate = /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? new Date(`${month}-01T00:00:00Z`) : null;
    const monthOptions = selectedDate ? [-1, 0, 1].map(offset => new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + offset, 1))) : [];
    const daysInMonth = selectedDate && new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 0)).getUTCDate();
    const daysLeft = month === today.slice(0, 7) ? daysInMonth - Number(today.slice(8)) + 1 : 0;

    return (
        <div className="sales-targets">
            {canManage && <section className="sales-target-progress" aria-labelledby="sales-target-progress-title">
                <header><h2 id="sales-target-progress-title">{selectedDate ? `${monthName.format(selectedDate)} progress` : 'Monthly progress'}</h2>
                    {daysLeft > 0 && <span>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>}</header>
                <div className="sales-target-amount">
                    <strong>{progress == null ? '—' : `${progress}%`}</strong>
                    <p>{collected != null ? `${money.format(collected)} collected${target > 0 ? ` of ${money.format(target)}` : ''}` : 'Collections unavailable for this month.'}</p>
                </div>
                {progress != null && <progress aria-label="Sales target progress" max={100} value={Math.min(100, Math.max(0, progress))} />}
                <dl>
                    <div><dt>Still to collect</dt><dd>{remaining == null ? '—' : money.format(remaining)}</dd></div>
                    <div><dt>Needed per day</dt><dd>{remaining == null || !daysLeft ? '—' : money.format(Math.ceil(remaining / daysLeft))}</dd></div>
                    <div><dt>vs last month</dt><dd>{change == null ? '—' : `${change > 0 ? '+' : ''}${change} pp`}</dd></div>
                </dl>
            </section>}

            <section className="sales-list-panel sales-target-panel" aria-labelledby="sales-target-title">
                <h2 id="sales-target-title">{canManage ? 'Set monthly target' : 'Sales targets'}</h2>
                <p>Measured against payments collected on invoices during the month.</p>
                {canManage ? <form onSubmit={save}>
                    {monthOptions.length > 0 && <fieldset><legend>Month</legend><div className="sales-target-months">{monthOptions.map(date => {
                        const value = date.toISOString().slice(0, 7);
                        return <button type="button" key={value} aria-pressed={value === month} disabled={saving || value < '2000-01' || value > '2099-12'} onClick={() => setMonth(value)}>{shortMonth.format(date)}</button>;
                    })}</div></fieldset>}
                    <details>
                        <summary>Choose another month</summary>
                        <label><span className="sr-only">Month</span><input type="month" name="month" min="2000-01" max="2099-12" value={month}
                            disabled={saving} onChange={event => setMonth(event.target.value)} /></label>
                    </details>
                    <label>Target amount (₹)<input type="number" name="target" min="1" step="1" placeholder="No target set"
                        disabled={!selectedDate || month !== loadedMonth || saving} value={amount} onChange={event => setAmount(event.target.value)} /></label>
                    <button type="submit" disabled={!selectedDate || month !== loadedMonth || saving}>{saving ? 'Saving…' : 'Save target'}</button>
                    {status && <p role="status">{status}</p>}
                    {error && <p role="alert">{error}</p>}
                </form> : <p>A workspace admin can set the monthly target.</p>}
            </section>

            {canManage && <section className="sales-list-panel sales-target-history" aria-labelledby="sales-target-history-title">
                <header><h2 id="sales-target-history-title">Last 6 months</h2><span>Collected vs target</span></header>
                <ul>{collections?.map(row => {
                    const monthTarget = targets[row.month];
                    const percent = percentage(row.collected, monthTarget);
                    return <li key={row.month} data-current={row.month === month} data-hit={percent >= 100}>
                        <span>{shortMonth.format(new Date(`${row.month}-01T00:00:00Z`))}</span>
                        <strong>{percent == null ? '—' : `${percent}%`}</strong>
                        <progress aria-label={`${row.month} progress`} max={100} value={Math.min(100, Math.max(0, percent ?? 0))} />
                        <small>{money.format(row.collected)}{monthTarget > 0 ? ` / ${money.format(monthTarget)}` : monthTarget === null ? ' · No target set' : ''}</small>
                    </li>;
                })}</ul>
                {historyStatus !== 'ready' && <p role="status">{historyStatus === 'loading' ? 'Loading history…' : 'Some target history is unavailable.'}</p>}
            </section>}
        </div>
    );
}
