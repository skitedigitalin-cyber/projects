import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PublicPages.css';

export default function Login() {
    const { login, user, loading } = useAuth();
    const [role, setRole] = useState('Admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (user) {
        const destination = { Admin: '/dashboard', CEO: '/ceo-dashboard' }[user.role] || '/employee-dashboard';
        return <Navigate to={destination} replace />;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (submitting || loading) return;
        setError('');
        setSubmitting(true);
        try {
            const result = await login(email, password, role);
            if (!result.success) setError(result.message || 'Sign-in failed.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="public-page login-page">
            <section className="login-brand-panel" aria-label="Skite Prime">
                <Link to="/" className="public-brand"><span aria-hidden="true" /> skite</Link>
                <p className="login-tagline">Leads, invoices and your team.<br /><span>One quiet place.</span></p>
                <ul className="public-mono login-modules">
                    <li>Sales &amp; leads</li><li>GST invoicing</li><li>Attendance &amp; HR</li>
                </ul>
            </section>

            <section className="login-form-panel" aria-labelledby="login-heading">
                <div className="login-form-content">
                    <h1 id="login-heading">Welcome back</h1>
                    <p>Sign in to your workspace.</p>
                    <div className="public-switch login-roles" role="group" aria-label="Account type">
                        {['Admin', 'Employee'].map(option => (
                            <button key={option} type="button" aria-pressed={role === option} disabled={submitting}
                                onClick={() => {
                                    if (role === option) return;
                                    setRole(option);
                                    setPassword('');
                                    setError('');
                                }}>
                                {option}
                            </button>
                        ))}
                    </div>
                    <form className="login-form" onSubmit={handleSubmit}>
                        {error && <p className="login-error" role="alert">{error}</p>}
                        <div>
                            <label htmlFor="login-email">Work email</label>
                            <input id="login-email" type="email" autoComplete="username" required
                                placeholder="name@company.com" value={email} onChange={event => setEmail(event.target.value)} />
                        </div>
                        <div>
                            <label htmlFor="login-password">Password</label>
                            <input id="login-password" type="password" autoComplete="current-password" required
                                placeholder="••••••••" value={password} onChange={event => setPassword(event.target.value)} />
                        </div>
                        <button className="public-button" type="submit" disabled={submitting || loading}>
                            {submitting ? 'Signing in…' : <>Sign in <span aria-hidden="true">→</span></>}
                        </button>
                    </form>
                    <p className="login-trial">New company? <Link className="public-text-link" to="/?trial=1">Start a 30-day trial</Link></p>
                </div>
            </section>
        </main>
    );
}
