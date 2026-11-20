import { useState, useEffect } from 'react';
import axios from 'axios';
import { IndianRupee, TrendingUp, TrendingDown, Package, CreditCard, Banknote, ShoppingCart } from 'lucide-react';

export default function FinanceDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/finance/dashboard', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Error fetching finance stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-gray-500">Loading Dashboard...</div>;
    if (!stats) return <div className="p-8 text-red-500">Failed to load dashboard.</div>;

    const { totalIncome, totalExpenses, netProfit, metrics } = stats;
    const isProfit = netProfit >= 0;

    return (
        <div className="p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Financial Overview</h2>

            {/* Top Cards: Income, Expense, Profit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                    <div className="bg-green-100 p-4 rounded-xl text-green-600 mr-4">
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Income</p>
                        <h3 className="text-2xl font-black text-gray-900">₹{totalIncome.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                    <div className="bg-red-100 p-4 rounded-xl text-red-600 mr-4">
                        <TrendingDown size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                        <h3 className="text-2xl font-black text-gray-900">₹{totalExpenses.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                    <div className={`p-4 rounded-xl mr-4 ${isProfit ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        <IndianRupee size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Net Profit</p>
                        <h3 className={`text-2xl font-black ${isProfit ? 'text-blue-700' : 'text-orange-600'}`}>
                            ₹{Math.abs(netProfit).toLocaleString()}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                
                {/* Income Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Income Breakdown</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center text-gray-600">
                                <Package size={18} className="mr-2 text-indigo-500" />
                                <span>Sales Revenue (Products Sold: <b className="text-gray-900">{metrics.totalProductsSold}</b>)</span>
                            </div>
                            <span className="font-bold text-gray-900">₹{metrics.totalSalesRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center text-gray-600">
                                <Banknote size={18} className="mr-2 text-green-500" />
                                <span>Direct / Other Income</span>
                            </div>
                            <span className="font-bold text-gray-900">₹{metrics.directIncome.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span className="font-bold text-gray-700">Total Cash Received (Inward)</span>
                        <span className="font-bold text-green-700">₹{metrics.totalReceived.toLocaleString()}</span>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Expense Breakdown</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center text-gray-600">
                                <ShoppingCart size={18} className="mr-2 text-amber-500" />
                                <span>Cost of Purchases (Inventory)</span>
                            </div>
                            <span className="font-bold text-gray-900">₹{metrics.totalPurchasesCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center text-gray-600">
                                <CreditCard size={18} className="mr-2 text-red-500" />
                                <span>Direct / Operating Expenses</span>
                            </div>
                            <span className="font-bold text-gray-900">₹{metrics.directExpense.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                        <span className="font-bold text-gray-700">Total Cash Paid (Outward)</span>
                        <span className="font-bold text-red-700">₹{metrics.totalPaidOut.toLocaleString()}</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
