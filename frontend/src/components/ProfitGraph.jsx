import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    TrendingUp, TrendingDown, IndianRupee, Calendar, 
    BarChart3, ArrowUpRight, ArrowDownLeft, ShieldCheck, 
    PieChart, DollarSign, Layers
} from 'lucide-react';

export default function ProfitGraph() {
    const [invoices, setInvoices] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    useEffect(() => {
        fetchFinancialData();
    }, []);

    const getHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            const [invRes, purRes, payRes] = await Promise.all([
                axios.get('http://localhost:5000/api/invoices', getHeaders()),
                axios.get('http://localhost:5000/api/purchases', getHeaders()).catch(() => ({ data: [] })),
                axios.get('http://localhost:5000/api/payments', getHeaders()).catch(() => ({ data: [] }))
            ]);

            setInvoices(Array.isArray(invRes.data) ? invRes.data : []);
            setPurchases(Array.isArray(purRes.data) ? purRes.data : []);
            setPayments(Array.isArray(payRes.data) ? payRes.data : []);
        } catch (error) {
            console.error('Error fetching data for profit graph:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Monthly Metrics for selectedYear
    const monthlyData = MONTHS.map((monthName, mIndex) => {
        // Income from Invoices created in this month
        const monthInvoices = invoices.filter(inv => {
            const d = new Date(inv.invoiceDate || inv.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex;
        });
        const invTotal = monthInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);

        // Additional Direct Income
        const monthDirectIncome = payments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex && p.category === 'Direct Income';
        }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const totalIncome = invTotal + monthDirectIncome;

        // Expenses from Purchases
        const monthPurchases = purchases.filter(pur => {
            const d = new Date(pur.purchaseDate || pur.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex;
        });
        const purTotal = monthPurchases.reduce((sum, pur) => sum + (Number(pur.grandTotal) || 0), 0);

        // Additional Direct Expenses & Vendor Payouts
        const monthDirectExpenses = payments.filter(p => {
            const d = new Date(p.paymentDate || p.createdAt);
            return d.getFullYear() === selectedYear && d.getMonth() === mIndex && p.paymentType === 'Outward';
        }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const totalExpense = purTotal + monthDirectExpenses;
        const profit = totalIncome - totalExpense;
        const margin = totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : '0.0';

        return {
            month: monthName,
            income: totalIncome,
            expense: totalExpense,
            profit,
            margin: Number(margin),
            invoicesCount: monthInvoices.length
        };
    });

    // Totals across the year
    const totalYearIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalYearExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0);
    const totalYearProfit = totalYearIncome - totalYearExpense;
    const yearMargin = totalYearIncome > 0 ? ((totalYearProfit / totalYearIncome) * 100).toFixed(1) : '0.0';
    const isYearProfitable = totalYearProfit >= 0;

    // Chart Dimensions and Scaling
    const maxVal = Math.max(
        ...monthlyData.map(m => Math.max(m.income, m.expense)),
        10000
    );

    // SVG Chart Constants
    const svgWidth = 800;
    const svgHeight = 280;
    const padX = 40;
    const padY = 30;
    const chartW = svgWidth - (padX * 2);
    const chartH = svgHeight - (padY * 2);

    const getBarY = (val) => chartH - (val / maxVal) * chartH + padY;
    const getBarHeight = (val) => (val / maxVal) * chartH;

    return (
        <div className="space-y-6 text-slate-800">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Gross Revenue ({selectedYear})</div>
                        <div className="text-2xl font-black text-emerald-950 mt-1">₹{totalYearIncome.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Total Billed & Direct Inflows</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                        <TrendingUp size={22} />
                    </div>
                </div>

                <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Expenses ({selectedYear})</div>
                        <div className="text-2xl font-black text-rose-950 mt-1">₹{totalYearExpense.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-rose-600 font-medium mt-0.5">Purchases & Outward Costs</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
                        <TrendingDown size={22} />
                    </div>
                </div>

                <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Net Profit ({selectedYear})</div>
                        <div className={`text-2xl font-black mt-1 ${isYearProfitable ? 'text-blue-950' : 'text-rose-700'}`}>
                            {isYearProfitable ? '+' : '-'}₹{Math.abs(totalYearProfit).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                            {isYearProfitable ? 'Healthy Operating Margin' : 'Operating Deficit'}
                        </div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
                        <IndianRupee size={22} />
                    </div>
                </div>

                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Profit Margin</div>
                        <div className="text-2xl font-black text-amber-950 mt-1">{yearMargin}%</div>
                        <div className="text-[11px] text-amber-700 font-medium mt-0.5">Net Retention Ratio</div>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                        <PieChart size={22} />
                    </div>
                </div>
            </div>

            {/* Visual Interactive Graph Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <BarChart3 size={20} className="text-blue-600" />
                            <span>Monthly Profit & Loss Trend</span>
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                            Compare incoming revenue vs operating expenses and track net profitability month-by-month
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Legend */}
                        <div className="flex items-center gap-3 text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span className="text-slate-600">Revenue</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                                <span className="text-slate-600">Expenses</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                                <span className="text-slate-600">Net Profit</span>
                            </div>
                        </div>

                        {/* Year Selector */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                            {[2026, 2025].map(yr => (
                                <button
                                    key={yr}
                                    onClick={() => setSelectedYear(yr)}
                                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                        selectedYear === yr ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {yr}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SVG Multi-Bar & Line Chart */}
                <div className="relative w-full overflow-x-auto py-2">
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-72 select-none">
                        {/* Horizontal Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                            const y = padY + chartH * (1 - pct);
                            const val = Math.round(maxVal * pct);
                            return (
                                <g key={idx}>
                                    <line 
                                        x1={padX} 
                                        y1={y} 
                                        x2={svgWidth - padX} 
                                        y2={y} 
                                        stroke="#f1f5f9" 
                                        strokeWidth="1" 
                                        strokeDasharray={pct === 0 ? "none" : "4 4"}
                                    />
                                    <text 
                                        x={padX - 8} 
                                        y={y + 3} 
                                        fontSize="9" 
                                        textAnchor="end" 
                                        fill="#94a3b8" 
                                        fontWeight="bold"
                                    >
                                        ₹{val >= 100000 ? `${(val / 100000).toFixed(1)}L` : (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Monthly Bars */}
                        {monthlyData.map((d, i) => {
                            const colW = chartW / 12;
                            const groupX = padX + (i * colW) + (colW / 2);
                            const barW = Math.max(colW * 0.32, 10);

                            const incH = getBarHeight(d.income);
                            const incY = getBarY(d.income);

                            const expH = getBarHeight(d.expense);
                            const expY = getBarY(d.expense);

                            const isHovered = hoveredMonthIndex === i;

                            return (
                                <g 
                                    key={i} 
                                    className="cursor-pointer transition-opacity"
                                    onMouseEnter={() => setHoveredMonthIndex(i)}
                                    onMouseLeave={() => setHoveredMonthIndex(null)}
                                >
                                    {/* Hover Column Highlight Background */}
                                    {isHovered && (
                                        <rect 
                                            x={padX + (i * colW)} 
                                            y={padY} 
                                            width={colW} 
                                            height={chartH} 
                                            fill="#f8fafc" 
                                            rx="8"
                                        />
                                    )}

                                    {/* Income Bar (Green) */}
                                    <rect 
                                        x={groupX - barW - 1} 
                                        y={incY} 
                                        width={barW} 
                                        height={Math.max(incH, 2)} 
                                        rx="3" 
                                        fill={isHovered ? "#059669" : "#10b981"} 
                                    />

                                    {/* Expense Bar (Rose) */}
                                    <rect 
                                        x={groupX + 1} 
                                        y={expY} 
                                        width={barW} 
                                        height={Math.max(expH, 2)} 
                                        rx="3" 
                                        fill={isHovered ? "#e11d48" : "#f43f5e"} 
                                    />

                                    {/* Month Label */}
                                    <text 
                                        x={groupX} 
                                        y={svgHeight - 8} 
                                        fontSize="11" 
                                        textAnchor="middle" 
                                        fill={isHovered ? "#0f172a" : "#64748b"} 
                                        fontWeight={isHovered ? "bold" : "600"}
                                    >
                                        {d.month}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Trend Line for Net Profit */}
                        <path 
                            d={monthlyData.map((d, i) => {
                                const colW = chartW / 12;
                                const x = padX + (i * colW) + (colW / 2);
                                const normalizedProfit = Math.max(d.profit, 0);
                                const y = getBarY(normalizedProfit);
                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />

                        {/* Line Nodes */}
                        {monthlyData.map((d, i) => {
                            const colW = chartW / 12;
                            const x = padX + (i * colW) + (colW / 2);
                            const normalizedProfit = Math.max(d.profit, 0);
                            const y = getBarY(normalizedProfit);
                            const isHovered = hoveredMonthIndex === i;

                            return (
                                <circle 
                                    key={i} 
                                    cx={x} 
                                    cy={y} 
                                    r={isHovered ? 5 : 3.5} 
                                    fill={d.profit >= 0 ? "#2563eb" : "#f43f5e"} 
                                    stroke="#ffffff" 
                                    strokeWidth="2" 
                                />
                            );
                        })}
                    </svg>

                    {/* Active Month Tooltip Popup */}
                    {hoveredMonthIndex !== null && (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl flex items-center justify-between text-xs max-w-sm mx-auto animate-fade-in">
                            <span className="font-black text-amber-400 uppercase tracking-wide">
                                {monthlyData[hoveredMonthIndex].month} {selectedYear}
                            </span>
                            <div className="flex items-center gap-3">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Income</span>
                                    <span className="text-emerald-400 font-bold font-mono">₹{monthlyData[hoveredMonthIndex].income.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Expense</span>
                                    <span className="text-rose-400 font-bold font-mono">₹{monthlyData[hoveredMonthIndex].expense.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Profit</span>
                                    <span className={`font-bold font-mono ${monthlyData[hoveredMonthIndex].profit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                                        ₹{monthlyData[hoveredMonthIndex].profit.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Monthly Financial Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Full Financial Breakdown ({selectedYear})
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">12 Months Summary</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="py-3 px-4">Month</th>
                                <th className="py-3 px-4">Invoices Billed</th>
                                <th className="py-3 px-4">Total Revenue</th>
                                <th className="py-3 px-4">Total Expenses</th>
                                <th className="py-3 px-4">Net Profit / Loss</th>
                                <th className="py-3 px-4">Margin %</th>
                                <th className="py-3 px-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {monthlyData.map((m, idx) => {
                                const isProfitable = m.profit >= 0;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-900">{m.month} {selectedYear}</td>
                                        <td className="py-3 px-4 text-slate-600 font-mono">{m.invoicesCount} Invoices</td>
                                        <td className="py-3 px-4 font-bold text-emerald-700 font-mono">
                                            ₹{m.income.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-rose-700 font-mono">
                                            ₹{m.expense.toLocaleString('en-IN')}
                                        </td>
                                        <td className={`py-3 px-4 font-black font-mono text-sm ${
                                            isProfitable ? 'text-blue-700' : 'text-rose-600'
                                        }`}>
                                            {isProfitable ? '+' : ''}₹{m.profit.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                                            {m.margin}%
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                isProfitable 
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                            }`}>
                                                {isProfitable ? 'PROFIT' : 'LOSS'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
