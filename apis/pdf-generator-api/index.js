/**
 * PDF Generator API
 * POST /generate     { html, options? }     → PDF buffer
 * POST /from-url     { url, options? }      → PDF buffer
 * POST /invoice      { invoice_data }       → PDF buffer (pre-built template)
 * GET  /health
 * 
 * Uses Puppeteer for high-quality HTML → PDF rendering.
 */
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3006;
const API_KEY = process.env.API_KEY || 'test-key';

// API key middleware
app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Default PDF options
const DEFAULT_PDF_OPTIONS = {
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
};

function parsePdfOptions(options = {}) {
    return {
        format: options.format || 'A4',
        printBackground: options.print_background !== false,
        landscape: options.landscape === true,
        margin: {
            top: options.margin_top || '20mm',
            bottom: options.margin_bottom || '20mm',
            left: options.margin_left || '15mm',
            right: options.margin_right || '15mm'
        },
        displayHeaderFooter: !!options.header || !!options.footer,
        headerTemplate: options.header || '',
        footerTemplate: options.footer || ''
    };
}

// Generate PDF from raw HTML
app.post('/generate', async (req, res) => {
    const { html, options } = req.body;
    if (!html) return res.status(400).json({ error: 'html is required' });

    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

        const pdfOptions = parsePdfOptions(options);
        const pdf = await page.pdf(pdfOptions);
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
        res.send(pdf);
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

// Generate PDF from URL
app.post('/from-url', async (req, res) => {
    const { url, options } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    let browser;
    try {
        new URL(url); // Validate URL

        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const pdfOptions = parsePdfOptions(options);
        const pdf = await page.pdf(pdfOptions);
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="page.pdf"');
        res.send(pdf);
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

// Generate Invoice PDF from structured data
app.post('/invoice', async (req, res) => {
    const { invoice } = req.body;
    if (!invoice) return res.status(400).json({ error: 'invoice object is required' });

    const {
        number = 'INV-001',
        date = new Date().toISOString().split('T')[0],
        due_date,
        from = {},
        to = {},
        items = [],
        currency = 'USD',
        notes = '',
        tax_rate = 0
    } = invoice;

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * (tax_rate / 100);
    const total = subtotal + tax;

    const currencySymbol = { USD: '$', EUR: '€', GBP: '£', BRL: 'R$' }[currency] || currency;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #333; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
            .invoice-title { font-size: 36px; font-weight: 700; color: #2563eb; }
            .invoice-meta { text-align: right; color: #666; }
            .invoice-meta p { margin: 4px 0; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .party { width: 45%; }
            .party-label { font-size: 12px; text-transform: uppercase; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
            .party-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
            .party-detail { color: #666; font-size: 14px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f8fafc; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; }
            td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
            .text-right { text-align: right; }
            .totals { display: flex; justify-content: flex-end; }
            .totals-table { width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.total { border-top: 2px solid #2563eb; font-size: 20px; font-weight: 700; color: #2563eb; padding-top: 12px; margin-top: 4px; }
            .notes { margin-top: 40px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #666; }
            .notes-label { font-weight: 600; margin-bottom: 4px; color: #333; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-meta">
                <p><strong>#${number}</strong></p>
                <p>Date: ${date}</p>
                ${due_date ? `<p>Due: ${due_date}</p>` : ''}
            </div>
        </div>
        <div class="parties">
            <div class="party">
                <div class="party-label">From</div>
                <div class="party-name">${from.name || 'Your Company'}</div>
                <div class="party-detail">${from.email || ''}</div>
                <div class="party-detail">${from.address || ''}</div>
            </div>
            <div class="party">
                <div class="party-label">Bill To</div>
                <div class="party-name">${to.name || 'Client'}</div>
                <div class="party-detail">${to.email || ''}</div>
                <div class="party-detail">${to.address || ''}</div>
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td>${item.description || ''}</td>
                        <td class="text-right">${item.quantity || 1}</td>
                        <td class="text-right">${currencySymbol}${(item.price || 0).toFixed(2)}</td>
                        <td class="text-right">${currencySymbol}${((item.quantity || 1) * (item.price || 0)).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="totals">
            <div class="totals-table">
                <div class="totals-row"><span>Subtotal</span><span>${currencySymbol}${subtotal.toFixed(2)}</span></div>
                ${tax_rate > 0 ? `<div class="totals-row"><span>Tax (${tax_rate}%)</span><span>${currencySymbol}${tax.toFixed(2)}</span></div>` : ''}
                <div class="totals-row total"><span>Total</span><span>${currencySymbol}${total.toFixed(2)}</span></div>
            </div>
        </div>
        ${notes ? `<div class="notes"><div class="notes-label">Notes</div>${notes}</div>` : ''}
    </body>
    </html>`;

    let browser;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice_${number}.pdf"`);
        res.send(pdf);
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`PDF Generator API running on port ${PORT}`));
