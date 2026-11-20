import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas-pro';

import defaultLogo from '../assets/skite-logo.jpg';
import defaultSign from '../assets/Sign.jpg';
import defaultSeal from '../assets/seal.png';
import { sealImage as defaultRobotriqSeal, signImage as defaultRobotriqSign } from '../assets/robotriqImages';

/**
 * Optimizes, downscales and compresses an image (DataURL, URL, or asset import).
 * Keeps PDF size ultra-low (~150 KB - 250 KB) with a fail-safe timeout so remote images never hang.
 */
const getOptimizedImage = (imgSrc, maxWidth = 500, maxHeight = 300, quality = 0.8) => new Promise((resolve) => {
    if (!imgSrc) return resolve(null);

    const timer = setTimeout(() => {
        console.warn('Image optimization timeout for:', typeof imgSrc === 'string' ? imgSrc.substring(0, 60) : 'asset');
        resolve(null);
    }, 2500);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        clearTimeout(timer);
        try {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            const isPng = typeof imgSrc === 'string' && (imgSrc.includes('image/png') || imgSrc.endsWith('.png'));

            if (!isPng) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }

            ctx.drawImage(img, 0, 0, width, height);

            if (isPng) {
                resolve({ data: canvas.toDataURL('image/png'), format: 'PNG', width, height });
            } else {
                resolve({ data: canvas.toDataURL('image/jpeg', quality), format: 'JPEG', width, height });
            }
        } catch (e) {
            console.warn('Image optimization error:', e);
            resolve(null);
        }
    };
    img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
    };
    img.src = imgSrc;
});

/**
 * Convert number to Indian Rupee Words format
 */
const numberToWords = (price) => {
    const sglDigit = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const dblDigit = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tensPlace = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    const convert = (num) => {
        if (num < 10) return sglDigit[num];
        if (num < 20) return dblDigit[num - 10];
        if (num < 100) return tensPlace[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + sglDigit[num % 10] : "");
        if (num < 1000) return sglDigit[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " and " + convert(num % 100) : "");
        if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 !== 0 ? " " + convert(num % 1000) : "");
        if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 !== 0 ? " " + convert(num % 100000) : "");
        return "";
    };

    const num = Math.floor(Number(price) || 0);
    if (num === 0) return "Zero Rupees Only";
    return "Indian Rupees " + convert(num) + " Only";
};

export function hexToRgb(hex, fallback = [249, 87, 56]) {
    if (!hex) return fallback;
    const clean = String(hex).replace('#', '').trim();
    if (clean.length === 3) {
        return [
            parseInt(clean[0] + clean[0], 16),
            parseInt(clean[1] + clean[1], 16),
            parseInt(clean[2] + clean[2], 16)
        ];
    }
    if (clean.length === 6) {
        return [
            parseInt(clean.slice(0, 2), 16),
            parseInt(clean.slice(2, 4), 16),
            parseInt(clean.slice(4, 6), 16)
        ];
    }
    return fallback;
}

/**
 * Generates an official, full-page vector A4 PDF invoice matching Invoice_SKT-26-27-046 exactly.
 * Features:
 *  - Top-Left: Crisp Skite Logo, Bold "SKITE" company title, clean address and GST NO.
 *  - Top-Right: High-impact "INVOICE" header in signature brand color.
 *  - Two-column info row: Left side "ISSUED TO:" with client name, address, GST;
 *    Right side aligned "INVOICE NO:" & "DATE:" directly opposite.
 *  - Styled Grid Items Table with brand orange outer & inner borders, minimum 5 padded rows,
 *    and clean summary rows (Subtotal, CGST, SGST, TOTAL) on white background with orange borders.
 *  - Amount in Words right below table.
 *  - Bottom: Left-aligned bold black Bank Details & contact details, perfectly centered round Official Seal,
 *    and right-aligned Authorised Signatory block.
 */
/**
 * Renders a single invoice onto the current page of the provided jsPDF instance.
 */
export function renderInvoicePage(doc, invoice, company = {}, assets = {}, customColor = null) {
    if (!invoice) return;

    const rawUser = typeof window !== 'undefined' ? (localStorage.getItem('user') || '') : '';
    const isRobotriq = Boolean(
        company?.name?.toLowerCase().includes('robotriq') ||
        company?.email?.toLowerCase().includes('robotriq') ||
        rawUser.toLowerCase().includes('robotriq') ||
        (invoices[0]?.invoiceNumber && invoices[0].invoiceNumber.startsWith('ROB'))
    );
    const isSkite = !isRobotriq && (company?.name?.toLowerCase().includes('skite') || company?.email?.toLowerCase().includes('skite'));

    // Primary accent color (Teal for Robotriq #0d9488, default Skite signature orange #FF4500)
    const activeHexColor = customColor || company?.invoiceColor || (isRobotriq ? '#0d9488' : '#FF4500');
    const primaryColor = hexToRgb(activeHexColor, isRobotriq ? [13, 148, 136] : [255, 69, 0]);
    const invNo = invoice.invoiceNumber || invoice.invoiceNo || 'INV-001';
    const rawDate = invoice.invoiceDate || invoice.date;
    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

    const companyName = company?.name || (isRobotriq ? 'ROBOTRIQ AUTOMATION PRIVATE LIMITED' : (isSkite ? 'SKITE' : ''));
    const companyAddress = company?.address || (isRobotriq ? 'Door No. 201/7B1, Kamatchi Layout, Pathalapalli,\nHosur - 635109, Tamil Nadu' : (isSkite ? '257- Housing Unit/ Kurichi 003\nL.I.C colony,\nCoimbatore - 641021' : ''));
    const companyGst = company?.gstNumber || (isRobotriq ? '' : (isSkite ? '33REAPS5023G1ZE' : ''));
    const companyBank = company?.bankName || (isRobotriq ? 'UNION BANK' : (isSkite ? 'Union Bank of India' : ''));
    const companyAccName = company?.accountName || companyName || (isRobotriq ? 'ROBOTRIQ AUTOMATION PRIVATE LIMITED' : (isSkite ? 'SKITE' : ''));
    const companyAccNo = company?.accountNumber || (isRobotriq ? '252511010000242' : (isSkite ? '252511010000196' : ''));
    const companyIfsc = company?.ifscCode || (isRobotriq ? 'UBIN0825255' : (isSkite ? 'UBIN0825255' : ''));
    const companyBranch = company?.branch || (isRobotriq ? 'SUNDHARAPURAM, COIMBATORE' : (isSkite ? 'Sundarapuram' : ''));
    const companyEmail = company?.email || (isRobotriq ? 'robotriqindia@gmail.com' : (isSkite ? 'skitedigital.in@gmail.com' : ''));
    const companyWebsite = company?.website || (isRobotriq ? 'www.robotriq.com' : (isSkite ? 'www.skitedigital.in' : ''));
    const companyPhone = company?.phone || (isRobotriq ? '+91 94443 47184 / +91 93624 47184' : (isSkite ? '8754281434' : ''));

    const { logoObj, signObj, sealObj } = assets || {};

    // 1. Top Left: Company Logo
    if (logoObj?.data) {
        try {
            const aspect = (logoObj.width && logoObj.height) ? (logoObj.width / logoObj.height) : 2.5;
            const lHeight = 15;
            const lWidth = Math.min(lHeight * aspect, 42);
            doc.addImage(logoObj.data, logoObj.format, 14, 12, lWidth, lHeight, undefined, 'FAST');
        } catch (e) {
            console.warn("Logo addImage fallback:", e);
        }
    }

    // 2. Company Address & GST Number (No duplicate text under logo)
    const addressStartY = logoObj?.data ? 30 : (companyName ? 20 : 14);
    if (!logoObj?.data && companyName) {
        doc.setFontSize(10.5).setFont("helvetica", "bold").setTextColor(0, 0, 0);
        doc.text(companyName.toUpperCase(), 14, 14);
    }

    doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(30, 30, 30);
    const addrLines = (companyAddress || '').split('\n').flatMap(l => doc.splitTextToSize(l.trim(), 80));
    doc.text(addrLines, 14, addressStartY);

    const afterAddressY = addressStartY + (addrLines.length * 4.2);
    if (companyGst) {
        doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(0, 0, 0);
        doc.text(`GST NO: ${companyGst}`, 14, afterAddressY);
    }

    // 4. Top Right: Title "INVOICE"
    doc.setFontSize(26).setFont("helvetica", "bold").setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("INVOICE", 196, 20, { align: 'right' });

    // 5. Client Section ("ISSUED TO:") & Invoice Details ("INVOICE NO:" & "DATE:")
    const sectionY = Math.max(afterAddressY + 7, 56);

    // Left Column: ISSUED TO
    const customer = invoice.customerId || invoice.clientDetails || {};
    const clientName = customer.companyName || customer.customerName || customer.name || (typeof invoice.customerId === 'string' ? invoice.customerId : 'Client Company');
    const clientGst = customer.gstNumber || customer.gstNo || '';
    const rawClientAddr = customer.billingAddress || customer.address || 
        [customer.addressLine1, customer.addressLine2, customer.location].filter(Boolean).join('\n') || '';

    doc.setFontSize(9.5).setFont("helvetica", "bold").setTextColor(0, 0, 0);
    doc.text("ISSUED TO:", 14, sectionY);
    doc.text(clientName.toUpperCase(), 14, sectionY + 5.2);

    let clientY = sectionY + 9.8;
    if (rawClientAddr) {
        doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(40, 40, 40);
        const clientAddrLines = rawClientAddr.split('\n').flatMap(l => doc.splitTextToSize(l.trim(), 85));
        doc.text(clientAddrLines, 14, clientY);
        clientY += (clientAddrLines.length * 4.2);
    }
    if (clientGst) {
        doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(0, 0, 0);
        doc.text(`GST: ${clientGst}`, 14, clientY);
        clientY += 5;
    }

    // Right Column: INVOICE NO: & DATE:
    doc.setFontSize(9.5).setFont("helvetica", "bold").setTextColor(0, 0, 0);
    doc.text("INVOICE NO:", 120, sectionY);
    doc.setFont("helvetica", "bold");
    doc.text(invNo, 155, sectionY);

    doc.setFont("helvetica", "bold");
    doc.text("DATE:", 120, sectionY + 5.2);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, 155, sectionY + 5.2);

    if (invoice.dueDate) {
        const dueStr = new Date(invoice.dueDate).toLocaleDateString('en-GB');
        doc.setFont("helvetica", "bold");
        doc.text("DUE DATE:", 120, sectionY + 10.4);
        doc.setFont("helvetica", "normal");
        doc.text(dueStr, 155, sectionY + 10.4);
    }

    // 6. Items Table
    const tableStartY = Math.max(clientY + 6, sectionY + 18, 76);
    const items = invoice.items || [];
    const activeTaxRate = invoice.taxRate !== undefined ? Number(invoice.taxRate) : 9;
    const isZeroTax = activeTaxRate === 0;

    const subtotalVal = Number(invoice.subTotal !== undefined ? invoice.subTotal : (invoice.subtotal !== undefined ? invoice.subtotal : (invoice.totalAmount || invoice.grandTotal || 0)));
    const cgstVal = invoice.cgst !== undefined ? Number(invoice.cgst) : (invoice.taxAmount ? Number(invoice.taxAmount) / 2 : (subtotalVal * (activeTaxRate / 100)));
    const sgstVal = invoice.sgst !== undefined ? Number(invoice.sgst) : (invoice.taxAmount ? Number(invoice.taxAmount) / 2 : (subtotalVal * (activeTaxRate / 100)));
    const grandTotalVal = Number(invoice.grandTotal !== undefined ? invoice.grandTotal : (invoice.totalAmount !== undefined ? invoice.totalAmount : (subtotalVal + (isZeroTax ? 0 : (cgstVal + sgstVal)))));

    const tableBody = items.map(item => {
        const desc = item.description || item.itemName || item.name || '';
        const hsn = item.hsn || item.hsnCode || '998314';
        const price = Number(item.price !== undefined ? item.price : (item.rate || 0));
        const qty = Number(item.qty !== undefined ? item.qty : (item.quantity || 1));
        const total = Number(item.total !== undefined ? item.total : (price * qty));
        return [
            desc,
            hsn,
            price.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            qty.toString(),
            total.toLocaleString('en-IN', { minimumFractionDigits: 2 })
        ];
    });

    // Pad with empty rows to maintain minimum 5 rows
    const minItemRows = 5;
    while (tableBody.length < minItemRows) {
        tableBody.push(['', '', '', '', '']);
    }

    if (isZeroTax) {
        tableBody.push(
            [
                { content: 'Subtotal', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
                { content: subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
            ],
            [
                { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
                { content: grandTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
            ]
        );
    } else {
        tableBody.push(
            [
                { content: 'Subtotal', colSpan: 4, styles: { halign: 'right', fontStyle: 'normal', fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
                { content: subtotalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'normal', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
            ],
            [
                { content: `CGST ${activeTaxRate}%`, colSpan: 4, styles: { halign: 'right', fontStyle: 'normal', fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
                { content: cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'normal', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
            ],
            [
                { content: `SGST ${activeTaxRate}%`, colSpan: 4, styles: { halign: 'right', fontStyle: 'normal', fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
                { content: sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'normal', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
            ],
            [
                { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } },
                { content: grandTotalVal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fillColor: [255, 255, 255], textColor: [0, 0, 0] } }
            ]
        );
    }

    autoTable(doc, {
        startY: tableStartY,
        head: [[
            { content: 'DESCRIPTION', styles: { halign: 'left' } },
            { content: 'HSN', styles: { halign: 'center' } },
            { content: 'UNIT PRICE', styles: { halign: 'center' } },
            { content: 'QTY', styles: { halign: 'center' } },
            { content: 'TOTAL', styles: { halign: 'right' } }
        ]],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: primaryColor, 
            textColor: [255, 255, 255], 
            lineColor: primaryColor, 
            lineWidth: 0.15, 
            fontStyle: 'bold',
            fontSize: 9
        },
        bodyStyles: { 
            lineColor: primaryColor, 
            lineWidth: 0.15, 
            textColor: [0, 0, 0],
            fontSize: 8.5,
            minCellHeight: 6
        },
        alternateRowStyles: {
            fillColor: [255, 255, 255]
        },
        columnStyles: { 
            0: { cellWidth: 78, fontStyle: 'normal' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 26, halign: 'right' },
            3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 44, halign: 'right' } 
        }
    });

    // 7. Amount in Words
    const finalY = (doc.lastAutoTable?.finalY || 160) + 8;
    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(0, 0, 0);
    doc.text("Amount in Words:", 14, finalY);
    doc.setFont("helvetica", "italic").setTextColor(0, 0, 0);
    doc.text(numberToWords(grandTotalVal), 44, finalY);

    // 8. Bottom Section: Bank Details (Left), Official Seal (Center), Signatory (Right)
    const bankY = Math.max(finalY + 18, 220);

    doc.setFontSize(9).setFont("helvetica", "bold").setTextColor(0, 0, 0);
    doc.text("PAY TO:", 14, bankY);
    doc.text(companyBank, 14, bankY + 4.5);

    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(0, 0, 0);
    doc.text(`Account Name: ${companyAccName}`, 14, bankY + 9);
    doc.text(`Account No: ${companyAccNo}`, 14, bankY + 13.5);
    doc.text(`IFSC: ${companyIfsc}`, 14, bankY + 18);
    doc.text(`Branch: ${companyBranch}`, 14, bankY + 22.5);

    const contactY = bankY + 31;
    doc.setFontSize(8.5).setFont("helvetica", "normal").setTextColor(0, 0, 0);
    if (companyEmail) doc.text(companyEmail, 14, contactY);
    if (companyWebsite) doc.text(companyWebsite, 14, contactY + 4.5);
    if (companyPhone) doc.text(companyPhone, 14, contactY + 9);

    // Center: Official Round Seal
    if (sealObj?.data) {
        try {
            const aspect = (sealObj.width && sealObj.height) ? (sealObj.width / sealObj.height) : 1;
            const targetHeight = 28;
            const targetWidth = targetHeight * aspect;
            const sealX = Math.round(112 - (targetWidth / 2));
            doc.addImage(sealObj.data, sealObj.format, sealX, bankY + 20, targetWidth, targetHeight, undefined, 'FAST');
        } catch (e) {
            console.warn("Seal addImage fallback:", e);
        }
    }

    // Right Column: Authorised Signatory
    doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(0, 0, 0);
    doc.text(`for ${companyName || 'SKITE'}`, 148, bankY + 12);

    if (signObj?.data) {
        try {
            const signAspect = (signObj.width && signObj.height) ? (signObj.width / signObj.height) : 2.5;
            const signHeight = 18;
            const signWidth = signHeight * signAspect;
            doc.addImage(signObj.data, signObj.format, 140, bankY + 16, Math.min(signWidth, 50), signHeight, undefined, 'FAST');
        } catch (e) {
            console.warn("Sign addImage fallback:", e);
        }
    }

    doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(0, 0, 0);
    doc.text("Authorised Signatory", 148, bankY + 40);
}

export async function generateNativeInvoicePdf(invoice, company = {}, fileName = 'Invoice', customColor = null) {
    if (!invoice) throw new Error('Invoice data required');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const rawUser = typeof window !== 'undefined' ? (localStorage.getItem('user') || '') : '';
    const isRobotriq = Boolean(
        company?.name?.toLowerCase().includes('robotriq') ||
        company?.email?.toLowerCase().includes('robotriq') ||
        rawUser.toLowerCase().includes('robotriq') ||
        (invoices[0]?.invoiceNumber && invoices[0].invoiceNumber.startsWith('ROB'))
    );
    const isSkite = !isRobotriq && (company?.name?.toLowerCase().includes('skite') || company?.email?.toLowerCase().includes('skite'));

    const activeLogo = isRobotriq 
        ? (company?.logo || null) 
        : ((isSkite && !company?.logo) ? defaultLogo : (company?.logo || defaultLogo));

    const activeSign = isRobotriq 
        ? (company?.sign || defaultRobotriqSign) 
        : ((isSkite && !company?.sign) ? defaultSign : (company?.sign || defaultSign));

    const activeSeal = isRobotriq 
        ? (company?.seal || defaultRobotriqSeal) 
        : ((isSkite && !company?.seal) ? defaultSeal : (company?.seal || defaultSeal));

    const [logoObj, signObj, sealObj] = await Promise.all([
        getOptimizedImage(activeLogo, 450, 240, 0.8),
        getOptimizedImage(activeSign, 400, 180, 0.8),
        getOptimizedImage(activeSeal, 400, 400, 0.8)
    ]);

    renderInvoicePage(doc, invoice, company, { logoObj, signObj, sealObj }, customColor);

    const safeName = (fileName || 'Invoice').replace(/[\/\\]/g, '-');
    doc.save(`${safeName}.pdf`);
    return true;
}

/**
 * Universal PDF exporter: prefers crisp native vector export for invoices,
 * with clean HTML capture fallback for custom non-standard templates.
 */
export async function generateSingleInvoicePdf(elementOrInvoice, fileName = 'Invoice', company = {}) {
    // If an invoice object is directly passed, use the native vector generator!
    if (elementOrInvoice && (elementOrInvoice.items || elementOrInvoice.invoiceNumber || elementOrInvoice.invoiceNo)) {
        return generateNativeInvoicePdf(elementOrInvoice, company, fileName);
    }

    // Fallback: HTMLElement capture with clean borders & compression
    const element = elementOrInvoice;
    if (!element) {
        throw new Error('Element or invoice not found for PDF generation');
    }

    const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.82);
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const marginX = 10;
    const marginTop = 10;
    const printableWidth = pdfWidth - (marginX * 2);
    const ratio = printableWidth / canvas.width;
    const computedHeight = canvas.height * ratio;

    pdf.addImage(imgData, 'JPEG', marginX, marginTop, printableWidth, Math.min(computedHeight, pdfHeight - 20), undefined, 'FAST');
    pdf.save(`${(fileName || 'Invoice').replace(/[\/\\]/g, '-')}.pdf`);
    return true;
}

/**
 * Batch multi-page PDF generation: compiles all invoices into ONE single combined PDF.
 */
export async function generateBatchInvoicesPdf(invoices, bundleName = 'Invoices_Batch_Export', onProgress = null, company = {}, customColor = null) {
    if (!invoices || invoices.length === 0) {
        throw new Error('No invoices provided');
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    const rawUser = typeof window !== 'undefined' ? (localStorage.getItem('user') || '') : '';
    const isRobotriq = Boolean(
        company?.name?.toLowerCase().includes('robotriq') ||
        company?.email?.toLowerCase().includes('robotriq') ||
        rawUser.toLowerCase().includes('robotriq') ||
        (invoices[0]?.invoiceNumber && invoices[0].invoiceNumber.startsWith('ROB'))
    );
    const isSkite = !isRobotriq && (company?.name?.toLowerCase().includes('skite') || company?.email?.toLowerCase().includes('skite'));

    const activeLogo = isRobotriq 
        ? (company?.logo || null) 
        : ((isSkite && !company?.logo) ? defaultLogo : (company?.logo || defaultLogo));

    const activeSign = isRobotriq 
        ? (company?.sign || defaultRobotriqSign) 
        : ((isSkite && !company?.sign) ? defaultSign : (company?.sign || defaultSign));

    const activeSeal = isRobotriq 
        ? (company?.seal || defaultRobotriqSeal) 
        : ((isSkite && !company?.seal) ? defaultSeal : (company?.seal || defaultSeal));

    // Pre-optimize brand assets once for blazing speed and minimal memory
    const [logoObj, signObj, sealObj] = await Promise.all([
        getOptimizedImage(activeLogo, 450, 240, 0.8),
        getOptimizedImage(activeSign, 400, 180, 0.8),
        getOptimizedImage(activeSeal, 400, 400, 0.8)
    ]);
    const assets = { logoObj, signObj, sealObj };

    let renderedCount = 0;
    for (let i = 0; i < invoices.length; i++) {
        const inv = invoices[i];
        if (inv && (inv.items || inv.invoiceNumber || inv.invoiceNo)) {
            if (renderedCount > 0) {
                doc.addPage('a4', 'portrait');
            }
            renderInvoicePage(doc, inv, company, assets, customColor);
            renderedCount++;
        }
        if (onProgress) {
            onProgress(i + 1, invoices.length);
        }
        // Yield to browser UI event loop periodically so progress updates smoothly
        if (i % 4 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    if (renderedCount === 0) {
        throw new Error('No valid invoice records found to export');
    }

    const safeName = (bundleName || 'Invoices_Combined').replace(/[\/\\]/g, '-');
    doc.save(`${safeName}.pdf`);
    return true;
}
