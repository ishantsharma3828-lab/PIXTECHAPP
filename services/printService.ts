
/**
 * printService.ts — Thermal (80mm) and A4 PDF printing via window.print()
 */

export interface PrintTicketData {
    ticketNumber: string;
    customerName: string;
    customerPhone?: string;
    deviceType: string;
    brand: string;
    model: string;
    serialNumber?: string;
    problemDescription: string;
    conditionNotes?: string;
    dateIn: string;
    parts?: Array<{ name: string; qty: number; price: number }>;
    laborCost?: number;
    estimatedHours?: number;
    techNotes?: string;
    repairNotes?: string;
    total?: number;
    deposit?: number;
    printType: 'intake' | 'quote' | 'final';
    currencySymbol?: string;
    companyName?: string;
    companyPhone?: string;
}

const fmt = (val: number, sym: string) =>
    sym === 'DA' || sym === 'DZD' ? `${val.toLocaleString()} ${sym}` : `${sym}${val.toLocaleString()}`;

const buildHTML = (data: PrintTicketData, format: 'thermal' | 'a4'): string => {
    const cur = data.currencySymbol || 'DA';
    const co  = data.companyName || 'Service Center';
    const partsRows = (data.parts || []).map(p =>
        `<tr><td>${p.name}</td><td style="text-align:center">×${p.qty}</td><td style="text-align:right">${fmt(p.price * p.qty, cur)}</td></tr>`
    ).join('');
    const laborRow = data.laborCost && data.laborCost > 0
        ? `<tr><td>Labor (${data.estimatedHours || 0}h)</td><td style="text-align:center">×1</td><td style="text-align:right">${fmt(data.laborCost, cur)}</td></tr>`
        : '';
    const total = data.total ?? ((data.parts || []).reduce((s, p) => s + p.price * p.qty, 0) + (data.laborCost || 0));

    const titleMap = { intake: 'INTAKE RECEIPT', quote: 'REPAIR QUOTE', final: 'REPAIR INVOICE' };

    const thermalCSS = `
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; margin: 0; padding: 4mm; }
        h1 { font-size: 14px; text-align: center; margin: 0 0 4px; }
        .center { text-align: center; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        td { padding: 2px 0; }
        .total { font-size: 14px; font-weight: bold; }
        .footer { margin-top: 8px; text-align: center; font-size: 10px; }
    `;
    const a4CSS = `
        body { font-family: Arial, sans-serif; font-size: 13px; margin: 20mm; color: #111; }
        h1 { font-size: 22px; font-weight: bold; margin: 0; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .divider { border-top: 2px solid #000; margin: 12px 0; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th { background: #f0f0f0; padding: 8px; text-align: left; border-bottom: 1px solid #ccc; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .total { font-size: 18px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 11px; color: #555; }
    `;

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>${format === 'thermal' ? thermalCSS : a4CSS}</style></head><body>
    ${format === 'a4' ? `
    <div class="header">
        <div><h1>${co}</h1><p style="margin:4px 0;color:#555">${data.companyPhone || ''}</p></div>
        <div style="text-align:right"><h2 style="margin:0">${titleMap[data.printType]}</h2><p style="margin:4px 0">${data.ticketNumber}</p><p style="margin:4px 0">${new Date(data.dateIn).toLocaleDateString()}</p></div>
    </div>
    <div class="divider"></div>
    <div style="display:flex;gap:40px;margin:12px 0">
        <div><strong>Customer:</strong> ${data.customerName}<br><strong>Phone:</strong> ${data.customerPhone || '—'}</div>
        <div><strong>Device:</strong> ${data.brand} ${data.model}<br><strong>Type:</strong> ${data.deviceType}</div>
        ${data.serialNumber ? `<div><strong>Serial:</strong> ${data.serialNumber}</div>` : ''}
    </div>
    <div class="divider"></div>
    <p><strong>Issue:</strong> ${data.problemDescription}</p>
    ${data.conditionNotes ? `<p><strong>Condition:</strong> ${data.conditionNotes}</p>` : ''}
    ${data.techNotes ? `<p><strong>Diagnosis:</strong> ${data.techNotes}</p>` : ''}
    ${(data.parts && data.parts.length > 0) || data.laborCost ? `
    <table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>
    ${partsRows}${laborRow}
    <tr><td colspan="2" style="text-align:right"><strong>TOTAL</strong></td><td style="text-align:right" class="total">${fmt(total, cur)}</td></tr>
    </tbody></table>` : ''}
    <div class="footer">Thank you for choosing ${co}. Keep this receipt for your records.</div>
    ` : `
    <h1 class="center">${co}</h1>
    <p class="center">${data.companyPhone || ''}</p>
    <div class="divider"></div>
    <p class="center"><strong>${titleMap[data.printType]}</strong></p>
    <p>${data.ticketNumber} | ${new Date(data.dateIn).toLocaleDateString()}</p>
    <div class="divider"></div>
    <p>Customer: ${data.customerName}</p>
    <p>Phone: ${data.customerPhone || '—'}</p>
    <p>Device: ${data.brand} ${data.model}</p>
    <div class="divider"></div>
    <p>Issue: ${data.problemDescription}</p>
    ${data.techNotes ? `<p>Diag: ${data.techNotes}</p>` : ''}
    ${(data.parts && data.parts.length > 0) || data.laborCost ? `
    <div class="divider"></div>
    <table>${partsRows}${laborRow}
    <tr><td colspan="2"><strong>TOTAL</strong></td><td class="total">${fmt(total, cur)}</td></tr>
    </table>` : ''}
    <div class="divider"></div>
    <p class="footer center">Thank you!</p>
    `}
    </body></html>`;
};

export const printTicket = (data: PrintTicketData, format: 'thermal' | 'a4' = 'a4'): void => {
    const html = buildHTML(data, format);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = format === 'thermal' ? '80mm' : '210mm';
    iframe.style.height = '297mm';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
};
