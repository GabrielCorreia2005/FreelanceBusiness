/**
 * AI Page Summary — Chrome Extension Popup Logic
 * Extracts page text, runs extractive summarization, shows keywords + readability.
 * All processing runs locally — no external API calls needed.
 */

// --- NLP Engine (same logic as Text Summarizer API) ---

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our',
    'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
    'himself', 'she', 'her', 'hers', 'herself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'because', 'as', 'until', 'while', 'about', 'between', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'also', 'if', 'into'
]);

function splitSentences(text) {
    return text.replace(/([.!?])\s+/g, '$1|').split('|').map(s => s.trim()).filter(s => s.length > 10);
}

function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function computeWordFrequency(words) {
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    if (maxFreq > 0) Object.keys(freq).forEach(w => { freq[w] /= maxFreq; });
    return freq;
}

function summarize(text, maxSentences = 5) {
    const sentences = splitSentences(text);
    if (sentences.length <= 3) return { summary: text, sentencesUsed: sentences.length, totalSentences: sentences.length };

    const allWords = tokenize(text);
    const wordFreq = computeWordFrequency(allWords);

    const scored = sentences.map((sentence, index) => {
        const words = tokenize(sentence);
        if (words.length === 0) return { sentence, score: 0, index };
        let score = words.reduce((sum, w) => sum + (wordFreq[w] || 0), 0) / words.length;
        if (index === 0) score *= 1.3;
        if (index === 1) score *= 1.15;
        if (/\d/.test(sentence)) score *= 1.1;
        if (sentence.length < 30) score *= 0.8;
        if (sentence.length > 300) score *= 0.9;
        return { sentence, score, index };
    });

    const numSentences = Math.min(maxSentences, sentences.length);
    const top = [...scored].sort((a, b) => b.score - a.score).slice(0, numSentences);
    top.sort((a, b) => a.index - b.index);

    return {
        summary: top.map(s => s.sentence).join(' '),
        sentencesUsed: numSentences,
        totalSentences: sentences.length
    };
}

function extractKeywords(text, count = 8) {
    const words = tokenize(text);
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, count).map(([word]) => word);
}

function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
}

function analyzeReadability(text) {
    const sentences = splitSentences(text);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    if (!sentences.length || !words.length) return { readingTime: 0, wordCount: 0, difficulty: 'N/A' };

    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    let difficulty;
    if (fleschScore >= 80) difficulty = 'Very Easy';
    else if (fleschScore >= 60) difficulty = 'Easy';
    else if (fleschScore >= 40) difficulty = 'Moderate';
    else if (fleschScore >= 20) difficulty = 'Difficult';
    else difficulty = 'Very Hard';

    return {
        readingTime: Math.max(1, Math.ceil(words.length / 200)),
        wordCount: words.length,
        difficulty
    };
}

// --- UI Logic ---

const $ = id => document.getElementById(id);

async function extractPageText() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            // Remove scripts, styles, nav, footer, ads
            const cloned = document.body.cloneNode(true);
            const remove = cloned.querySelectorAll('script, style, nav, footer, header, aside, [role="banner"], [role="navigation"], .ad, .ads, .sidebar, .menu, .nav');
            remove.forEach(el => el.remove());

            // Get main content or body text
            const main = cloned.querySelector('main, article, [role="main"], .content, .post, .article');
            const textSource = main || cloned;
            return textSource.innerText || textSource.textContent || '';
        }
    });

    return results[0]?.result || '';
}

async function run() {
    $('loading').classList.remove('hidden');
    $('content').classList.add('hidden');
    $('error').classList.add('hidden');

    try {
        const text = await extractPageText();

        if (!text || text.trim().length < 100) {
            throw new Error('Not enough text found on this page to summarize.');
        }

        // Clean text
        const cleaned = text.replace(/\s+/g, ' ').trim();

        // Analyze
        const result = summarize(cleaned, 5);
        const keywords = extractKeywords(cleaned, 8);
        const readability = analyzeReadability(cleaned);

        // Update UI
        $('summaryText').textContent = result.summary;
        $('readingTime').textContent = `📖 ${readability.readingTime} min read`;
        $('wordCount').textContent = `📝 ${readability.wordCount.toLocaleString()} words`;
        $('difficulty').textContent = `📊 ${readability.difficulty}`;

        // Reduction bar
        const reduction = Math.round((1 - result.summary.length / cleaned.length) * 100);
        $('reductionFill').style.width = `${reduction}%`;
        $('reductionText').textContent = `${reduction}% shorter`;

        // Keywords
        $('keywords').innerHTML = keywords.map(k => `<span class="keyword-tag">${k}</span>`).join('');

        // Show content
        $('loading').classList.add('hidden');
        $('content').classList.remove('hidden');

        // Store for copy
        window._summaryData = { summary: result.summary, keywords, readability };

    } catch (err) {
        $('loading').classList.add('hidden');
        $('error').classList.remove('hidden');
        $('errorText').textContent = err.message;
    }
}

// Copy button
$('copyBtn').addEventListener('click', () => {
    if (!window._summaryData) return;
    const { summary, keywords } = window._summaryData;
    const text = `Summary:\n${summary}\n\nKeywords: ${keywords.join(', ')}`;
    navigator.clipboard.writeText(text).then(() => {
        $('copyBtn').classList.add('copied');
        setTimeout(() => $('copyBtn').classList.remove('copied'), 1500);
    });
});

// Retry button
$('retryBtn').addEventListener('click', run);

// Start
run();
