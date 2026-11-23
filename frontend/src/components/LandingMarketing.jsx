import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../pages/PublicPages.css';

const previews = {
    Sales: {
        metrics: [['Active pipeline', '₹42,80,000', '+18.4% this month'], ['Conversion', '34.2%', '14 won'], ['Follow-ups today', '8 due', '0 overdue']],
        rows: [
            ['NT', 'Nova Technologies Pvt Ltd', 'Callback scheduled · Proposal sent', 'Hot', '₹4,50,000'],
            ['VG', 'Vertex Global Logistics', 'Meeting confirmed · Negotiation', 'Warm', '₹2,80,000'],
            ['KR', 'Kinetix Retail Networks', 'Demo done · Contract in draft', 'Qualified', '₹1,95,000'],
        ],
    },
    Invoicing: {
        metrics: [['Invoiced this month', '₹4,55,000', '18 GST invoices'], ['Collected', '₹3,40,000', '75% of billed'], ['Outstanding', '₹1,15,000', '3 overdue']],
        rows: [
            ['KR', 'INV-118 · Kinetix Retail', 'GST 18% · due today', 'Due', '₹45,000'],
            ['NT', 'INV-117 · Nova Technologies', 'Part paid · ₹40,000 left', 'Overdue', '₹60,000'],
            ['VG', 'INV-115 · Vertex Logistics', 'Paid by NEFT', 'Paid', '₹82,600'],
        ],
    },
    HR: {
        metrics: [['Present today', '4 / 5', 'Shift 9:30 AM'], ['On leave', '1', 'Sick leave'], ['Pending approvals', '2', 'Leave and permission']],
        rows: [
            ['RK', 'Ravi Kumar · Sales', 'In 09:24 · Sales module only', 'Present', '9h 17m'],
            ['AM', 'Arun M · SEO', 'In 09:52', 'Late', '8h 58m'],
            ['KV', 'Karthik V · Web', 'Sick leave · 20–21 Nov', 'Leave', '—'],
        ],
    },
};

const modules = [
    ['Never miss a follow-up', 'Track every lead from new to won. Tag Hot, Warm or Cold. Callback reminders and overdue alerts keep deals from slipping.', '50 leads on trial'],
    ['Bill and get paid faster', 'Create GST invoices with HSN codes and automatic tax calculations. Record payments and the ledger updates itself.', '25 invoices on trial'],
    ['Each person sees only their work', 'Give a salesperson access to Sales while keeping Finance and Settings private. Manage check-ins and tasks in one place.', '5 employees on trial'],
    ['One calendar for the team', 'Keep client calls, meetings and deadlines together. Old events clear out after a year.', 'Included'],
];

const plans = [
    {
        name: 'Free Trial', badge: '30 days', description: 'Every core module. No card, no charge.', action: 'Start free trial',
        features: ['5 employees with module permissions', '50 leads with callback alerts', '25 GST invoices', 'Calendar', 'Full platform access'],
    },
    {
        name: 'Growth', badge: 'Most popular', description: 'For teams growing their pipeline and staff.', action: 'Choose Growth',
        features: ['25 employees', '500 leads & deals', '250 invoices & bills', 'Projects & milestones', 'Admin, CEO and Employee roles', 'WhatsApp & email support'],
    },
    {
        name: 'Enterprise', badge: 'Unlimited', description: 'Unlimited capacity and a custom setup.', action: 'Choose Enterprise',
        features: ['Unlimited employees, leads & invoices', 'Custom subdomain', 'Multi-branch', 'CEO dashboard & live feed', 'Dedicated account manager'],
    },
];

const questions = [
    ['What is included in the 30-day trial?', 'Full access to every core feature for 30 days. Add up to 5 employees, manage up to 50 active leads and create up to 25 GST invoices. No charges and no credit card.'],
    ['What happens when I reach the trial limits?', 'Your data stays safe. The workspace lets you know when you reach a trial limit, and you can upgrade to Growth or Enterprise.'],
    ['Can I set module permissions for employees on the trial?', 'Yes. When you add or edit an employee, choose which modules appear in their workspace.'],
    ['How does the 1-year calendar cleanup work?', 'A background job removes calendar events older than 365 days.'],
];

export default function LandingMarketing({ user, onLogout, billingCycle, onBillingCycleChange, getPlanPrice, onChoosePlan }) {
    const [preview, setPreview] = useState('Sales');
    const { metrics, rows } = previews[preview];
    const destination = { Admin: '/dashboard', CEO: '/ceo-dashboard' }[user?.role] || '/employee-dashboard';

    return (
        <div className="public-page marketing-page" id="top">
            <header className="marketing-header marketing-width">
                <a className="public-brand" href="#top"><span aria-hidden="true" /> Skite Prime</a>
                <nav className="marketing-nav" aria-label="Site">
                    <a href="#modules">Modules</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
                </nav>
                <div className="marketing-actions">
                    {user ? (
                        <><Link className="public-button" to={destination}>Open workspace</Link><button type="button" onClick={onLogout}>Sign out</button></>
                    ) : (
                        <><Link to="/login">Sign in</Link><button type="button" className="public-button" onClick={() => onChoosePlan()}>Start free trial</button></>
                    )}
                </div>
            </header>
            <main>
                <section className="marketing-hero marketing-width">
                    <p className="marketing-trial-note"><span className="public-chip public-accent">FREE</span> 30-day trial · no credit card</p>
                    <h1>The modern operating system <span>for high-velocity teams.</span></h1>
                    <p className="marketing-hero-description">Leads, GST invoicing, attendance with module-level permissions, and your calendar. One clean workspace for the whole team.</p>
                    <div className="marketing-actions">
                        <button type="button" className="public-button" onClick={() => onChoosePlan()}>Start 30-day free trial <span aria-hidden="true">→</span></button>
                        <a className="public-button public-button-light" href="#pricing">See pricing</a>
                    </div>
                    <ul className="public-mono marketing-limits">
                        <li>30 days full access</li><li>5 employees</li><li>50 leads</li><li>25 GST invoices</li>
                    </ul>
                </section>

                <section className="marketing-width" aria-labelledby="preview-title">
                    <div className="marketing-preview">
                        <div className="marketing-preview-bar">
                            <h2 id="preview-title">Try it · sample workspace</h2>
                            <div className="public-switch" role="group" aria-label="Preview module">
                                {Object.keys(previews).map(name => (
                                    <button key={name} type="button" aria-pressed={preview === name} onClick={() => setPreview(name)}>{name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="marketing-preview-content">
                            <dl className="marketing-metrics">
                                {metrics.map(([label, value, note]) => (
                                    <div key={label}><dt>{label}</dt><dd><strong>{value}</strong><small>{note}</small></dd></div>
                                ))}
                            </dl>
                            <ul className="marketing-preview-rows">
                                {rows.map(([initials, title, caption, status, value]) => (
                                    <li key={title}>
                                        <span className="marketing-avatar" aria-hidden="true">{initials}</span>
                                        <div className="marketing-row-name"><strong>{title}</strong><small>{caption}</small></div>
                                        <span className={['Hot', 'Overdue', 'Late'].includes(status) ? 'public-chip public-accent' : 'public-chip'}>{status}</span>
                                        <strong className="marketing-row-value">{value}</strong>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="marketing-section marketing-width" id="modules" aria-labelledby="modules-title">
                    <div className="marketing-section-heading">
                        <h2 id="modules-title">Built for real work. <span>Nothing extra.</span></h2>
                        <p>Every module solves a daily bottleneck, from missed follow-ups to late payments and attendance on paper.</p>
                    </div>
                    <div className="marketing-modules">
                        {modules.map(([title, description, quota]) => (
                            <article className="marketing-card" key={title}><h3>{title}</h3><p>{description}</p><span className="public-chip">{quota}</span></article>
                        ))}
                    </div>
                </section>

                <section className="marketing-section marketing-width" id="pricing" aria-labelledby="pricing-title">
                    <div className="marketing-section-heading">
                        <h2 id="pricing-title">Start free. <span>Upgrade when you grow.</span></h2>
                        <div className="public-switch" role="group" aria-label="Billing period">
                            <button type="button" aria-pressed={billingCycle === 'monthly'} onClick={() => onBillingCycleChange('monthly')}>Monthly</button>
                            <button type="button" aria-pressed={billingCycle === 'annual'} onClick={() => onBillingCycleChange('annual')}>Yearly · save 20%</button>
                        </div>
                    </div>
                    <div className="marketing-plans">
                        {plans.map(plan => (
                            <article className="marketing-card" key={plan.name}>
                                <div className="marketing-plan-header">
                                    <h3>{plan.name}</h3>
                                    <span className={plan.name === 'Growth' ? 'public-chip public-accent' : 'public-chip'}>{plan.badge}</span>
                                </div>
                                <p>{plan.description}</p>
                                <p className="marketing-price"><strong>₹{getPlanPrice(plan.name).toLocaleString('en-IN')}</strong>
                                    <span>{plan.name === 'Free Trial' ? '/ 30 days' : billingCycle === 'annual' ? '/ month, billed yearly' : '/ month'}</span>
                                </p>
                                <ul>{plan.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                                <button className={plan.name === 'Growth' ? 'public-button public-accent' : 'public-button'} type="button"
                                    onClick={() => onChoosePlan(plan.name)}>{plan.action}</button>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="marketing-section marketing-width marketing-faq" id="faq" aria-labelledby="faq-title">
                    <h2 id="faq-title">Questions, <span>answered.</span></h2>
                    <div>
                        {questions.map(([question, answer], index) => (
                            <details key={question} name="marketing-faq" open={index === 0}>
                                <summary>{question}</summary><p>{answer}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section className="marketing-section marketing-width" aria-labelledby="trial-title">
                    <div className="marketing-cta">
                        <h2 id="trial-title">Your team, in one place. <span>From today.</span></h2>
                        <div>
                            <button type="button" className="public-button public-accent" onClick={() => onChoosePlan()}>Start 30-day free trial <span aria-hidden="true">→</span></button>
                            <p>No credit card. Cancel any time.</p>
                        </div>
                    </div>
                </section>
            </main>
            <footer className="marketing-footer marketing-width">
                <span className="public-brand"><span aria-hidden="true" /> Skite Prime by Skite Digital · © 2026</span>
                <nav aria-label="Footer"><a href="#modules">Modules</a><a href="#pricing">Pricing</a><Link to="/login">Sign in</Link></nav>
            </footer>
        </div>
    );
}
