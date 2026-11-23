import React, { useRef } from 'react';
import { X, Download, Printer, Share2, CheckCircle2, Building, User, CreditCard, Hash, Calendar, FileText } from 'lucide-react';
import { generatePaymentReceiptPdf } from '../utils/paymentReceiptPdfGenerator';

// Amount in Words Helper
function numberToWords(price) {
    const sglDigit = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const dblDigit = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tensPlace = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const convert = (num) => {
        if (num < 10) return sglDigit[num];
        if (num < 20) return dblDigit[num - 10];
        if (num < 100) { let str = tensPlace[Math.floor(num / 10)]; if (num % 10 !== 0) str += " " + sglDigit[num % 10]; return str; }
        if (num < 1000) { let str = sglDigit[Math.floor(num / 100)] + " Hundred"; if (num % 100 !== 0) str += " and " + convert(num % 100); return str; }
        if (num < 100000) { let str = convert(Math.floor(num / 1000)) + " Thousand"; if (num % 1000 !== 0) str += " " + convert(num % 1000); return str; }
        if (num < 10000000) { let str = convert(Math.floor(num / 100000)) + " Lakh"; if (num % 100000 !== 0) str += " " + convert(num % 100000); return str; }
        return "Number too large";
    };
    const num = Math.floor(Number(price) || 0);
    if (num === 0) return "Zero Rupees Only";
    return "Indian Rupees " + convert(num) + " Only";
}

export default function PaymentReceiptModal({ payment, company = {}, onClose }) {
    const receiptRef = useRef(null);
    if (!payment) return null;

    const activeColor = company.invoiceColor || '#FF4500';
    const companyName = company.name || (company.workspaceBrand === 'skite' ? 'SKITE' : 'Company');
    const customer = payment.customerId || {};
    const clientName = customer.companyName || customer.customerName || (typeof payment.customerId === 'string' ? payment.customerId : 'Valued Client');
    const clientAddress = customer.billingAddress || customer.address || '';
    const clientGst = customer.gstNumber || '';
    const clientPhone = customer.phone || '';
    const clientEmail = customer.email || '';

    const receiptNo = payment.receiptNumber || payment.paymentId || 'RCP-0001';
    const rawDate = payment.receiptDate || payment.paymentDate || payment.createdAt;
    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const amountVal = Number(payment.amount || 0);
    const inr = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const handleDownloadPdf = async () => {
        try {
            const fileName = `Payment_Receipt_${receiptNo}_${clientName.replace(/\s+/g, '_')}`;
            await generatePaymentReceiptPdf(payment, company, fileName, activeColor);
        } catch (err) {
            console.error('Failed to export PDF receipt:', err);
            alert('Failed to generate PDF receipt');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        const text = `*OFFICIAL PAYMENT RECEIPT*\n` +
            `Receipt No: ${receiptNo}\n` +
            `Date: ${formattedDate}\n` +
            `Received From: ${clientName}\n` +
            `Amount: Rs. ${inr(amountVal)}\n` +
            `Mode: ${payment.paymentMode}\n` +
            `Txn ID: ${payment.transactionId || 'N/A'}\n` +
            `Thank you for your business! - ${companyName}`;
        const phone = clientPhone ? clientPhone.replace(/[^0-9]/g, '') : '';
        const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
            <style dangerouslySetInnerHTML={{
                __html: `
                    @media print {
                        body * { visibility: hidden; }
                        #printable-receipt-card, #printable-receipt-card * { visibility: visible; }
                        #printable-receipt-card {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            margin: 0;
                            padding: 24px;
                            box-shadow: none !important;
                            border: none !important;
                        }
                    }
                `
            }} />

            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden text-left print:max-h-none print:shadow-none print:border-none">
                {/* Header Actions Bar */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
                    <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                            <CheckCircle2 size={18} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-base">Official Payment Receipt</h3>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    {payment.paymentType === 'Inward' ? 'Received' : 'Paid Out'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Receipt #{receiptNo} • {formattedDate}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleWhatsAppShare}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                            title="Share receipt summary on WhatsApp"
                        >
                            <Share2 size={13} />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all border border-slate-700"
                        >
                            <Printer size={13} />
                            <span className="hidden sm:inline">Print</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                        >
                            <Download size={13} />
                            <span>Download PDF</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Receipt Card Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white">
                    <div 
                        id="printable-receipt-card"
                        ref={receiptRef}
                        className="bg-white rounded-2xl p-8 max-w-2xl mx-auto shadow-sm border border-slate-200 text-slate-900 font-sans print:border-none print:shadow-none"
                    >
                        {/* Top Accent Strip */}
                        <div className="h-1.5 w-full rounded-full mb-6" style={{ backgroundColor: activeColor }} />

                        {/* Top Header */}
                        <div className="flex justify-between items-start pb-6 border-b border-slate-100">
                            <div>
                                {company.logo ? (
                                    <img src={company.logo} alt="Company Logo" className="max-h-12 max-w-[160px] object-contain mb-2" />
                                ) : (
                                    <div className="px-3.5 py-1.5 rounded-lg inline-flex items-center justify-center mb-2 text-white font-black text-sm" style={{ backgroundColor: activeColor }}>
                                        {companyName.toUpperCase()}
                                    </div>
                                )}
                                <h4 className="font-extrabold text-sm text-slate-900">{companyName}</h4>
                                {company.address && <p className="text-xs text-slate-500 mt-0.5 max-w-xs leading-relaxed">{company.address}</p>}
                                {company.gstNumber && <p className="text-xs font-bold text-slate-700 mt-0.5">GSTIN: {company.gstNumber}</p>}
                                <p className="text-xs text-slate-500">{company.email} {company.phone && `• ${company.phone}`}</p>
                            </div>

                            <div className="text-right">
                                <h2 className="text-2xl font-black tracking-tight" style={{ color: activeColor }}>RECEIPT</h2>
                                <p className="text-xs font-bold text-slate-800 mt-1">NO: <span className="font-mono">{receiptNo}</span></p>
                                <p className="text-xs text-slate-600 mt-0.5">DATE: <span className="font-semibold">{formattedDate}</span></p>
                                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 size={11} />
                                    <span>PAYMENT RECEIVED</span>
                                </div>
                            </div>
                        </div>

                        {/* Received From Box */}
                        <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                            <span className="text-[10px] font-black uppercase tracking-wider block mb-1" style={{ color: activeColor }}>
                                RECEIVED WITH THANKS FROM:
                            </span>
                            <h3 className="text-base font-black text-slate-900">{clientName}</h3>
                            {clientAddress && <p className="text-xs text-slate-600 mt-0.5">{clientAddress}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                                {clientGst && <span><strong>GSTIN:</strong> {clientGst}</span>}
                                {clientPhone && <span><strong>Phone:</strong> {clientPhone}</span>}
                                {clientEmail && <span><strong>Email:</strong> {clientEmail}</span>}
                            </div>
                        </div>

                        {/* Amount Box */}
                        <div className="p-5 rounded-2xl text-white shadow-sm flex items-center justify-between mb-3" style={{ backgroundColor: activeColor }}>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider opacity-90 block">Amount Received</span>
                                <span className="text-xs opacity-75">Official Indian Rupee Transaction</span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight">₹ {inr(amountVal)}</span>
                            </div>
                        </div>

                        {/* Amount In Words */}
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-semibold mb-6">
                            <strong className="text-amber-950">In Words:</strong> {numberToWords(amountVal)}
                        </div>

                        {/* Payment Breakdown Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 text-xs">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="bg-slate-50">
                                        <td className="p-3 font-bold text-slate-600 w-1/3">Payment Method</td>
                                        <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                                            <CreditCard size={14} className="text-slate-400" />
                                            <span>{payment.paymentMode || 'Bank Transfer'}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-bold text-slate-600">Transaction ID / UTR</td>
                                        <td className="p-3 font-mono font-bold text-slate-900">
                                            {payment.transactionId || payment.referenceNumber || 'N/A'}
                                        </td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="p-3 font-bold text-slate-600">Payment Category</td>
                                        <td className="p-3 text-slate-800">
                                            {payment.category || (payment.paymentType === 'Inward' ? 'Customer Payment' : 'Outward Payment')}
                                        </td>
                                    </tr>
                                    {payment.invoiceId?.invoiceNumber && (
                                        <tr>
                                            <td className="p-3 font-bold text-slate-600">Linked Invoice</td>
                                            <td className="p-3 text-blue-600 font-bold font-mono">
                                                {payment.invoiceId.invoiceNumber}
                                            </td>
                                        </tr>
                                    )}
                                    {payment.notes && (
                                        <tr className="bg-slate-50">
                                            <td className="p-3 font-bold text-slate-600">Notes / Remarks</td>
                                            <td className="p-3 text-slate-700 italic">
                                                {payment.notes}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Bottom: Seal & Authorised Signatory */}
                        <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
                            <div>
                                {company.seal && (
                                    <div className="flex flex-col items-center">
                                        <img src={company.seal} alt="Company Seal" className="h-16 w-16 sm:h-20 sm:w-20 object-contain" />
                                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                                            Official Seal
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                                    for {companyName.toUpperCase()}
                                </span>
                                {company.sign ? (
                                    <img src={company.sign} alt="Authorised Signature" className="h-12 max-w-[140px] object-contain my-1 ml-auto" />
                                ) : (
                                    <div className="h-10 w-32 border-b border-dashed border-slate-300 my-1 ml-auto" />
                                )}
                                <span className="text-xs font-black text-slate-900 tracking-tight block">
                                    Authorised Signatory
                                </span>
                            </div>
                        </div>

                        {/* Computer Generated Notice */}
                        <p className="text-[9px] text-center text-slate-400 mt-6 pt-3 border-t border-slate-100">
                            This is a computer-generated official payment receipt. No physical signature is required.
                        </p>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between print:hidden">
                    <span className="text-xs text-slate-500 font-medium">
                        Receipt is verified and saved under tenant records.
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
