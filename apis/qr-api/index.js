/**
 * QR Code Generator API
 * GET  /qr?text=...&size=300&format=png
 * POST /qr { text, size, format, color, bg }
 */
const express = require('express');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'test-key';

app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

async function generateQR(text, options = {}) {
    const { size = 300, color = '#000000', bg = '#ffffff', format = 'png' } = options;

    const opts = {
        width: parseInt(size),
        color: { dark: color, light: bg },
        type: format === 'svg' ? 'svg' : 'png',
    };

    if (format === 'svg') return await QRCode.toString(text, { ...opts, type: 'svg' });
    return await QRCode.toBuffer(text, opts);
}

app.get('/qr', async (req, res) => {
    const { text, size, color, bg, format = 'png' } = req.query;
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
        const result = await generateQR(text, { size, color, bg, format });
        if (format === 'svg') {
            res.setHeader('Content-Type', 'image/svg+xml');
            return res.send(result);
        }
        res.setHeader('Content-Type', 'image/png');
        res.send(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/qr', async (req, res) => {
    const { text, size, color, bg, format = 'png' } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    try {
        const result = await generateQR(text, { size, color, bg, format });
        if (format === 'svg') {
            res.setHeader('Content-Type', 'image/svg+xml');
            return res.send(result);
        }
        res.setHeader('Content-Type', 'image/png');
        res.send(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`QR Code API running on port ${PORT}`));
