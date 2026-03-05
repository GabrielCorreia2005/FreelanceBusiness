/**
 * Currency Converter API
 * GET  /convert?from=USD&to=EUR&amount=100   → { result, rate, from, to }
 * GET  /rates?base=USD                       → { base, rates: {...} }
 * POST /convert/batch { conversions: [] }    → bulk conversion
 * GET  /currencies                           → list of supported currencies
 * GET  /health
 *
 * Uses exchangerate-api.com free tier (no API key for basic) + in-memory cache.
 * Falls back to offline static rates if external API is unavailable.
 */
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3008;
const API_KEY = process.env.API_KEY || 'test-key';
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY || '';

app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ─── Static fallback rates (USD base, updated 2024) ──────────────────────────
const STATIC_RATES_USD = {
    USD: 1, EUR: 0.919, GBP: 0.787, JPY: 149.5, AUD: 1.515, CAD: 1.355,
    CHF: 0.896, CNY: 7.238, HKD: 7.822, NOK: 10.55, NZD: 1.628, SEK: 10.38,
    SGD: 1.343, DKK: 6.883, MXN: 17.15, ZAR: 18.63, BRL: 4.975, INR: 83.12,
    KRW: 1325, RUB: 90.5, TRY: 30.65, PLN: 4.055, THB: 35.12, IDR: 15680,
    HUF: 355.8, CZK: 22.89, ILS: 3.712, CLP: 954.2, PHP: 56.37, AED: 3.672,
    SAR: 3.751, MYR: 4.715, RON: 4.583, NGN: 1540, PKR: 279.5, UAH: 37.8,
    VND: 24875, BDT: 109.9, EGP: 30.85, TWD: 31.98, ARS: 825.5
};

const CURRENCY_NAMES = {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', JPY: 'Japanese Yen',
    AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc',
    CNY: 'Chinese Yuan', HKD: 'Hong Kong Dollar', NOK: 'Norwegian Krone',
    NZD: 'New Zealand Dollar', SEK: 'Swedish Krona', SGD: 'Singapore Dollar',
    DKK: 'Danish Krone', MXN: 'Mexican Peso', ZAR: 'South African Rand',
    BRL: 'Brazilian Real', INR: 'Indian Rupee', KRW: 'South Korean Won',
    RUB: 'Russian Ruble', TRY: 'Turkish Lira', PLN: 'Polish Zloty',
    THB: 'Thai Baht', IDR: 'Indonesian Rupiah', HUF: 'Hungarian Forint',
    CZK: 'Czech Koruna', ILS: 'Israeli Shekel', CLP: 'Chilean Peso',
    PHP: 'Philippine Peso', AED: 'UAE Dirham', SAR: 'Saudi Riyal',
    MYR: 'Malaysian Ringgit', RON: 'Romanian Leu', NGN: 'Nigerian Naira',
    PKR: 'Pakistani Rupee', UAH: 'Ukrainian Hryvnia', VND: 'Vietnamese Dong',
    BDT: 'Bangladeshi Taka', EGP: 'Egyptian Pound', TWD: 'Taiwan Dollar',
    ARS: 'Argentine Peso'
};

// ─── Cache ────────────────────────────────────────────────────────────────────
let ratesCache = { data: null, timestamp: 0, base: 'USD' };
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function fetchLiveRates(base = 'USD') {
    try {
        // Try exchangerate-api free tier
        const url = EXCHANGE_API_KEY
            ? `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/${base}`
            : `https://open.er-api.com/v6/latest/${base}`;

        const resp = await fetch(url, { timeout: 5000 });
        if (!resp.ok) throw new Error('API error');
        const data = await resp.json();

        const rates = data.rates || data.conversion_rates;
        if (rates) {
            ratesCache = { data: rates, timestamp: Date.now(), base };
            return rates;
        }
        throw new Error('Invalid response');
    } catch {
        // Fall back to static rates (converted to correct base)
        return convertStaticRates(base);
    }
}

function convertStaticRates(base) {
    if (base === 'USD') return STATIC_RATES_USD;
    const baseRate = STATIC_RATES_USD[base];
    if (!baseRate) return STATIC_RATES_USD;

    const converted = {};
    for (const [currency, rate] of Object.entries(STATIC_RATES_USD)) {
        converted[currency] = Math.round((rate / baseRate) * 100000) / 100000;
    }
    return converted;
}

async function getRates(base = 'USD') {
    const now = Date.now();
    if (ratesCache.data && ratesCache.base === base && (now - ratesCache.timestamp) < CACHE_TTL) {
        return { rates: ratesCache.data, live: true, cached: true };
    }
    const rates = await fetchLiveRates(base);
    const isLive = ratesCache.timestamp === now || (now - ratesCache.timestamp) < 1000;
    return { rates, live: isLive, cached: false };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/currencies', (req, res) => {
    const currencies = Object.entries(CURRENCY_NAMES).map(([code, name]) => ({
        code,
        name,
        rate_vs_usd: STATIC_RATES_USD[code]
    }));
    res.json({ currencies, total: currencies.length });
});

app.get('/rates', async (req, res) => {
    try {
        const base = (req.query.base || 'USD').toUpperCase();
        if (!STATIC_RATES_USD[base]) {
            return res.status(400).json({ error: `Unknown base currency: ${base}` });
        }
        const { rates, live, cached } = await getRates(base);
        res.json({
            base,
            rates,
            live,
            cached,
            timestamp: new Date().toISOString(),
            total_currencies: Object.keys(rates).length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/convert', async (req, res) => {
    try {
        const from = (req.query.from || 'USD').toUpperCase();
        const to = (req.query.to || 'EUR').toUpperCase();
        const amount = parseFloat(req.query.amount || 1);

        if (!STATIC_RATES_USD[from]) return res.status(400).json({ error: `Unknown currency: ${from}` });
        if (!STATIC_RATES_USD[to]) return res.status(400).json({ error: `Unknown currency: ${to}` });
        if (isNaN(amount)) return res.status(400).json({ error: 'Invalid amount' });

        const { rates } = await getRates('USD');
        const fromRate = rates[from] || STATIC_RATES_USD[from];
        const toRate = rates[to] || STATIC_RATES_USD[to];
        const rate = toRate / fromRate;
        const result = amount * rate;

        res.json({
            from,
            to,
            amount,
            result: Math.round(result * 100) / 100,
            rate: Math.round(rate * 100000) / 100000,
            from_name: CURRENCY_NAMES[from],
            to_name: CURRENCY_NAMES[to],
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/convert/batch', async (req, res) => {
    try {
        const { conversions } = req.body;
        if (!Array.isArray(conversions)) return res.status(400).json({ error: 'conversions array is required' });
        if (conversions.length > 50) return res.status(400).json({ error: 'Max 50 conversions per batch' });

        const { rates } = await getRates('USD');

        const results = conversions.map(({ from, to, amount }) => {
            try {
                const fromUp = (from || 'USD').toUpperCase();
                const toUp = (to || 'EUR').toUpperCase();
                const amt = parseFloat(amount || 1);

                const fromRate = rates[fromUp] || STATIC_RATES_USD[fromUp] || 1;
                const toRate = rates[toUp] || STATIC_RATES_USD[toUp] || 1;
                const rate = toRate / fromRate;

                return {
                    from: fromUp, to: toUp, amount: amt,
                    result: Math.round(amt * rate * 100) / 100,
                    rate: Math.round(rate * 100000) / 100000
                };
            } catch {
                return { from, to, amount, error: 'Conversion failed' };
            }
        });

        res.json({ results, total: results.length, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Currency Converter API running on port ${PORT}`));
