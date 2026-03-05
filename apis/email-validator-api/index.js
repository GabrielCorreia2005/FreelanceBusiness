/**
 * Email Validator API
 * POST /validate { email } → { valid, reason, disposable, mx }
 * GET  /validate?email=...
 */
const express = require('express');
const dns = require('dns').promises;

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const API_KEY = process.env.API_KEY || 'test-key';

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
    'yopmail.com', '10minutemail.com', 'trashmail.com', 'sharklasers.com',
    'guerrillamailblock.com', 'grr.la', 'guerrillamail.info', 'gurrillamail.biz',
    'spam4.me', 'maildrop.cc', 'dispostable.com', 'fakeinbox.com'
]);

app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

async function validateEmail(email) {
    const result = { email, valid: false, reason: null, disposable: false, mx: false, format: false };

    // 1. Format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        result.reason = 'Invalid email format';
        return result;
    }
    result.format = true;

    const domain = email.split('@')[1].toLowerCase();

    // 2. Disposable check
    result.disposable = DISPOSABLE_DOMAINS.has(domain);
    if (result.disposable) {
        result.reason = 'Disposable email address';
        return result;
    }

    // 3. MX record check
    try {
        const mxRecords = await dns.resolveMx(domain);
        result.mx = mxRecords && mxRecords.length > 0;
    } catch {
        result.mx = false;
        result.reason = 'Domain has no MX records';
        return result;
    }

    result.valid = result.format && result.mx && !result.disposable;
    result.reason = result.valid ? 'Valid email' : result.reason;
    return result;
}

app.get('/validate', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email parameter required' });
    try {
        res.json(await validateEmail(email));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/validate', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    try {
        res.json(await validateEmail(email));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk validate
app.post('/validate/bulk', async (req, res) => {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) return res.status(400).json({ error: 'emails array required' });
    if (emails.length > 100) return res.status(400).json({ error: 'Max 100 emails per request' });
    try {
        const results = await Promise.all(emails.map(validateEmail));
        res.json({ results, total: results.length, valid: results.filter(r => r.valid).length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Email Validator API running on port ${PORT}`));
