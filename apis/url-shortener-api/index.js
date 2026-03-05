/**
 * URL Shortener API
 * POST /shorten { url, custom_code? } → { short_url, code, original_url }
 * GET  /:code → 302 redirect to original URL
 * GET  /stats/:code → { clicks, created_at, original_url, referrers }
 * GET  /health
 */
const express = require('express');
const { nanoid } = require('nanoid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3004;
const API_KEY = process.env.API_KEY || 'test-key';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// In-memory store (use Redis/DB in production)
const urls = new Map();

// API key middleware — skip for redirects and health
app.use((req, res, next) => {
    if (req.path === '/health') return next();
    // Allow redirects without API key (public short URLs)
    if (req.method === 'GET' && req.path.length > 1 && !req.path.startsWith('/stats') && !req.path.startsWith('/shorten')) {
        return next();
    }
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({
    status: 'ok',
    version: '1.0.0',
    total_urls: urls.size
}));

// Shorten URL
app.post('/shorten', (req, res) => {
    try {
        const { url, custom_code, expires_in } = req.body;

        if (!url) return res.status(400).json({ error: 'url is required' });

        // Validate URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Generate or use custom code
        let code = custom_code || nanoid(7);

        // Check if custom code is taken
        if (custom_code && urls.has(custom_code)) {
            return res.status(409).json({ error: 'Custom code already in use' });
        }

        // Calculate expiry
        let expires_at = null;
        if (expires_in) {
            expires_at = Date.now() + (parseInt(expires_in) * 1000);
        }

        const entry = {
            original_url: url,
            code,
            created_at: new Date().toISOString(),
            expires_at: expires_at ? new Date(expires_at).toISOString() : null,
            clicks: 0,
            click_log: []
        };

        urls.set(code, entry);

        res.status(201).json({
            short_url: `${BASE_URL}/${code}`,
            code,
            original_url: url,
            created_at: entry.created_at,
            expires_at: entry.expires_at
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bulk shorten
app.post('/shorten/bulk', (req, res) => {
    try {
        const { urls: urlList } = req.body;
        if (!urlList || !Array.isArray(urlList)) {
            return res.status(400).json({ error: 'urls array is required' });
        }
        if (urlList.length > 50) {
            return res.status(400).json({ error: 'Max 50 URLs per request' });
        }

        const results = urlList.map(url => {
            try {
                new URL(url);
                const code = nanoid(7);
                const entry = {
                    original_url: url,
                    code,
                    created_at: new Date().toISOString(),
                    expires_at: null,
                    clicks: 0,
                    click_log: []
                };
                urls.set(code, entry);
                return {
                    short_url: `${BASE_URL}/${code}`,
                    code,
                    original_url: url
                };
            } catch {
                return { original_url: url, error: 'Invalid URL' };
            }
        });

        res.status(201).json({ results, total: results.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get stats for a short URL
app.get('/stats/:code', (req, res) => {
    const entry = urls.get(req.params.code);
    if (!entry) return res.status(404).json({ error: 'Short URL not found' });

    // Aggregate referrers
    const referrers = {};
    entry.click_log.forEach(click => {
        const ref = click.referrer || 'direct';
        referrers[ref] = (referrers[ref] || 0) + 1;
    });

    res.json({
        code: entry.code,
        original_url: entry.original_url,
        short_url: `${BASE_URL}/${entry.code}`,
        created_at: entry.created_at,
        expires_at: entry.expires_at,
        clicks: entry.clicks,
        referrers,
        recent_clicks: entry.click_log.slice(-10)
    });
});

// Redirect (this must be last to avoid catching other routes)
app.get('/:code', (req, res) => {
    const code = req.params.code;

    // Skip known routes
    if (['health', 'stats', 'shorten'].includes(code)) return res.status(404).end();

    const entry = urls.get(code);
    if (!entry) return res.status(404).json({ error: 'Short URL not found' });

    // Check expiry
    if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
        urls.delete(code);
        return res.status(410).json({ error: 'This short URL has expired' });
    }

    // Track click
    entry.clicks++;
    entry.click_log.push({
        timestamp: new Date().toISOString(),
        user_agent: req.headers['user-agent'] || 'unknown',
        referrer: req.headers['referer'] || 'direct',
        ip: req.ip
    });

    // Keep only last 100 clicks in log
    if (entry.click_log.length > 100) {
        entry.click_log = entry.click_log.slice(-100);
    }

    res.redirect(302, entry.original_url);
});

app.listen(PORT, () => console.log(`URL Shortener API running on port ${PORT}`));
