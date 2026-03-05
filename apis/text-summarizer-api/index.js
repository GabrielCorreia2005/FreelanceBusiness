/**
 * Text Summarizer API
 * POST /summarize { text, sentences?, ratio? } → { summary, original_length, summary_length, reduction }
 * POST /keywords  { text, count? }             → { keywords }
 * POST /readability { text }                   → { score, grade_level, reading_time }
 * GET  /health
 * 
 * Uses extractive summarization (no external AI API needed).
 * Ranks sentences by importance using TF-IDF-like scoring.
 */
const express = require('express');

const app = express();
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3005;
const API_KEY = process.env.API_KEY || 'test-key';

// API key middleware
app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key !== API_KEY) return res.status(401).json({ error: 'Invalid API key' });
    next();
});

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// --- NLP Utilities ---

// Common English stop words
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
    'she', 'her', 'hers', 'herself', 'they', 'them', 'their', 'theirs',
    'themselves', 'what', 'which', 'who', 'whom', 'when', 'where', 'why',
    'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while',
    'about', 'between', 'through', 'during', 'before', 'after', 'above',
    'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'also', 'if', 'into'
]);

function splitSentences(text) {
    // Split on sentence boundaries
    return text
        .replace(/([.!?])\s+/g, '$1|')
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 10);
}

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function computeWordFrequency(words) {
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    // Normalize
    const maxFreq = Math.max(...Object.values(freq));
    Object.keys(freq).forEach(w => { freq[w] /= maxFreq; });

    return freq;
}

function scoreSentences(sentences, wordFreq) {
    return sentences.map((sentence, index) => {
        const words = tokenize(sentence);
        if (words.length === 0) return { sentence, score: 0, index };

        let score = words.reduce((sum, w) => sum + (wordFreq[w] || 0), 0);
        score /= words.length; // Normalize by length

        // Boost first sentences (often more important)
        if (index === 0) score *= 1.3;
        if (index === 1) score *= 1.15;

        // Boost sentences with numbers (often informative)
        if (/\d/.test(sentence)) score *= 1.1;

        // Slight penalty for very short or very long sentences
        if (sentence.length < 30) score *= 0.8;
        if (sentence.length > 300) score *= 0.9;

        return { sentence, score, index };
    });
}

function summarize(text, options = {}) {
    const { sentences: maxSentences, ratio = 0.3 } = options;

    const allSentences = splitSentences(text);

    if (allSentences.length <= 3) {
        return { summary: text, sentences_used: allSentences.length };
    }

    // Compute word frequencies
    const allWords = tokenize(text);
    const wordFreq = computeWordFrequency(allWords);

    // Score and rank sentences
    const scored = scoreSentences(allSentences, wordFreq);

    // Determine how many sentences to keep
    let numSentences = maxSentences || Math.max(1, Math.ceil(allSentences.length * ratio));
    numSentences = Math.min(numSentences, allSentences.length);

    // Pick top N sentences by score
    const topSentences = [...scored]
        .sort((a, b) => b.score - a.score)
        .slice(0, numSentences);

    // Re-order by original position for coherence
    topSentences.sort((a, b) => a.index - b.index);

    const summary = topSentences.map(s => s.sentence).join(' ');

    return {
        summary,
        sentences_used: numSentences,
        total_sentences: allSentences.length
    };
}

function extractKeywords(text, count = 10) {
    const words = tokenize(text);
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count)
        .map(([word, frequency]) => ({ word, frequency }));
}

function calculateReadability(text) {
    const sentences = splitSentences(text);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) {
        return { score: 0, grade_level: 'N/A', reading_time_minutes: 0 };
    }

    // Flesch Reading Ease
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    // Flesch-Kincaid Grade Level
    const gradeLevel = (0.39 * avgSentenceLength) + (11.8 * avgSyllablesPerWord) - 15.59;

    // Reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(words.length / 200);

    let difficulty;
    if (fleschScore >= 80) difficulty = 'very_easy';
    else if (fleschScore >= 60) difficulty = 'easy';
    else if (fleschScore >= 40) difficulty = 'moderate';
    else if (fleschScore >= 20) difficulty = 'difficult';
    else difficulty = 'very_difficult';

    return {
        flesch_score: Math.round(fleschScore * 10) / 10,
        grade_level: Math.round(gradeLevel * 10) / 10,
        difficulty,
        word_count: words.length,
        sentence_count: sentences.length,
        avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
        reading_time_minutes: readingTimeMinutes
    };
}

function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}

// --- Routes ---

app.post('/summarize', (req, res) => {
    try {
        const { text, sentences, ratio } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });
        if (text.length < 50) return res.status(400).json({ error: 'Text too short to summarize (min 50 chars)' });
        if (text.length > 100000) return res.status(400).json({ error: 'Text too long (max 100,000 chars)' });

        const result = summarize(text, { sentences: parseInt(sentences), ratio: parseFloat(ratio) || 0.3 });

        res.json({
            summary: result.summary,
            original_length: text.length,
            summary_length: result.summary.length,
            reduction: `${Math.round((1 - result.summary.length / text.length) * 100)}%`,
            sentences_used: result.sentences_used,
            total_sentences: result.total_sentences
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/keywords', (req, res) => {
    try {
        const { text, count } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });

        const keywords = extractKeywords(text, parseInt(count) || 10);
        res.json({ keywords, total: keywords.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/readability', (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'text is required' });

        res.json(calculateReadability(text));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Text Summarizer API running on port ${PORT}`));
