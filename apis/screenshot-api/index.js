/**
 * Screenshot API
 * POST /screenshot { url } → returns PNG buffer
 * GET  /health
 */
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'test-key';

// Simple API key middleware
app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.post('/screenshot', async (req, res) => {
    const { url, width = 1280, height = 800, fullPage = false, format = 'png' } = req.body;

    if (!url) return res.status(400).json({ error: 'url is required' });

    let browser;
    try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: parseInt(width), height: parseInt(height) });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const screenshot = await page.screenshot({ fullPage, type: format });
        await browser.close();

        res.setHeader('Content-Type', `image/${format}`);
        res.send(screenshot);
    } catch (err) {
        if (browser) await browser.close();
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Screenshot API running on port ${PORT}`));
