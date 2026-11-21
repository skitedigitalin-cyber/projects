import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';
import { invoicePaymentRows, summarizeAccounts } from '../utils/accountSummary';
import './AccountsAnalysis.css';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const shareColors = ['#ff6a3d', '#fff', '#b5b5b5', '#8a8a8a', '#626262', '#3f3f3f'];

export default function ClientsAnalytics() {
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'DUE' | 'SETTLED'
    const [sortBy, setSortBy] = useState('BILLED_DESC'); // 'BILLED_DESC' | 'DUE_DESC' | 'INVOICES_DESC'

    useEffect(() => {
        fetchClientsData();
    }, []);

    const getHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchClientsData = async () => {
        try {
            setLoading(true);
            const [custRes, invRes] = await Promise.all([
                axios.get('http://localhost:5000/api/customers', getHeaders()),
                axios.get('http://localhost:5000/api/invoices', getHeaders())
            ]);

            setCustomers(Array.isArray(custRes.data) ? custRes.data : []);
            setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
        } catch (error) {
            console.error('Error fetching clients analytics:', error);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    // Calculate aggregated metrics per client by combining Customer data with real Invoices data
    const clientStats = customers.map(cust => {
        const custId = cust._id;
        const custInvoices = invoices.filter(inv => {
            const invCustId = inv.customerId?._id || inv.customerId;
            return invCustId === custId;
        });

        const totalBilled = custInvoices.length > 0 
            ? custInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0)
            : (Number(cust.totalBilled) || 0);

        let lastPayment = 0;
        const totalPaid = custInvoices.length > 0 ? custInvoices.reduce((sum, invoice) => {
            const recorded = invoicePaymentRows(invoice).reduce((total, row) => {
                const timestamp = new Date(row.date).getTime();
                if (Number.isFinite(timestamp)) lastPayment = Math.max(lastPayment, timestamp);
                return total + row.amount;
            }, 0);
            return sum + Math.max(Number(invoice.paidAmount) || 0, recorded);
        }, 0) : (Number(cust.paidAmount) || 0);

        const balanceDue = Math.max(totalBilled - totalPaid, 0);
        const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

        let status = 'SETTLED';
        if (balanceDue > 0 && totalPaid > 0) status = 'PARTIAL';
        else if (balanceDue > 0 && totalPaid === 0) status = 'PENDING';

        return {
            id: custId,
            name: cust.customerName || cust.companyName || 'Valued Client',
            company: cust.companyName || '',
            gst: cust.gstNumber || '',
            phone: cust.phone || '',
            email: cust.email || '',
            invoicesCount: custInvoices.length,
            totalBilled,
            totalPaid,
            lastPayment,
            balanceDue,
            collectionRate,
            status
        };
    });

    // High Level Aggregations
    const grandTotalBilled = clientStats.reduce((sum, c) => sum + c.totalBilled, 0);
    const grandTotalPaid = clientStats.reduce((sum, c) => sum + c.totalPaid, 0);
    const grandTotalDue = clientStats.reduce((sum, c) => sum + c.balanceDue, 0);
    const overallCollectionRate = grandTotalBilled > 0 
        ? Math.round((grandTotalPaid / grandTotalBilled) * 100) 
        : 100;

    // Filter and Sort Clients
    const filteredClients = clientStats.filter(c => {
        const matchesSearch = !searchTerm ||
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.gst.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm);

        if (filterCategory === 'DUE' && c.balanceDue <= 0) return false;
        if (filterCategory === 'SETTLED' && c.balanceDue > 0) return false;

        return matchesSearch;
    });

    filteredClients.sort((a, b) => {
        if (sortBy === 'BILLED_DESC') return b.totalBilled - a.totalBilled;
        if (sortBy === 'DUE_DESC') return b.balanceDue - a.balanceDue;
        if (sortBy === 'INVOICES_DESC') return b.invoicesCount - a.invoicesCount;
        return 0;
    });

    const fiscal = summarizeAccounts(invoices, []);
    const totalCollected = fiscal.clients.reduce((total, client) => total + client.amount, 0);
    const topFive = fiscal.clients.slice(0, 5);
    const topTotal = topFive.reduce((total, client) => total + client.amount, 0);
    const share = topFive.map(({ id, name, amount }, index) => ({ id, name, amount, color: shareColors[index] }));
    if (totalCollected > topTotal) share.push({ id: 'other', name: 'Other clients', amount: totalCollected - topTotal, color: shareColors[5] });
    let cumulative = 0;
    const slices = share.map(({ amount, color }) => {
        const start = cumulative;
        cumulative += amount / totalCollected * 100;
        return `${color} ${start}% ${cumulative}%`;
    });

    return (
        <div className="accounts-analysis">
            <header className="accounts-analysis-heading">
                <h2>{clientStats.length} {clientStats.length === 1 ? 'client' : 'clients'}
                    {totalCollected > 0 && <span> · top {topFive.length} bring {Math.round(topTotal / totalCollected * 100)}%</span>}
                </h2>
            </header>
            {failed ? <p role="alert">Client analytics are unavailable.</p> : loading ? <p role="status">Loading client analytics…</p> : <>
                <div className="accounts-client-overview">
                    <section className="accounts-analysis-panel">
                        <header><h3>Top 5 clients by revenue</h3><span>Collected this FY</span></header>
                        <ol className="accounts-top-clients">
                            {topFive.map(({ id, name, amount }, index) => {
                                const client = clientStats.find(row => row.id === id);
                                return <li key={id}><small>{String(index + 1).padStart(2, '0')}</small>
                                    <span><strong>{name}</strong><small>{client ? `${client.invoicesCount} invoices · ` : ''}{Math.round(amount / totalCollected * 100)}% of revenue</small></span>
                                    <strong>{money.format(amount)}</strong>
                                </li>;
                            })}
                        </ol>
                        {!topFive.length && <p>No invoice payments recorded this financial year.</p>}
                    </section>
                    <section className="accounts-analysis-panel accounts-share">
                        <header><h3>Business share</h3></header>
                        <div className="accounts-share-ring" style={slices.length ? { background: `conic-gradient(${slices.join(', ')})` } : undefined}>
                            <div><strong>{money.format(totalCollected)}</strong><small>Collected this FY</small></div>
                        </div>
                        <ul>{share.map(({ id, name, amount, color }) => (
                            <li key={id}><i style={{ background: color }} />{name} · {Math.round(amount / totalCollected * 100)}%</li>
                        ))}</ul>
                    </section>
                </div>

                <section className="accounts-analysis-panel">
                    <header><h3>All clients</h3><span>{money.format(grandTotalDue)} due · {overallCollectionRate}% collected</span></header>
                    <div className="accounts-analysis-filters">
                        <label><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search clients" placeholder="Search clients" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></label>
                        <div className="accounts-analysis-pills" role="group" aria-label="Client balance">
                            {[['ALL','All'], ['DUE','Due'], ['SETTLED','Settled']].map(([value,label]) =>
                                <button key={value} type="button" aria-pressed={filterCategory === value} onClick={() => setFilterCategory(value)}>{label}</button>
                            )}
                        </div>
                        <select aria-label="Sort clients" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                            <option value="BILLED_DESC">Highest billed</option><option value="DUE_DESC">Highest due</option><option value="INVOICES_DESC">Most invoices</option>
                        </select>
                    </div>
                    <div className="accounts-analysis-table">
                        <table>
                            <thead><tr>{['Client', 'Invoices', 'Billed', 'Collected', 'Due', 'Recovery', 'Status', 'Last payment'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
                            <tbody>{filteredClients.map(client => <tr key={client.id}>
                                <th scope="row">{client.name}<small>{[client.company !== client.name && client.company, client.gst && `GST ${client.gst}`, client.phone].filter(Boolean).join(' · ')}</small></th>
                                <td>{client.invoicesCount}</td><td>{money.format(client.totalBilled)}</td><td>{money.format(client.totalPaid)}</td>
                                <td data-negative={client.balanceDue > 0}>{money.format(client.balanceDue)}</td><td>{client.collectionRate}%</td>
                                <td>{client.status === 'SETTLED' ? 'Settled' : client.status === 'PARTIAL' ? 'Partially paid' : 'Pending'}</td>
                                <td>{client.lastPayment ? date.format(client.lastPayment) : '—'}</td>
                            </tr>)}</tbody>
                        </table>
                        {!filteredClients.length && <p>No clients match the current filters.</p>}
                    </div>
                </section>
            </>}
        </div>
    );
}
