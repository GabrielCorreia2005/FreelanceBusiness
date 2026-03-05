/**
 * Password Generator API
 * GET  /generate?length=16&uppercase=true&lowercase=true&numbers=true&symbols=true&count=1
 * POST /generate { length, uppercase, lowercase, numbers, symbols, count, exclude }
 * GET  /health
 */
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
const API_KEY = process.env.API_KEY || 'test-key';

// API key middleware
app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

const CHARSETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

function generatePassword(options = {}) {
    const {
        length = 16,
        uppercase = true,
        lowercase = true,
        numbers = true,
        symbols = false,
        exclude = ''
    } = options;

    let charset = '';
    if (uppercase) charset += CHARSETS.uppercase;
    if (lowercase) charset += CHARSETS.lowercase;
    if (numbers) charset += CHARSETS.numbers;
    if (symbols) charset += CHARSETS.symbols;

    if (!charset) charset = CHARSETS.lowercase + CHARSETS.numbers;

    // Remove excluded characters
    if (exclude) {
        charset = charset.split('').filter(c => !exclude.includes(c)).join('');
    }

    if (charset.length === 0) {
        throw new Error('No characters available after applying exclusions');
    }

    const len = Math.min(Math.max(parseInt(length) || 16, 4), 128);
    const bytes = crypto.randomBytes(len);
    let password = '';
    for (let i = 0; i < len; i++) {
        password += charset[bytes[i] % charset.length];
    }

    return password;
}

function calculateStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    const labels = ['very_weak', 'weak', 'fair', 'good', 'strong', 'very_strong', 'excellent', 'maximum'];
    return {
        score,
        max: 7,
        label: labels[Math.min(score, labels.length - 1)],
        entropy_bits: Math.round(password.length * Math.log2(94))
    };
}

function parseBoolean(val, defaultVal = true) {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'boolean') return val;
    return val === 'true' || val === '1';
}

app.get('/generate', (req, res) => {
    try {
        const { length, uppercase, lowercase, numbers, symbols, exclude, count } = req.query;
        const opts = {
            length: parseInt(length) || 16,
            uppercase: parseBoolean(uppercase, true),
            lowercase: parseBoolean(lowercase, true),
            numbers: parseBoolean(numbers, true),
            symbols: parseBoolean(symbols, false),
            exclude: exclude || ''
        };

        const num = Math.min(Math.max(parseInt(count) || 1, 1), 50);

        if (num === 1) {
            const password = generatePassword(opts);
            return res.json({
                password,
                length: password.length,
                strength: calculateStrength(password),
                options: opts
            });
        }

        const passwords = Array.from({ length: num }, () => {
            const p = generatePassword(opts);
            return { password: p, length: p.length, strength: calculateStrength(p) };
        });

        res.json({ passwords, count: passwords.length, options: opts });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/generate', (req, res) => {
    try {
        const { length, uppercase, lowercase, numbers, symbols, exclude, count } = req.body;
        const opts = {
            length: parseInt(length) || 16,
            uppercase: uppercase !== false,
            lowercase: lowercase !== false,
            numbers: numbers !== false,
            symbols: symbols === true,
            exclude: exclude || ''
        };

        const num = Math.min(Math.max(parseInt(count) || 1, 1), 50);

        if (num === 1) {
            const password = generatePassword(opts);
            return res.json({
                password,
                length: password.length,
                strength: calculateStrength(password),
                options: opts
            });
        }

        const passwords = Array.from({ length: num }, () => {
            const p = generatePassword(opts);
            return { password: p, length: p.length, strength: calculateStrength(p) };
        });

        res.json({ passwords, count: passwords.length, options: opts });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Passphrase endpoint (memorable passwords)
app.get('/passphrase', (req, res) => {
    try {
        const { words = 4, separator = '-', capitalize = 'true' } = req.query;
        const wordCount = Math.min(Math.max(parseInt(words) || 4, 2), 10);
        const cap = parseBoolean(capitalize, true);

        // Simple word list for passphrases
        const wordList = [
            'apple', 'brave', 'cloud', 'dance', 'eagle', 'flame', 'grace', 'heart',
            'ivory', 'jewel', 'karma', 'lemon', 'magic', 'noble', 'ocean', 'piano',
            'queen', 'river', 'solar', 'tiger', 'urban', 'vivid', 'whale', 'xenon',
            'yacht', 'zebra', 'amber', 'blaze', 'coral', 'delta', 'ember', 'frost',
            'glide', 'haven', 'index', 'jolly', 'knack', 'lunar', 'maple', 'nexus',
            'olive', 'prism', 'quest', 'ridge', 'stone', 'torch', 'unity', 'vault',
            'wince', 'oxide', 'yield', 'zonal', 'atlas', 'birch', 'cedar', 'drift',
            'epoch', 'forge', 'gauge', 'haste', 'inlet', 'jasper', 'kinetic', 'latch'
        ];

        const bytes = crypto.randomBytes(wordCount);
        const selected = Array.from({ length: wordCount }, (_, i) => {
            const word = wordList[bytes[i] % wordList.length];
            return cap ? word.charAt(0).toUpperCase() + word.slice(1) : word;
        });

        const passphrase = selected.join(separator);

        res.json({
            passphrase,
            words: wordCount,
            separator,
            strength: calculateStrength(passphrase)
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Password Generator API running on port ${PORT}`));
