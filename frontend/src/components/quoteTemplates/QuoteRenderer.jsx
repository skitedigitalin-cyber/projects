import { quotationDetailLines, quotationTextRuns } from '../../utils/quotationDescription';
import React from 'react';
import defaultLogo from '../../assets/skite-logo.jpg';
import defaultSign from '../../assets/Sign.jpg';
import defaultSeal from '../../assets/seal.png';

export default function QuoteRenderer({
    quote,
    company = {
        name: '',
        address: '',
        email: '',
        website: '',
        phone: '',
        gstNumber: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        logo: '',
        sign: '',
        seal: ''
    },
    innerRef
}) {
    if (!quote) return null;

    const isSkite = company.workspaceBrand === 'skite';
    const activeLogo = company?.logo || (isSkite ? defaultLogo : '');
    const activeSign = company?.sign || (isSkite ? defaultSign : '');
    const activeSeal = company?.seal || (isSkite ? defaultSeal : '');

    const client = quote.clientDetails || {};
    const clientName = client.name || client.customerName || client.companyName || 'Client / Business Name';
    const clientGst = client.gst || client.gstNo || client.gstin || '';
    const clientAddress = client.address || client.billingAddress || '';

    const quoteNo = quote.quoteNo || quote.quotationNumber || 'SKT-Q001';
    const rawDate = quote.date || quote.createdAt;
    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : 'N/A';
    const refNo = quote.refNo || '';

    const items = quote.items || [];
    const activeTaxRate = quote.taxRate !== undefined ? Number(quote.taxRate) : 18;
    const halfTaxRate = activeTaxRate / 2;
    const isZeroTax = activeTaxRate === 0;

    const subtotalVal = Number(quote.subtotal !== undefined ? quote.subtotal : (quote.grandTotal || 0));
    const cgstVal = quote.cgst !== undefined ? Number(quote.cgst) : Math.round(subtotalVal * (halfTaxRate / 100));
    const sgstVal = quote.sgst !== undefined ? Number(quote.sgst) : Math.round(subtotalVal * (halfTaxRate / 100));
    const grandTotalVal = Number(quote.grandTotal !== undefined ? quote.grandTotal : (subtotalVal + (isZeroTax ? 0 : (cgstVal + sgstVal))));

    const inr = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const terms = quote.terms || '50% advance payment required to start the project.\nFinal 50% on project completion before deployment.\nThe complete website will be built on our subdomain for preview and approval before final deployment.\nAny additional page will be charged at Rs.1,500 per page.';

    return (
        <div ref={innerRef} className="bg-white p-6 sm:p-8 max-w-4xl mx-auto text-slate-900 font-sans shadow-sm border border-slate-200 printable-card">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b-2 border-slate-100">
                <div>
                    {activeLogo ? (
                        <img 
                            src={activeLogo} 
                            alt={company.name || "Logo"} 
                            className="max-h-16 max-w-[200px] object-contain mb-2" 
                        />
                    ) : (
                        <div className="px-4 py-2 bg-[#FF4500] inline-flex items-center justify-center rounded-md mb-2 shadow-xs">
                            <span className="text-white font-black text-xl tracking-wider">{(company.name || (isSkite ? 'SKITE' : 'COMPANY')).toUpperCase()}</span>
                        </div>
                    )}
                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                        {company.address && <p className="max-w-xs">{company.address}</p>}
                        {company.email && <p>{company.email}</p>}
                        {company.phone && <p>{company.phone}</p>}
                        {company.website && <p>{company.website}</p>}
                        {company.gstNumber && <p className="font-bold text-slate-800">GST: {company.gstNumber}</p>}
                    </div>
                </div>

                <div className="text-right">
                    <h1 className="text-3xl font-black text-[#FF4500] tracking-tight mb-2">QUOTE</h1>
                    <p className="text-xs text-slate-700 font-semibold">
                        <strong className="text-slate-900">NO:</strong> {quoteNo}
                    </p>
                    {refNo && (
                        <p className="text-xs text-slate-700 font-semibold mt-1">
                            <strong className="text-slate-900">R.NO:</strong> {refNo}
                        </p>
                    )}
                    <p className="text-xs text-slate-700 font-semibold mt-1">
                        <strong className="text-slate-900">DATE:</strong> {formattedDate}
                    </p>
                </div>
            </div>

            {/* Quote To (Client Details) */}
            <div className="my-6">
                <h4 className="text-xs font-black text-[#FF4500] tracking-wider uppercase mb-1.5">QUOTE TO:</h4>
                <p className="text-sm font-bold text-slate-900">{clientName}</p>
                {clientGst && (
                    <p className="text-xs font-bold text-slate-800 mt-0.5">GSTIN: {clientGst}</p>
                )}
                {clientAddress && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-sm whitespace-pre-wrap">{clientAddress}</p>
                )}
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-[#FF4500] text-white uppercase text-[11px] font-bold">
                        <tr>
                            <th className="p-3">DESCRIPTION</th>
                            <th className="p-3 text-center">DETAILS</th>
                            <th className="p-3 text-right">PRICE</th>
                            <th className="p-3 text-center">QTY</th>
                            <th className="p-3 text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-4 text-center text-slate-400 italic">No items in quotation</td>
                            </tr>
                        ) : (
                            items.map((item, idx) => {
                                const price = item.price !== '' && item.price !== undefined ? Number(item.price) : 0;
                                const qty = item.qty !== '' && item.qty !== undefined ? Number(item.qty) : 1;
                                const rowTotal = price * qty;
                                const details = quotationDetailLines(item.subDescription);
                                return (
                                    <tr key={idx} className="hover:bg-orange-50/20 transition-colors">
                                        <td className="p-3 text-slate-800 max-w-[280px]">
                                            <div className="font-bold text-slate-900 text-xs">{quotationTextRuns(item.description || 'Package/Service').map(run => run.text).join('')}</div>
                                            {details.length > 0 && (
                                                <div className="text-[11px] text-slate-500 mt-1.5 space-y-0.5 pl-2 border-l border-orange-200">
                                                    {details.map((line, lIdx) => (
                                                        <div key={lIdx} className="leading-tight">• {quotationTextRuns(line).map((run, index) =>
                                                            run.bold ? <strong key={index}>{run.text}</strong> : run.text
                                                        )}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-center text-slate-600 font-mono text-[11px]">{item.hsn || '-'}</td>
                                        <td className="p-3 text-right font-mono text-slate-800 font-medium">
                                            {price > 0 ? `₹${inr(price)}` : '-'}
                                        </td>
                                        <td className="p-3 text-center font-mono text-slate-700 font-medium">{qty}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                                            {rowTotal > 0 ? `₹${inr(rowTotal)}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Terms and Totals */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Terms and Conditions */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <h5 className="font-bold text-[#FF4500] uppercase tracking-wider text-[11px]">TERMS & CONDITIONS</h5>
                    <pre className="text-slate-600 whitespace-pre-wrap font-sans text-[11px] leading-relaxed">
                        {terms}
                    </pre>
                </div>

                {/* Totals Box */}
                <div className="space-y-1">
                    <div className="flex justify-between p-2.5 bg-[#fff7e6] text-xs font-semibold">
                        <span className="text-[#FF4500]">Subtotal</span>
                        <span className="font-mono text-slate-900 font-bold">₹{inr(subtotalVal)}</span>
                    </div>
                    {!isZeroTax && (
                        <>
                            <div className="flex justify-between p-2.5 bg-[#fff7e6] text-xs font-semibold">
                                <span className="text-[#FF4500]">CGST {halfTaxRate}%</span>
                                <span className="font-mono text-slate-900 font-bold">₹{inr(cgstVal)}</span>
                            </div>
                            <div className="flex justify-between p-2.5 bg-[#fff7e6] text-xs font-semibold">
                                <span className="text-[#FF4500]">SGST {halfTaxRate}%</span>
                                <span className="font-mono text-slate-900 font-bold">₹{inr(sgstVal)}</span>
                            </div>
                        </>
                    )}
                    <div className="flex justify-between p-3 bg-[#FF4500] text-white font-extrabold text-sm rounded-xs shadow-xs">
                        <span className="tracking-wide">TOTAL</span>
                        <span className="font-mono tracking-tight text-base">₹{inr(grandTotalVal)}</span>
                    </div>
                </div>
            </div>

            {/* Bottom: Bank Details (Left) & Authorised Signatory + Company Seal (Right) */}
            <div className="pt-6 mt-6 border-t-2 border-slate-100 flex flex-col md:flex-row justify-between items-end gap-6">
                {/* Bank Details */}
                {(company.bankName || company.accountNumber || isSkite) && (
                    <div className="text-xs space-y-1">
                        <h4 className="text-xs font-black text-[#FF4500] tracking-wider uppercase mb-1">Payment Details:</h4>
                        <p className="font-black text-slate-900 text-sm">{company.bankName || (isSkite ? 'Union Bank of India' : '')}</p>
                        <p className="text-slate-700">Account Name: <span className="font-semibold">{company.accountName || company.name || (isSkite ? 'SKITE' : '')}</span></p>
                        <p className="text-slate-700">Account Number: <span className="font-mono font-bold text-slate-900">{company.accountNumber || (isSkite ? '252511010000196' : '')}</span></p>
                        <p className="text-slate-700">IFSC Code: <span className="font-mono font-bold text-slate-900">{company.ifscCode || (isSkite ? 'UBIN0825255' : '')}</span></p>
                        <p className="text-slate-700">Branch: <span className="font-semibold">{company.branch || (isSkite ? 'Sundarapuram' : '')}</span></p>
                    </div>
                )}

                {/* Seal & Authorised Signatory */}
                <div className="flex items-end gap-6 justify-end ml-auto">
                    {activeSeal && (
                        <div className="flex flex-col items-center justify-center shrink-0 mb-1">
                            <img 
                                src={activeSeal} 
                                alt="Company Seal" 
                                className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-xs" 
                            />
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">
                                Official Seal
                            </span>
                        </div>
                    )}
                    <div className="flex flex-col items-end text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            for {company.name || (isSkite ? 'SKITE' : 'Authorized Signatory')}
                        </span>
                        {activeSign ? (
                            <img src={activeSign} alt="Authorised Signature" className="h-14 max-w-[160px] object-contain my-1.5" />
                        ) : (
                            <div className="h-10 w-36 border-b border-dashed border-slate-300 my-1.5 flex items-center justify-center text-[10px] text-slate-400">
                                Signature
                            </div>
                        )}
                        <span className="text-xs font-black text-slate-900 tracking-tight">
                            Authorised Signatory
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
                This is a Computer Generated Quotation
            </div>
        </div>
    );
}
