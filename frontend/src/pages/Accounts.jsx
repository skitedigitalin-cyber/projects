import { useState } from 'react';
import Layout from '../components/Layout';
import { 
    Banknote, CreditCard, TrendingUp, Users, ArrowLeft, 
    BarChart3, PieChart, Landmark
} from 'lucide-react';
import InvoicePayment from '../components/InvoicePayment';
import IncomeExpense from '../components/IncomeExpense';
import ProfitGraph from '../components/ProfitGraph';
import ClientsAnalytics from '../components/ClientsAnalytics';

export default function Accounts() {
    // Tabs: 'invoice-payments' | 'income-expense' | 'profit-graph' | 'clients-analytics'
    const [activeTab, setActiveTab] = useState('invoice-payments');

    const renderContent = () => {
        switch (activeTab) {
            case 'invoice-payments':
                return <InvoicePayment />;
            case 'income-expense':
                return <IncomeExpense />;
            case 'profit-graph':
                return <ProfitGraph />;
            case 'clients-analytics':
                return <ClientsAnalytics />;
            default:
                return null;
        }
    };

    return (
        <Layout noPadding={true}>
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: none; }
                    }
                    .animate-fade-up {
                        animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .delay-100 { animation-delay: 80ms; }
                    .delay-200 { animation-delay: 160ms; }
                    
                    /* Custom Scrollbar for horizontal tabs */
                    .custom-scrollbar::-webkit-scrollbar {
                        height: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                `
            }} />
            <div className="min-h-full flex flex-col bg-slate-50 p-6 space-y-5">
                
                {/* Header (Dark Mode Highlight Card) */}
                <div className="shrink-0 animate-fade-up group p-2 bg-slate-100/50 rounded-[2rem] border border-slate-200">
                    <div className="bg-slate-900 text-white rounded-[1.5rem] p-7 shadow-sm group-hover:shadow-lg transition-all flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl transform group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="relative z-10">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                                <span>Accounts & Financial Intelligence</span>
                            </h1>
                            <p className="text-slate-400 mt-1.5 font-medium text-sm">
                                Invoice cash collections, income & expenses, profit trends, and client revenue analytics.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sub Navigation Tabs */}
                <div className="shrink-0 animate-fade-up delay-100 flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                    {[
                        { id: 'invoice-payments', label: 'Invoice Payments', icon: Banknote },
                        { id: 'income-expense', label: 'Income & Expense', icon: CreditCard },
                        { id: 'profit-graph', label: 'Profit Graph', icon: TrendingUp },
                        { id: 'clients-analytics', label: 'Clients Analytics', icon: Users }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group flex items-center px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold shrink-0 transition-all duration-200 cursor-pointer shadow-xs whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15' 
                                    : 'bg-white text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-slate-200'
                            }`}
                        >
                            <tab.icon size={16} className={`mr-2 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                                activeTab === tab.id ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-700'
                            }`} /> 
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="animate-fade-up delay-200 group flex-1 p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 flex flex-col">
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm group-hover:shadow-lg transition-all flex-1">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
