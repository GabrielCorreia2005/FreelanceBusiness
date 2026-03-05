/**
 * Web Scraper API
 * POST /scrape        { url, selector?, extract? }    → { title, text, links, images, data }
 * POST /scrape/batch  { urls[], selector? }            → [results]
 * POST /extract       { url, fields: {name: selector} } → structured data extraction
 * GET  /health
 *
 * Uses native https module — no external dependencies.
 * Parses HTML with regex + simple DOM-like patterns.
 * Note: For JavaScript-heavy SPAs, recommend Puppeteer upgrade.
 */
const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3009;
const API_KEY = process.env.API_KEY || 'test-key';

app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ─── HTTP Fetcher ─────────────────────────────────────────────────────────────
function fetchUrl(rawUrl, timeout = 10000) {
    return new Promise((resolve, reject) => {
        try {
            const parsed = new URL(rawUrl);
            const lib = parsed.protocol === 'https:' ? https : http;

            const options = {
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
                path: parsed.pathname + parsed.search,
                method: 'GET',
                rejectUnauthorized: false,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; WebScraperAPI/1.0)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'identity'
                },
                timeout
            };

            const req = lib.request(options, (resp) => {
                // Handle redirects
                if ([301, 302, 303, 307, 308].includes(resp.statusCode) && resp.headers.location) {
                    const redirectUrl = new URL(resp.headers.location, rawUrl).href;
                    return fetchUrl(redirectUrl, timeout).then(resolve).catch(reject);
                }

                let data = '';
                resp.on('data', chunk => { data += chunk; });
                resp.on('end', () => resolve({
                    html: data,
                    statusCode: resp.statusCode,
                    contentType: resp.headers['content-type'] || '',
                    finalUrl: rawUrl
                }));
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
            req.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ─── HTML Parsers ─────────────────────────────────────────────────────────────
function getTitle(html) {
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return m ? m[1].replace(/<[^>]*>/g, '').trim() : '';
}

function getMetaDescription(html) {
    const m = html.match(/<meta\s+(?:[^>]*\s+)?name=["']description["']\s+content=["']([^"']*)/i)
        || html.match(/<meta\s+content=["']([^"']*?)["']\s+name=["']description["']/i);
    return m ? m[1].trim() : '';
}

function extractText(html) {
    // Remove scripts, styles, SVG, comments
    let text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<svg[\s\S]*?<\/svg>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
    return text.slice(0, 5000); // First 5000 chars
}

function extractLinks(html, baseUrl) {
    const links = [];
    const regex = /<a\s+(?:[^>]*?\s+)?href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seen = new Set();

    while ((match = regex.exec(html)) !== null && links.length < 50) {
        try {
            const href = new URL(match[1], baseUrl).href;
            const text = match[2].replace(/<[^>]*>/g, '').trim().slice(0, 100);
            if (!seen.has(href)) {
                seen.add(href);
                links.push({ href, text });
            }
        } catch { }
    }
    return links;
}

function extractImages(html, baseUrl) {
    const images = [];
    const regex = /<img\s+(?:[^>]*?\s+)?src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
    let match;
    const seen = new Set();

    while ((match = regex.exec(html)) !== null && images.length < 20) {
        try {
            const src = new URL(match[1], baseUrl).href;
            const alt = match[2] || '';
            if (!seen.has(src)) {
                seen.add(src);
                images.push({ src, alt });
            }
        } catch { }
    }
    return images;
}

function extractBySelector(html, selector) {
    // Simple CSS selector support: tag, .class, #id, tag.class
    let pattern;

    if (selector.startsWith('#')) {
        const id = selector.slice(1);
        pattern = new RegExp(`<[^>]+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/`, 'i');
    } else if (selector.startsWith('.')) {
        const cls = selector.slice(1);
        pattern = new RegExp(`<[^>]+class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'gi');
    } else {
        pattern = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'gi');
    }

    const results = [];
    let match;
    while ((match = pattern.exec(html)) !== null && results.length < 10) {
        const text = match[1].replace(/<[^>]*>/g, '').trim();
        if (text) results.push(text);
    }
    return results;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post('/scrape', async (req, res) => {
    try {
        const { url, selector, extract = ['title', 'text', 'links', 'images', 'meta'] } = req.body;
        if (!url) return res.status(400).json({ error: 'url is required' });

        new URL(url); // validate
        const { html, statusCode, contentType, finalUrl } = await fetchUrl(url);

        if (statusCode >= 400) {
            return res.status(422).json({ error: `Page returned HTTP ${statusCode}`, url });
        }

        const result = { url: finalUrl, status_code: statusCode };

        if (extract.includes('title')) result.title = getTitle(html);
        if (extract.includes('meta')) result.description = getMetaDescription(html);
        if (extract.includes('text')) result.text = extractText(html);
        if (extract.includes('links')) result.links = extractLinks(html, url);
        if (extract.includes('images')) result.images = extractImages(html, url);
        if (selector) result.selected = extractBySelector(html, selector);

        res.json({ ...result, scraped_at: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message, url: req.body.url });
    }
});

app.post('/scrape/batch', async (req, res) => {
    try {
        const { urls, selector } = req.body;
        if (!Array.isArray(urls)) return res.status(400).json({ error: 'urls array is required' });
        if (urls.length > 10) return res.status(400).json({ error: 'Max 10 URLs per batch' });

        const results = await Promise.allSettled(
            urls.map(url => fetchUrl(url).then(({ html, statusCode, finalUrl }) => ({
                url: finalUrl,
                status_code: statusCode,
                title: getTitle(html),
                text: extractText(html).slice(0, 500),
                links_count: extractLinks(html, url).length,
                selected: selector ? extractBySelector(html, selector) : undefined
            })))
        );

        res.json({
            results: results.map((r, i) => r.status === 'fulfilled'
                ? r.value
                : { url: urls[i], error: r.reason?.message }),
            total: results.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/extract', async (req, res) => {
    try {
        const { url, fields } = req.body;
        if (!url) return res.status(400).json({ error: 'url is required' });
        if (!fields || typeof fields !== 'object') return res.status(400).json({ error: 'fields object is required' });

        new URL(url);
        const { html, statusCode } = await fetchUrl(url);

        if (statusCode >= 400) {
            return res.status(422).json({ error: `Page returned HTTP ${statusCode}` });
        }

        const extracted = {};
        for (const [fieldName, selector] of Object.entries(fields)) {
            extracted[fieldName] = extractBySelector(html, selector);
        }

        res.json({
            url,
            data: extracted,
            title: getTitle(html),
            scraped_at: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Web Scraper API running on port ${PORT}`));
