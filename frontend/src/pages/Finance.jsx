import { getWorkspaceBrand } from '../utils/workspaceBrand';
import { lazy, Suspense, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Plus } from 'lucide-react';
import CustomerManagement from '../components/CustomerManagement';
import RobotriqCustomers from '../components/RobotriqCustomers';
import VendorManagement from '../components/VendorManagement';
import InvoiceManagement from '../components/InvoiceManagement';
import InvoiceHistory from '../components/InvoiceHistory';
import InvoicePayment from '../components/InvoicePayment';
import QuotationManagement from '../components/QuotationManagement';
import FixedTemplates from '../components/FixedTemplates';
import PurchaseManagement from '../components/PurchaseManagement';
import PaymentManagement from '../components/PaymentManagement';
import FinanceDashboard from '../components/FinanceDashboard';
import { useRobotriqView } from '../utils/useRobotriqView';
import './Finance.css';

const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger' });
const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'Asia/Kolkata' });
const monthKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Kolkata' });
const RobotriqFeeReceipts = lazy(() => import('../components/RobotriqFeeReceipts'));
const RobotriqDocumentHistory = lazy(() => import('../components/RobotriqDocumentHistory'));

export default function Finance() {
    const { user } = useContext(AuthContext);

    const workspaceBrand = getWorkspaceBrand(user);
    const isRobotriq = workspaceBrand === 'robotriq';

    const robotriqViews = ['quotations', 'receipts', 'customers', 'vendors', 'purchases'];
    if (user?.role === 'Admin') robotriqViews.push('legacy-quotations');
    const [activeTab, setActiveTab] = useRobotriqView(isRobotriq, isRobotriq ? 'quotations' : 'workspace', robotriqViews);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [invoices, setInvoices] = useState(null);
    const [prefilledTemplateForQuote, setPrefilledTemplateForQuote] = useState(null);
    const [prefilledTemplateForInvoice, setPrefilledTemplateForInvoice] = useState(null);


    // Fixed Templates feature is exclusive to Skite Digital Agency
    const isSkite = workspaceBrand === 'skite';

    const renderContent = () => {
        // Strict Robotriq mode: Only Quotations, Payment Receipts, Customers, Vendors, Purchases
        if (isRobotriq) {
            switch (activeTab) {
                case 'receipts':
                    return user.role === 'Admin' ? <Suspense fallback={<p role="status">Loading receipts…</p>}>
                        <RobotriqFeeReceipts />
                    </Suspense> : <PaymentManagement />;
                case 'legacy-quotations':
                    return user.role === 'Admin' && <Suspense fallback={<p role="status">Loading quotation history…</p>}>
                        <RobotriqDocumentHistory />
                    </Suspense>;
                case 'customers':
                    return ['Admin', 'Sales'].includes(user?.role) ? <RobotriqCustomers /> : <CustomerManagement />;
                case 'vendors':
                    return <VendorManagement />;
                case 'purchases':
                    return <PurchaseManagement />;
                case 'quotations':
                default:
                    if (user.role !== 'Admin') return <p>Robotriq quotation access is required.</p>;
                    return (
                        <QuotationManagement 
                            initialTemplate={prefilledTemplateForQuote}
                            onClearInitialTemplate={() => setPrefilledTemplateForQuote(null)}
                        />
                    );
            }
        }

        switch (activeTab) {
            case 'workspace':
                return <InvoiceHistory workspace onInvoicesChange={setInvoices} onRecordPayment={invoice => {
                    setSelectedPayment(invoice);
                    setActiveTab('record-payment');
                }} />;
            case 'record-payment':
                return <InvoicePayment initialInvoice={selectedPayment} onBack={() => setActiveTab('workspace')} />;
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

    const now = new Date();
    const thisMonth = monthKey.format(now);
    const monthTotal = invoices?.reduce((total, record) => {
        const date = new Date(record.invoiceDate);
        return record.invoiceDate && Number.isFinite(date.getTime()) && monthKey.format(date) === thisMonth
            ? total + (Number(record.grandTotal) || 0) : total;
    }, 0);
    const tabs = [
        ...(!isRobotriq ? [['workspace', 'Invoices']] : []),
        ['quotations', 'Quotations'], ['receipts', 'Receipts'], ['customers', 'Customers'], ['vendors', 'Vendors'], ['purchases', 'Purchases'],
        ...(isRobotriq && user?.role === 'Admin' ? [['legacy-quotations', 'Legacy quotations']] : []),
        ...(!isRobotriq && isSkite ? [['fixed-templates', 'Templates']] : []),
        ...(!isRobotriq ? [['dashboard', 'Dashboard'], ['invoice-history', 'Invoice history']] : []),
    ];
    const invoiceContext = ['workspace', 'invoices', 'record-payment'].includes(activeTab);
    const viewTitle = {
        dashboard: 'Financial overview', 'invoice-history': 'Invoice history', vendors: 'Vendors', purchases: 'Purchase bills',
        receipts: 'Payment receipts', customers: 'Customers', quotations: 'Quotations', 'fixed-templates': 'Fixed client templates',
        'legacy-quotations': 'Legacy admin quotations',
    }[activeTab];

    return (
        <Layout workspace compactTools>
            <div className="finance-workspace">
                <header className="finance-workspace-heading">
                    <div>
                        <p>{isRobotriq ? 'Quotations & Finance' : 'Finance & Invoicing'}</p>
                        <h1>{viewTitle || (!isRobotriq && monthTotal != null
                            ? <>{amount.format(monthTotal)} <span>invoiced in {monthName.format(now)}</span></>
                            : isRobotriq ? 'Quotations & finance' : 'Finance & invoicing')}</h1>
                    </div>
                    {!isRobotriq && <button type="button" onClick={() => setActiveTab('invoices')}><Plus size={15} /> New invoice</button>}
                </header>
                <nav className="finance-workspace-tabs" aria-label="Finance views">
                    {tabs.map(([id, label]) => (
                        <button type="button" key={id} aria-current={activeTab === id || (id === 'workspace' && invoiceContext) ? 'page' : undefined}
                            onClick={() => setActiveTab(id)}>{label}</button>
                    ))}
                </nav>
                <div className={viewTitle || (activeTab === 'workspace' && !isRobotriq) ? undefined : 'finance-workspace-module'}>{renderContent()}</div>
            </div>
        </Layout>
    );
}
