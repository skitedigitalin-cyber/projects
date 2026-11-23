import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import defaultLogo from '../assets/skite-logo.jpg';
import defaultSign from '../assets/Sign.jpg';
import defaultSeal from '../assets/seal.png';

/**
 * Optimizes an image (DataURL, URL, or asset import) for PDF generation.
 */
const getOptimizedImage = (imgSrc, maxWidth = 500, maxHeight = 300, quality = 0.82) => new Promise((resolve) => {
    if (!imgSrc) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
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
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
            console.warn('Canvas export failed, using raw source', e);
            resolve(imgSrc);
        }
    };
    img.onerror = () => resolve(null);
    img.src = imgSrc;
});

function hexToRgb(hex) {
    if (!hex) return [255, 69, 0];
    let cleaned = hex.replace('#', '').trim();
    if (cleaned.length === 3) {
        cleaned = cleaned.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleaned, 16);
    return [
        (num >> 16) & 255,
        (num >> 8) & 255,
        num & 255
    ];
}

// Convert amount number to Indian words
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

/**
 * Generates an official, high-resolution vector PDF Payment Receipt
 * @param {Object} payment Payment details object
 * @param {Object} company Company branding details
 * @param {string} fileName Download filename
 * @param {string} customColor Primary accent hex color
 */
export async function generatePaymentReceiptPdf(payment, company = {}, fileName = 'Payment_Receipt', customColor = null) {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
        compress: true
    });

    const activeHexColor = customColor || company?.invoiceColor || '#FF4500';
    const primaryColor = hexToRgb(activeHexColor);

    // Customer or Party details
    const customer = payment.customerId || {};
    const clientName = customer.companyName || customer.customerName || (typeof payment.customerId === 'string' ? payment.customerId : 'Valued Client');
    const clientAddress = customer.billingAddress || customer.address || '';
    const clientPhone = customer.phone || '';
    const clientEmail = customer.email || '';
    const clientGst = customer.gstNumber || '';

    // Receipt details
    const receiptNo = payment.receiptNumber || payment.paymentId || 'RCP-0001';
    const rawDate = payment.receiptDate || payment.paymentDate || payment.createdAt;
    const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const amountVal = Number(payment.amount || 0);
    const inr = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Company assets
    const isSkite = company.workspaceBrand === 'skite';
    const companyName = company.name || (isSkite ? 'SKITE' : 'Company');
    const activeLogo = await getOptimizedImage(company.logo || (isSkite ? defaultLogo : null));
    const activeSeal = await getOptimizedImage(company.seal || (isSkite ? defaultSeal : null));
    const activeSign = await getOptimizedImage(company.sign || (isSkite ? defaultSign : null));

    // Page Margins & Dimensions
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 40;

    // Top Accent Border
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // 1. Header: Logo & Company Info (Left), Title & Receipt Metadata (Right)
    if (activeLogo) {
        try {
            doc.addImage(activeLogo, 'JPEG', margin, currentY, 110, 45, undefined, 'FAST');
            currentY += 52;
        } catch (e) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(companyName.toUpperCase(), margin, currentY + 14);
            currentY += 28;
        }
    } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(companyName.toUpperCase(), margin, currentY + 14);
        currentY += 28;
    }

    // Company Address Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    const compAddress = company.address || 'Corporate Office';
    const addressLines = doc.splitTextToSize(compAddress, 250);
    doc.text(addressLines, margin, currentY);
    currentY += addressLines.length * 11;

    if (company.gstNumber) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${company.gstNumber}`, margin, currentY);
        currentY += 12;
    }
    if (company.email || company.phone) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Phone: ${company.phone || ''}  |  Email: ${company.email || ''}`, margin, currentY);
        currentY += 16;
    }

    // Right Side: Title "PAYMENT RECEIPT" & Metadata
    const rightX = pageWidth - margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('PAYMENT RECEIPT', rightX, 55, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`RECEIPT NO: ${receiptNo}`, rightX, 75, { align: 'right' });
    doc.text(`DATE: ${formattedDate}`, rightX, 89, { align: 'right' });
    if (payment.paymentId && payment.paymentId !== receiptNo) {
        doc.text(`TRACKING ID: ${payment.paymentId}`, rightX, 103, { align: 'right' });
    }

    // Status Pill
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(rightX - 70, 112, 70, 18, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text('PAID / RECEIVED', rightX - 35, 124, { align: 'center' });

    // Divider Line
    currentY = Math.max(currentY + 5, 140);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(1);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 16;

    // 2. "Received From" Box & Payer Details
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 65, 6, 6, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 65, 6, 6, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RECEIVED WITH THANKS FROM:', margin + 14, currentY + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(clientName, margin + 14, currentY + 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const clientDetailsStr = [
        clientAddress,
        clientPhone ? `Phone: ${clientPhone}` : '',
        clientGst ? `GSTIN: ${clientGst}` : ''
    ].filter(Boolean).join('  |  ');
    doc.text(doc.splitTextToSize(clientDetailsStr, pageWidth - (margin * 2) - 28), margin + 14, currentY + 46);

    currentY += 80;

    // 3. Amount Display Box (Highlight)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 48, 6, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('AMOUNT RECEIVED', margin + 16, currentY + 20);

    doc.setFontSize(18);
    doc.text(`INR  ${inr(amountVal)}`, rightX - 16, currentY + 32, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('(Official Receipt)', margin + 16, currentY + 34);

    currentY += 56;

    // Amount in Words
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 24, 4, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(`Amount in Words:  ${numberToWords(amountVal)}`, margin + 12, currentY + 16);

    currentY += 34;

    // 4. Payment Breakdown Table using autoTable
    const tableData = [
        ['Payment Method / Mode', payment.paymentMode || 'Bank Transfer'],
        ['Transaction ID / UTR No', payment.transactionId || payment.referenceNumber || 'N/A'],
        ['Payment Category', payment.category || (payment.paymentType === 'Inward' ? 'Customer Payment' : 'Outward Payment')],
        ['Payment Received Date', formattedDate],
        ...(payment.invoiceId?.invoiceNumber ? [['Linked Invoice No', payment.invoiceId.invoiceNumber]] : []),
        ...(payment.notes ? [['Remarks & Notes', payment.notes]] : [])
    ];

    autoTable(doc, {
        startY: currentY,
        head: [['TRANSACTION DETAILS', 'SPECIFICATION']],
        body: tableData,
        theme: 'plain',
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [51, 65, 85],
            fontSize: 9,
            fontStyle: 'bold',
            cellPadding: 8
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 7,
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 180, textColor: [71, 85, 105] },
            1: { cellWidth: 'auto', fontStyle: 'normal' }
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        }
    });

    currentY = doc.lastAutoTable.finalY + 30;

    // 5. Official Seal, Signature & Signatory Block
    const bottomY = Math.max(currentY, 620);

    // Official Seal (Left)
    if (activeSeal) {
        try {
            doc.addImage(activeSeal, 'PNG', margin + 20, bottomY, 60, 60, undefined, 'FAST');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('OFFICIAL SEAL', margin + 50, bottomY + 70, { align: 'center' });
        } catch (e) {
            console.warn('Seal render failed', e);
        }
    }

    // Authorised Signatory (Right)
    const signBoxX = rightX - 160;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`for ${companyName.toUpperCase()}`, rightX, bottomY + 10, { align: 'right' });

    if (activeSign) {
        try {
            doc.addImage(activeSign, 'JPEG', signBoxX, bottomY + 16, 140, 42, undefined, 'FAST');
        } catch (e) {
            console.warn('Sign render failed', e);
        }
    } else {
        doc.setDrawColor(203, 213, 225);
        doc.line(signBoxX, bottomY + 45, rightX, bottomY + 45);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Authorised Signatory', rightX, bottomY + 68, { align: 'right' });

    // Footer notice
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated official payment receipt. No physical signature is required.', pageWidth / 2, 805, { align: 'center' });

    // Download the PDF file
    doc.save(`${fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
}
