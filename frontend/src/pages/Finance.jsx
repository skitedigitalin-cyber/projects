import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import { LayoutDashboard, Users, UserCog, FileText, ShoppingCart, CreditCard, History, FileCheck, Banknote, Repeat, Receipt } from 'lucide-react';
import CustomerManagement from '../components/CustomerManagement';
import VendorManagement from '../components/VendorManagement';
import InvoiceManagement from '../components/InvoiceManagement';
import InvoiceHistory from '../components/InvoiceHistory';
import InvoicePayment from '../components/InvoicePayment';
import QuotationManagement from '../components/QuotationManagement';
import FixedTemplates from '../components/FixedTemplates';
import PurchaseManagement from '../components/PurchaseManagement';
import PaymentManagement from '../components/PaymentManagement';
import FinanceDashboard from '../components/FinanceDashboard';

export default function Finance() {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [prefilledTemplateForQuote, setPrefilledTemplateForQuote] = useState(null);
    const [prefilledTemplateForInvoice, setPrefilledTemplateForInvoice] = useState(null);

    // Fixed Templates feature is exclusive to Skite Digital Agency
    const isSkite = 
        user?.isSkiteTenant === true ||
        user?.tenantId === '6af2c94a9d29730751ed2d01' ||
        (user?.companyName && user.companyName.toLowerCase().includes('skite')) ||
        (user?.email && user.email.toLowerCase().includes('skite'));

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <FinanceDashboard />;
            case 'receipts':
                return <PaymentManagement />;
            case 'customers':
                return <CustomerManagement />;
            case 'vendors':
                return <VendorManagement />;
            case 'invoices':
                return (
                    <InvoiceManagement 
                        onNavigateToHistory={() => setActiveTab('invoice-history')}
                        initialTemplate={prefilledTemplateForInvoice}
                        onClearInitialTemplate={() => setPrefilledTemplateForInvoice(null)}
                    />
                );
            case 'invoice-history':
                return <InvoiceHistory onNavigateToInvoices={() => setActiveTab('invoices')} />;
            case 'quotations':
                return (
                    <QuotationManagement 
                        initialTemplate={prefilledTemplateForQuote}
                        onClearInitialTemplate={() => setPrefilledTemplateForQuote(null)}
                    />
                );
            case 'fixed-templates':
                if (!isSkite) return <FinanceDashboard />;
                return (
                    <FixedTemplates 
                        onSelectForQuote={(tmpl) => {
                            setPrefilledTemplateForQuote(tmpl);
                            setActiveTab('quotations');
                        }}
                        onSelectForInvoice={(tmpl) => {
                            setPrefilledTemplateForInvoice(tmpl);
                            setActiveTab('invoices');
                        }}
                    />
                );
            case 'purchases':
                return <PurchaseManagement />;
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
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl transform group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="relative z-10">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Finance & Accounting</h1>
                            <p className="text-slate-400 mt-1.5 font-medium text-sm">Manage customers, vendors, invoices, and payments.</p>
                        </div>
                    </div>
                </div>

                {/* Sub Navigation (Floating Pill Strips - Single Line Compact) */}
                <div className="shrink-0 animate-fade-up delay-100 flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'receipts', label: 'Payment Receipts', icon: Receipt },
                        { id: 'invoices', label: 'Invoices', icon: FileText },
                        { id: 'invoice-history', label: 'Invoice History', icon: History },
                        { id: 'quotations', label: 'Quotations', icon: FileCheck },
                        { id: 'customers', label: 'Customers', icon: Users },
                        { id: 'vendors', label: 'Vendors', icon: UserCog },
                        ...(isSkite ? [{ id: 'fixed-templates', label: 'Fixed Templates', icon: Repeat }] : []),
                        { id: 'purchases', label: 'Purchases', icon: ShoppingCart }
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
                                activeTab === tab.id ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-700'
                            }`} /> 
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area (Double Bezel Bento) */}
                <div className="animate-fade-up delay-200 group flex-1 p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 flex flex-col">
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm group-hover:shadow-lg transition-all flex-1">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
