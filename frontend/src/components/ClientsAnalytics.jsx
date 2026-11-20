import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users, Search, DollarSign, TrendingUp, AlertTriangle, 
    CheckCircle, Clock, ChevronDown, ChevronUp, FileText, 
    Building2, Phone, Mail, Award, ArrowUpRight
} from 'lucide-react';

export default function ClientsAnalytics() {
    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

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

        const totalPaid = custInvoices.length > 0
            ? custInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0)
            : (Number(cust.paidAmount) || 0);

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

    // Top 5 Clients by Revenue for Visual Bar Chart
    const top5Clients = [...clientStats]
        .sort((a, b) => b.totalBilled - a.totalBilled)
        .slice(0, 5)
        .filter(c => c.totalBilled > 0);

    return (
        <div className="space-y-6 text-slate-800">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Client Billing</div>
                        <div className="text-2xl font-black text-slate-900 mt-1">₹{grandTotalBilled.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">{customers.length} Onboarded Clients</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <Users size={22} />
                    </div>
                </div>

                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Cash Collected</div>
                        <div className="text-2xl font-black text-emerald-950 mt-1">₹{grandTotalPaid.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Realized Customer Inflows</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                        <CheckCircle size={22} />
                    </div>
                </div>

                <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Outstanding Due / Pending</div>
                        <div className="text-2xl font-black text-rose-950 mt-1">₹{grandTotalDue.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-rose-600 font-medium mt-0.5">Active Receivables</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
                        <Clock size={22} />
                    </div>
                </div>

                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Collection Efficiency</div>
                        <div className="text-2xl font-black text-amber-950 mt-1">{overallCollectionRate}%</div>
                        <div className="text-[11px] text-amber-700 font-medium mt-0.5">Recovery Success Ratio</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                        <TrendingUp size={22} />
                    </div>
                </div>
            </div>

            {/* Top 5 Revenue Clients Progress Bars */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Award size={18} className="text-amber-500" />
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            Top 5 High-Value Revenue Clients
                        </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Business Share Contribution</span>
                </div>

                <div className="space-y-3.5">
                    {top5Clients.length === 0 ? (
                        <div className="text-xs text-slate-400 py-4 text-center">No billing records yet</div>
                    ) : (
                        top5Clients.map((client, idx) => {
                            const sharePct = grandTotalBilled > 0 
                                ? ((client.totalBilled / grandTotalBilled) * 100).toFixed(1) 
                                : 0;
                            return (
                                <div key={client.id} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                                                {idx + 1}
                                            </span>
                                            <span className="font-bold text-slate-900">{client.name}</span>
                                            {client.gst && (
                                                <span className="text-[10px] text-slate-400 font-mono">({client.gst})</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-slate-900">₹{client.totalBilled.toLocaleString('en-IN')}</span>
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                {sharePct}% Share
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(Number(sharePct), 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Action & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search client name, GST, phone..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                            onClick={() => setFilterCategory('ALL')}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                filterCategory === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            All Clients ({clientStats.length})
                        </button>
                        <button
                            onClick={() => setFilterCategory('DUE')}
                            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                                filterCategory === 'DUE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>Outstanding Due</span>
                            <span className="text-[10px] opacity-80">
                                ({clientStats.filter(c => c.balanceDue > 0).length})
                            </span>
                        </button>
                        <button
                            onClick={() => setFilterCategory('SETTLED')}
                            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                                filterCategory === 'SETTLED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <span>Fully Settled</span>
                            <span className="text-[10px] opacity-80">
                                ({clientStats.filter(c => c.balanceDue <= 0 && c.totalBilled > 0).length})
                            </span>
                        </button>
                    </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-500">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-blue-500"
                    >
                        <option value="BILLED_DESC">Highest Billed Amount</option>
                        <option value="DUE_DESC">Highest Pending Due</option>
                        <option value="INVOICES_DESC">Most Invoices</option>
                    </select>
                </div>
            </div>

            {/* Clients Performance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">Client Name & Details</th>
                                <th className="py-3 px-4 text-center">Invoices</th>
                                <th className="py-3 px-4">Total Billed</th>
                                <th className="py-3 px-4">Total Paid</th>
                                <th className="py-3 px-4">Outstanding Due</th>
                                <th className="py-3 px-4">Recovery Rate</th>
                                <th className="py-3 px-4 text-right">Account Health</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">Loading client analytics...</td>
                                </tr>
                            ) : filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                                        No client performance records match the criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map(c => {
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900">{c.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                                                    {c.gst && <span className="text-blue-600">GST: {c.gst}</span>}
                                                    {c.phone && <span>Ph: {c.phone}</span>}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold font-mono text-[10px]">
                                                    {c.invoicesCount} Invoices
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                                ₹{c.totalBilled.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                                                ₹{c.totalPaid.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-black text-rose-600 text-sm">
                                                ₹{c.balanceDue.toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full ${
                                                                c.collectionRate === 100 
                                                                    ? 'bg-emerald-500' 
                                                                    : (c.collectionRate > 50 ? 'bg-amber-500' : 'bg-rose-500')
                                                            }`}
                                                            style={{ width: `${c.collectionRate}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-mono font-bold text-[11px] text-slate-700">{c.collectionRate}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                {c.balanceDue === 0 ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        FULLY SETTLED
                                                    </span>
                                                ) : c.totalPaid > 0 ? (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                                        PARTIAL DUE
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                                        PAYMENT PENDING
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
