/**
 * Sentiment Analysis API
 * POST /analyze          { text }            → { sentiment, score, confidence, emotions }
 * POST /analyze/batch    { texts: [] }       → [{ sentiment, score, text_preview }]
 * POST /analyze/aspects  { text, aspects[] } → aspect-level sentiment breakdown
 * GET  /health
 *
 * Uses lexicon-based VADER-like approach — no external APIs, no ML model downloads.
 * Handles negation, intensifiers, and punctuation boosters.
 */
const express = require('express');

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3007;
const API_KEY = process.env.API_KEY || 'test-key';

app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ─── Lexicons ───────────────────────────────────────────────────────────────

const POSITIVE_WORDS = {
    // Very strong positive
    amazing: 3, awesome: 3, excellent: 3, outstanding: 3, superb: 3, fantastic: 3,
    extraordinary: 3, phenomenal: 3, spectacular: 3, brilliant: 3, incredible: 3,
    perfect: 3, magnificent: 3, exceptional: 3, marvelous: 3, wonderful: 3,
    // Strong positive
    great: 2.5, love: 2.5, best: 2.5, beautiful: 2.5, delightful: 2.5,
    thrilled: 2.5, ecstatic: 2.5, overjoyed: 2.5, elated: 2.5, exuberant: 2.5,
    // Moderate positive
    good: 2, nice: 2, happy: 2, pleased: 2, enjoy: 2, like: 2, positive: 2,
    excellent: 2, recommend: 2, helpful: 2, useful: 2, effective: 2, quality: 2,
    successful: 2, improved: 2, better: 2, benefit: 2, advantage: 2, gain: 2,
    opportunity: 2, progress: 2, growth: 2, innovation: 2, efficient: 2,
    // Mild positive
    okay: 1, fine: 1, decent: 1, fair: 1, satisfactory: 1, adequate: 1,
    acceptable: 1, alright: 1, reasonable: 1, pleasant: 1, enjoy: 1, fun: 1,
    interesting: 1, innovative: 1, creative: 1, smart: 1, clean: 1, fast: 1,
    easy: 1, simple: 1, smooth: 1, clear: 1, reliable: 1, consistent: 1,
    supported: 1, helped: 1, solved: 1, fixed: 1, works: 1, working: 1
};

const NEGATIVE_WORDS = {
    // Very strong negative
    terrible: -3, horrible: -3, awful: -3, dreadful: -3, atrocious: -3,
    disgusting: -3, abysmal: -3, appalling: -3, catastrophic: -3, disastrous: -3,
    // Strong negative
    bad: -2.5, worst: -2.5, hate: -2.5, hate: -2.5, ugly: -2.5, broken: -2.5,
    useless: -2.5, failure: -2.5, failed: -2.5, pathetic: -2.5, miserable: -2.5,
    // Moderate negative
    poor: -2, wrong: -2, problem: -2, issue: -2, error: -2, bug: -2, fail: -2,
    frustrating: -2, annoying: -2, disappointing: -2, disappointed: -2, upset: -2,
    slow: -2, difficult: -2, hard: -2, complicated: -2, confusing: -2, unclear: -2,
    missing: -2, lacks: -2, lack: -2, lost: -2, broken: -2, crash: -2, crashes: -2,
    // Mild negative
    mediocre: -1, average: -1, okay: 0, meh: -1, boring: -1, dull: -1, bland: -1,
    overpriced: -1.5, expensive: -1, cheap: -0.5, limited: -1, restricted: -1,
    uncertain: -0.5, unclear: -1, confusing: -1, messy: -1, complex: -0.5
};

const EMOTIONS = {
    joy: ['happy', 'joyful', 'delighted', 'thrilled', 'ecstatic', 'great', 'wonderful', 'amazing', 'love', 'enjoy', 'fun', 'exciting', 'celebration'],
    anger: ['angry', 'furious', 'outraged', 'infuriated', 'livid', 'hate', 'rage', 'mad', 'annoyed', 'frustrating', 'unacceptable'],
    fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'concerned', 'fear', 'risk', 'danger', 'threat', 'unsafe'],
    sadness: ['sad', 'unhappy', 'depressed', 'miserable', 'heartbroken', 'disappointed', 'unfortunate', 'regret', 'sorry', 'loss'],
    surprise: ['surprised', 'shocked', 'stunned', 'amazed', 'astonished', 'unexpected', 'unbelievable', 'wow', 'incredible'],
    disgust: ['disgusting', 'gross', 'awful', 'horrible', 'terrible', 'revolting', 'repulsive', 'nauseating', 'horrible']
};

// Negation words that flip sentiment within a window
const NEGATION_WORDS = new Set([
    'not', "n't", 'no', 'never', 'neither', 'nor', 'nothing', 'nobody',
    'nowhere', 'hardly', 'scarcely', 'barely', 'without', 'lack', 'lacks'
]);

// Intensifiers that amplify sentiment
const INTENSIFIERS = {
    very: 1.3, extremely: 1.5, incredibly: 1.5, really: 1.2, quite: 1.1,
    absolutely: 1.5, totally: 1.3, utterly: 1.4, highly: 1.3, deeply: 1.3,
    completely: 1.4, thoroughly: 1.3, exceptionally: 1.4, remarkably: 1.3
};

// ─── Analysis Engine ─────────────────────────────────────────────────────────

function analyze(text) {
    // Punctuation booster
    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const allCaps = text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase()).length;

    const words = text.toLowerCase().replace(/['"]/g, '').split(/\s+/);

    let totalScore = 0;
    let wordCount = 0;
    const negationWindow = new Set();
    const detectedWords = { positive: [], negative: [] };

    for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[^a-z']/g, '');
        if (!word) continue;

        // Check if this word is in a negation window (2 words before)
        const negated = i >= 1 && NEGATION_WORDS.has(words[i - 1].replace(/[^a-z']/g, ''))
            || i >= 2 && NEGATION_WORDS.has(words[i - 2].replace(/[^a-z']/g, ''));

        // Intensifier multiplier from previous word
        let intensifier = 1;
        if (i >= 1) {
            const prevWord = words[i - 1].replace(/[^a-z']/g, '');
            intensifier = INTENSIFIERS[prevWord] || 1;
        }

        let score = 0;
        if (POSITIVE_WORDS[word] !== undefined) {
            score = POSITIVE_WORDS[word];
            if (!negated) detectedWords.positive.push(word);
            else detectedWords.negative.push(word);
        } else if (NEGATIVE_WORDS[word] !== undefined) {
            score = NEGATIVE_WORDS[word];
            if (!negated) detectedWords.negative.push(word);
            else detectedWords.positive.push(word);
        }

        if (score !== 0) {
            score *= intensifier;
            if (negated) score = -score * 0.8; // negate with slight reduction
            totalScore += score;
            wordCount++;
        }
    }

    // Punctuation boosts
    if (totalScore > 0) {
        totalScore += Math.min(exclamationCount * 0.3, 1.5);
        totalScore += allCaps * 0.2;
    } else if (totalScore < 0) {
        totalScore -= Math.min(exclamationCount * 0.3, 1.5);
    }

    // Normalize: cap at ±5, then convert to -1 to +1 range
    const capped = Math.max(-5, Math.min(5, totalScore));
    const normalized = capped / 5;

    // Classify
    let sentiment, label;
    if (normalized > 0.12) { sentiment = 'positive'; label = normalized > 0.5 ? 'strongly positive' : 'positive'; }
    else if (normalized < -0.12) { sentiment = 'negative'; label = normalized < -0.5 ? 'strongly negative' : 'negative'; }
    else { sentiment = 'neutral'; label = 'neutral'; }

    // Confidence: how far from zero
    const confidence = Math.min(1, Math.abs(normalized) * 2);

    // Emotion detection
    const emotions = {};
    const lowerText = text.toLowerCase();
    for (const [emotion, wordList] of Object.entries(EMOTIONS)) {
        const matches = wordList.filter(w => lowerText.includes(w));
        if (matches.length > 0) {
            emotions[emotion] = Math.min(1, matches.length * 0.3);
        }
    }

    // Sort emotions by score
    const sortedEmotions = Object.entries(emotions)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [k, v]) => ({ ...acc, [k]: Math.round(v * 100) / 100 }), {});

    return {
        sentiment,
        label,
        score: Math.round(normalized * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        raw_score: Math.round(totalScore * 100) / 100,
        emotions: sortedEmotions,
        detected_words: {
            positive: [...new Set(detectedWords.positive)],
            negative: [...new Set(detectedWords.negative)]
        },
        word_count: words.length
    };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.post('/analyze', (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });
        if (text.length > 50000) return res.status(400).json({ error: 'Text too long (max 50,000 chars)' });

        const result = analyze(text);
        res.json({ ...result, text_length: text.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/analyze/batch', (req, res) => {
    try {
        const { texts } = req.body;
        if (!Array.isArray(texts)) return res.status(400).json({ error: 'texts array is required' });
        if (texts.length > 100) return res.status(400).json({ error: 'Max 100 texts per batch' });

        const results = texts.map(text => {
            try {
                const r = analyze(text);
                return {
                    text_preview: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
                    ...r
                };
            } catch {
                return { text_preview: text.slice(0, 80), error: 'Analysis failed' };
            }
        });

        // Aggregate stats
        const sentiments = results.map(r => r.sentiment).filter(Boolean);
        const aggregate = {
            positive: sentiments.filter(s => s === 'positive').length,
            neutral: sentiments.filter(s => s === 'neutral').length,
            negative: sentiments.filter(s => s === 'negative').length,
            avg_score: Math.round(results.reduce((s, r) => s + (r.score || 0), 0) / results.length * 100) / 100
        };

        res.json({ results, aggregate, total: results.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/analyze/aspects', (req, res) => {
    try {
        const { text, aspects } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });
        if (!Array.isArray(aspects) || aspects.length === 0) {
            return res.status(400).json({ error: 'aspects array is required' });
        }

        const sentences = text.toLowerCase().split(/[.!?]+/).filter(s => s.trim().length > 5);

        const aspectResults = aspects.map(aspect => {
            const aspectLower = aspect.toLowerCase();
            // Find sentences mentioning this aspect
            const relevantSentences = sentences.filter(s => {
                const words = aspectLower.split(/\s+/);
                return words.some(w => s.includes(w));
            });

            if (relevantSentences.length === 0) {
                return { aspect, sentiment: 'not_mentioned', score: null, evidence: [] };
            }

            const combined = relevantSentences.join('. ');
            const result = analyze(combined);
            return {
                aspect,
                sentiment: result.sentiment,
                score: result.score,
                confidence: result.confidence,
                evidence: relevantSentences.map(s => s.trim()).slice(0, 3)
            };
        });

        res.json({ text_length: text.length, aspects: aspectResults });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Sentiment Analysis API running on port ${PORT}`));
