import { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import InvoicePayment from '../components/InvoicePayment';
import IncomeExpense from '../components/IncomeExpense';
import ProfitGraph from '../components/ProfitGraph';
import ClientsAnalytics from '../components/ClientsAnalytics';
import AccountsOverview from '../components/AccountsOverview';
import { compactRupees } from '../components/DashboardNumbers';
import { summarizeAccounts } from '../utils/accountSummary';
import './Accounts.css';

const tabs = [
    ['invoice-payments', 'Payments'], ['income-expense', 'Income & Expense'], ['profit-graph', 'Profit'], ['clients-analytics', 'Clients'],
];

export default function Accounts() {
    const [activeTab, setActiveTab] = useState('income-expense');
    const [records, setRecords] = useState(null);
    const summary = useMemo(() => records && !records.failed ? summarizeAccounts(records.invoices, records.payments) : null, [records]);
    const profit = summary?.current.profit;

    return (
        <Layout workspace compactTools>
            <div className="accounts-workspace">
                <header className="accounts-page-heading">
                    <div>
                        <p>Accounts{summary && ` · FY ${summary.fiscalYear}–${String(summary.fiscalYear + 1).slice(-2)}`}</p>
                        <h1>{activeTab !== 'income-expense' ? tabs.find(([id]) => id === activeTab)?.[1] : profit == null ? 'Accounts' : <>{compactRupees(Math.abs(profit))} {profit < 0 ? 'loss' : 'profit'} <span>this month</span></>}</h1>
                    </div>
                    <nav aria-label="Accounts views">
                        {tabs.map(([id, label]) => <button type="button" key={id} aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}>{label}</button>)}
                    </nav>
                </header>
                {activeTab === 'income-expense' ? (
                    <>
                        <AccountsOverview summary={summary} failed={records?.failed} />
                        <section className="accounts-card accounts-existing" aria-label="Income and expense transactions">
                            <IncomeExpense onRecordsChange={setRecords} />
                        </section>
                    </>
                ) : (
                    <div>
                        {activeTab === 'invoice-payments' && <InvoicePayment onBack={() => setActiveTab('income-expense')} />}
                        {activeTab === 'profit-graph' && <ProfitGraph />}
                        {activeTab === 'clients-analytics' && <ClientsAnalytics />}
                    </div>
                )}
            </div>
        </Layout>
    );
}
