import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import DashboardNumbers, { compactRupees } from '../components/DashboardNumbers';
import DashboardActivity from '../components/DashboardActivity';
import DashboardSalesSnapshot from '../components/DashboardSalesSnapshot';
import { Plus } from 'lucide-react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/leads/dashboard-stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const actionItems = stats?.actionItemsCount ?? 0;

    const now = new Date();
    const dateParts = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).formatToParts(now);
    const datePart = type => dateParts.find(part => part.type === type)?.value;
    const dateLabel = `${datePart('weekday')} · ${datePart('day')} ${datePart('month')}`;
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
    const overdue = stats?.collections?.overdueAmount ?? 0;
    const alerts = `${actionItems} ${actionItems === 1 ? 'thing needs' : 'things need'} you today`;
    const summary = stats ? `${alerts}${overdue > 0 ? `, and ${compactRupees(overdue)} is overdue` : ''}.` : 'Here’s your workspace overview.';

    return (
        <Layout workspace pendingCount={actionItems}>
            <div className="skite-dashboard">
                <section className="dashboard-intro">
                    <div>
                        <time className="dashboard-intro-date" dateTime={now.toISOString()}>{dateLabel}</time>
                        <h1>{greeting} <span>{summary}</span></h1>
                    </div>
                    <div className="dashboard-intro-actions">
                        <div className="dashboard-periods" role="group" aria-label="Collections period">
                            {['today', 'week', 'month'].map(value => (
                                <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>{value}</button>
                            ))}
                        </div>
                        <button type="button" onClick={() => navigate('/sales/lead/add')}><Plus size={16} /> New lead</button>
                    </div>
                </section>

                <DashboardNumbers stats={stats} loading={loading} period={period} />
                <DashboardActivity stats={stats} loading={loading} />

                <DashboardSalesSnapshot stats={stats} loading={loading} now={now} />
            </div>
        </Layout>
    );
}
