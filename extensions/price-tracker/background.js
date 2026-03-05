/**
 * Price Tracker — background.js (service worker)
 * Sets up alarms for periodic price checks and sends notifications.
 */

// ─── Alarm setup ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('priceCheck', { periodInMinutes: 60 });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SETUP_ALARMS') {
        chrome.alarms.create('priceCheck', { periodInMinutes: 60 });
        sendResponse({ ok: true });
    }
    if (msg.type === 'CHECK_ALL') {
        checkAllPrices().then(() => sendResponse({ ok: true }));
        return true; // async response
    }
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'priceCheck') checkAllPrices();
});

// ─── Price checker ────────────────────────────────────────────────────────────
async function checkAllPrices() {
    const data = await chrome.storage.local.get('trackedItems');
    const items = data.trackedItems || [];
    if (items.length === 0) return;

    const updated = await Promise.all(items.map(async item => {
        try {
            const price = await fetchPrice(item.url);
            if (price === null) return item;

            const prevPrice = item.currentPrice;
            const newItem = { ...item, currentPrice: price, lastChecked: new Date().toISOString() };

            // Notify if below target
            if (price <= item.targetPrice && prevPrice > item.targetPrice) {
                await chrome.notifications.create(`price-${Date.now()}`, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: '💰 Price Drop Alert!',
                    message: `${item.title?.slice(0, 60)}\nNow: $${price} (Target: $${item.targetPrice})`
                });
            }

            // Notify if significant drop (>5%)
            if (prevPrice && price < prevPrice * 0.95) {
                const drop = ((prevPrice - price) / prevPrice * 100).toFixed(0);
                await chrome.notifications.create(`drop-${Date.now()}`, {
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: `📉 ${drop}% Price Drop!`,
                    message: `${item.title?.slice(0, 60)}\n$${prevPrice} → $${price}`
                });
            }

            return newItem;
        } catch {
            return item;
        }
    }));

    await chrome.storage.local.set({ trackedItems: updated });
}

async function fetchPrice(url) {
    try {
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PriceBot/1.0)' }
        });
        if (!resp.ok) return null;
        const html = await resp.text();
        return extractPriceFromHtml(html);
    } catch {
        return null;
    }
}

function extractPriceFromHtml(html) {
    // Search for common price patterns in HTML
    const patterns = [
        /"price":\s*([\d.]+)/,
        /data-price="([\d.]+)"/,
        /itemprop="price"\s+content="([\d.]+)"/,
        /class="a-offscreen">[\€\$\£\₹]?\s*(\d{1,6}(?:[.,]\d{0,3})?)/,
        /[\€\$\£\₹]\s*(\d{1,6}[.,]\d{2})/
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
            const val = parseFloat(match[1].replace(',', '.'));
            if (val > 0 && val < 100000) return val;
        }
    }
    return null;
}
