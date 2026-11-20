import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../components/WorkspaceLayout.css';
import './Billing.css';

const billingApi = 'http://localhost:5000/api/billing';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateName = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

function loadRazorpay() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = resolve;
        script.onerror = () => { script.remove(); reject(new Error('Razorpay could not be loaded.')); };
        document.body.appendChild(script);
    });
}

export default function Billing() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [summary, setSummary] = useState(null);
    const [overviewError, setOverviewError] = useState('');
    const [checkoutError, setCheckoutError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        axios.get(`${billingApi}/overview`, { headers: authHeaders(), signal: controller.signal })
            .then(({ data }) => setSummary(data))
            .catch(error => { if (!controller.signal.aborted) setOverviewError(error.response?.data?.message || 'Billing details could not be loaded.'); });
        return () => controller.abort();
    }, []);

    const handlePayment = async () => {
        if (loading) return;
        setLoading(true);
        setCheckoutError('');
        try {
            await loadRazorpay();
            const headers = authHeaders();
            const { data } = await axios.post(`${billingApi}/create-order`, {}, { headers });
            if (!data.keyId || !data.orderId) throw new Error('Checkout is currently unavailable.');
            const payment = new window.Razorpay({
                key: data.keyId, amount: data.amount, currency: data.currency, order_id: data.orderId,
                name: 'Skite Prime CRM', description: 'Monthly Workspace Subscription',
                theme: { color: '#ff6a3d' },
                modal: { ondismiss: () => setLoading(false) },
                handler: async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
                    try {
                        await axios.post(`${billingApi}/verify-payment`, { razorpay_order_id, razorpay_payment_id, razorpay_signature }, { headers });
                        window.location.href = '/dashboard';
                    } catch {
                        setCheckoutError('Payment could not be verified. Check your payment status before retrying.');
                    } finally {
                        setLoading(false);
                    }
                },
            });
            payment.open();
        } catch (error) {
            setCheckoutError(error.response?.data?.message || error.message || 'Could not initiate payment.');
            setLoading(false);
        }
    };

    const expiry = summary?.validUntil && Number.isFinite(Date.parse(summary.validUntil)) ? dateName.format(new Date(summary.validUntil)) : null;
    const livePlan = summary?.status === 'active';
    const trial = summary?.status === 'trial';
    const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AD';
    const signOut = () => { logout(); navigate('/'); };

    return (
        <div className="skite-workspace billing-page" data-workspace-theme={user?.theme}>
            <header className="billing-toolbar">
                <Link to="/settings"><ArrowLeft size={15} /> Settings</Link>
                <details className="skite-workspace-tools">
                    <summary className="skite-workspace-avatar" aria-label="Billing account menu">{initials}</summary>
                    <div className="skite-workspace-menu"><strong>{user?.name}</strong><button type="button" onClick={signOut}>Sign out of workspace</button></div>
                </details>
            </header>
            <main className="billing-content">
                <header className="billing-heading">
                    <div><p>Plan &amp; billing</p><h1>{summary ? (trial ? 'Free trial' : livePlan ? summary.plan || 'Monthly plan' : 'Workspace access expired') : 'Plan & billing'}
                        {expiry && <span> · {livePlan ? 'access until' : trial ? 'ends' : 'ended'} {expiry}</span>}</h1></div>
                    <span className="billing-cycle">Monthly</span>
                </header>
                {overviewError && <p className="billing-alert" role="alert">{overviewError}</p>}
                {!summary && !overviewError && <p role="status">Loading billing details…</p>}
                {summary && <>
                    <section className="billing-usage" aria-label="Workspace usage">
                        {summary.usage.map(item => (
                            <article key={item.label}>
                                <h2>{item.label}</h2>
                                <strong>{item.used}{item.limit > 0 && <small> / {item.limit.toLocaleString('en-IN')}</small>}</strong>
                                {item.limit > 0 && <progress value={Math.min(item.used, item.limit)} max={item.limit} aria-label={`${item.label} quota usage`} />}
                            </article>
                        ))}
                    </section>
                    <section className="billing-plans" aria-label="Billing options">
                        <article>
                            <h2>Trial</h2><strong>{money.format(0)}</strong>
                            <ul><li>Employee records</li><li>Lead management</li><li>GST invoicing</li><li>Core workspace modules</li></ul>
                            <p className="billing-plan-status">{trial ? `Trial active${expiry ? ' until ' + expiry : ''}` : 'Trial unavailable'}</p>
                        </article>
                        <article className="billing-primary-plan">
                            <header><h2>Monthly workspace</h2>{livePlan && <span>Active</span>}</header>
                            <strong>{money.format(summary.monthlyPrice)}<small> / month</small></strong>
                            <ul><li>30 days of workspace access</li><li>Lead management</li><li>Attendance &amp; HR</li><li>Finance &amp; invoicing</li></ul>
                            <button type="button" onClick={handlePayment} disabled={loading || !summary.checkoutAvailable}>
                                {loading ? 'Opening checkout…' : !summary.checkoutAvailable ? 'Checkout unavailable' : livePlan ? 'Extend access' : 'Subscribe'}
                            </button>
                        </article>
                        <article>
                            <h2>Billing details</h2><strong>Razorpay</strong>
                            <ul><li>Monthly payment</li><li>Workspace access: {summary.status === 'expired' ? 'expired' : 'active'}</li>
                                {expiry && <li>Access {summary.status === 'expired' ? 'ended' : 'until'} {expiry}</li>}</ul>
                            {summary.status !== 'expired' ? <Link to="/dashboard">Return to workspace</Link> : <button type="button" onClick={signOut}>Sign out</button>}
                        </article>
                    </section>
                    {checkoutError && <p className="billing-alert" role="alert">{checkoutError}</p>}
                </>}
            </main>
        </div>
    );
}
