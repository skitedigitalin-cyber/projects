import { jsPDF } from 'jspdf';
import logo from '../assets/robotriq-receipt-logo.png';
import seal from '../assets/robotriq-receipt-seal.png';
import director from '../assets/robotriq-receipt-sign.png';
import head from '../assets/robotriq-certificate-sign.png';
import badge from '../assets/robotriq-certificate-badge.png';

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

function place(doc, image, x, y, width, height) {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    doc.addImage(image, 'PNG', x, y, image.naturalWidth * scale, image.naturalHeight * scale, undefined, 'FAST');
}

function fit(doc, value, width, size) {
    doc.setFontSize(size);
    const scale = Math.min(1, width / (doc.getTextWidth(value) || 1));
    doc.setFontSize(size * scale);
    return value;
}

export async function robotriqCertificatePdf(record) {
    const [logoImage, sealImage, directorSign, headSign, badgeImage] =
        await Promise.all([logo, seal, director, head, badge].map(loadImage));
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(2);
    doc.rect(4, 4, 289, 202);
    place(doc, logoImage, 21, 17, 70, 13);
    place(doc, badgeImage, 234, 5, 40, 56);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(fit(doc, `Certificate UID: ${record.uid || '—'}`, 55, 10), 253, 68, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Issue date: ${record.date?.split('-').reverse().join('-') || '—'}`, 253, 74, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(43);
    doc.text('CERTIFICATE', 21, 59);
    doc.setFontSize(27);
    doc.text('OF ACHIEVEMENT', 21, 72);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(16);
    doc.text('This certificate is proudly presented to', 21, 87);
    doc.setFont('helvetica', 'bold');
    doc.text(fit(doc, (record.studentName || 'Student name').toUpperCase(), 246, 36), 21, 108);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.7);
    doc.line(21, 115, 152, 115);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const description = `Completed a ${record.courseName || 'training course'} training that combines theory and real-time application to prepare you for roles in automation and control systems.`;
    const lines = doc.splitTextToSize(description, 253);
    doc.text(lines, 21, 125);
    const detailsY = 125 + lines.length * 5;
    doc.text(fit(doc, `Brand: ${record.brand || '—'}`, 252, 11), 21, detailsY);
    doc.text(fit(doc, `Products: ${record.products || '—'}`, 252, 11), 21, detailsY + 6);
    place(doc, sealImage, 132, 166, 32, 30);
    for (const [image, x, name, role] of [[headSign, 21, 'Prakash', 'AUTOMATION HEAD'],
        [directorSign, 216, 'Prabhakaran', 'TECHNICAL DIRECTOR']]) {
        place(doc, image, x, 166, 56, 17);
        doc.line(x, 184, x + 55, 184);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(name, x, 190);
        doc.setFontSize(9);
        doc.text(role, x, 195);
    }
    return doc;
}
