import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function renderRobotriqPdf(content, orientation, scale) {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, { position: 'fixed', top: '0', left: '-10000px' });
    document.body.append(host);
    const root = createRoot(host);

    try {
        flushSync(() => root.render(content));
        await Promise.all([...host.querySelectorAll('img')].map(image => image.decode()));
        await document.fonts.ready;
        const canvas = await html2canvas(host.firstElementChild, {
            scale, backgroundColor: '#fff', useCORS: true, logging: false
        });
        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
        const width = canvas.width * ratio;
        pdf.addImage(canvas, 'PNG', (pageWidth - width) / 2, 0, width, canvas.height * ratio, undefined, 'FAST');
        return pdf;
    } finally {
        root.unmount();
        host.remove();
    }
}
