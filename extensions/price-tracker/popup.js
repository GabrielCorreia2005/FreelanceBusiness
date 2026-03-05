/**
 * Price Tracker — popup.js
 * Injects content script to extract price from current page,
 * stores tracked items in chrome.storage.local.
 */

const $ = id => document.getElementById(id);

let trackedItems = [];
let currentPageData = null;

async function loadItems() {
    return new Promise(resolve => {
        chrome.storage.local.get('trackedItems', data => resolve(data.trackedItems || []));
    });
}

function saveItems() {
    chrome.storage.local.set({ trackedItems });
}

// ─── Detect price on current page ────────────────────────────────────────────
async function detectCurrentPage() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url || tab.url.startsWith('chrome://')) {
            $('pageTitle').textContent = 'Not a product page';
            $('detectedPrice').textContent = '';
            return;
        }

        $('pageTitle').textContent = tab.title?.slice(0, 60) || tab.url;

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractPriceFromPage
        });

        const price = results?.[0]?.result;
        if (price) {
            currentPageData = { url: tab.url, title: tab.title, price };
            $('detectedPrice').textContent = formatPrice(price);
            $('trackBtn').disabled = false;
        } else {
            $('detectedPrice').textContent = 'No price detected';
            $('trackBtn').disabled = true;
        }
    } catch (err) {
        $('pageTitle').textContent = 'Cannot access this page';
        $('detectedPrice').textContent = '';
    }
}

// Injected into page to find prices
function extractPriceFromPage() {
    // Common price selectors for major e-commerce sites
    const selectors = [
        // Amazon
        '.a-price-whole', '.a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice',
        '[data-feature-name="priceInsideBuyBox"] .a-price .a-offscreen',
        // Generic
        '[class*="price"]:not([class*="was"]):not([class*="orig"]):not([class*="compare"])',
        '[id*="price"]', '[data-price]', 'meta[property="product:price:amount"]',
        '.woocommerce-Price-amount', 'span[itemprop="price"]', '.price'
    ];

    for (const sel of selectors) {
        try {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
                const text = el.tagName === 'META' ? el.getAttribute('content') : el.textContent;
                if (!text) continue;
                const match = text.match(/[\€\$\£\₹]?\s*(\d{1,6}(?:[.,]\d{2,3})?)/);
                if (match) {
                    const raw = match[1].replace(',', '.');
                    const val = parseFloat(raw);
                    if (val > 0 && val < 100000) return val;
                }
            }
        } catch { }
    }
    return null;
}

function formatPrice(val) {
    return val < 10 ? `$${val.toFixed(2)}` : `$${val.toFixed(2)}`;
}

// ─── Render tracked items ─────────────────────────────────────────────────────
function renderItems() {
    $('trackedCount').textContent = trackedItems.length;
    const container = $('trackedList');
    if (trackedItems.length === 0) {
        container.innerHTML = '<div class="empty-state">No items tracked yet</div>';
        return;
    }

    container.innerHTML = trackedItems.map((item, i) => {
        const drop = item.currentPrice !== null && item.currentPrice <= item.targetPrice;
        const change = item.currentPrice && item.initialPrice
            ? ((item.currentPrice - item.initialPrice) / item.initialPrice * 100).toFixed(1)
            : null;
        return `
    <div class="tracked-item ${drop ? 'drop' : ''}">
      <div class="item-info">
        <div class="item-title" title="${item.title}">${item.title?.slice(0, 45) || item.url}</div>
        <div class="item-prices">
          <span class="current">${item.currentPrice ? formatPrice(item.currentPrice) : '—'}</span>
          <span class="target">Target: ${formatPrice(item.targetPrice)}</span>
          ${drop ? '<span class="drop-badge">✅ BELOW TARGET</span>' : ''}
          ${change ? `<span style="color:${change < 0 ? '#10b981' : '#f87171'}">${change}%</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        <a class="action-btn" href="${item.url}" target="_blank" title="Open">↗</a>
        <button class="action-btn" onclick="deleteItem(${i})" title="Remove">✕</button>
      </div>
    </div>`;
    }).join('');
}

window.deleteItem = (i) => {
    trackedItems.splice(i, 1);
    saveItems();
    renderItems();
};

// ─── Add current page ─────────────────────────────────────────────────────────
$('trackBtn').onclick = () => {
    if (!currentPageData) return;
    const target = parseFloat($('targetPrice').value);
    if (!target || target <= 0) {
        alert('Enter a valid target price');
        return;
    }
    const interval = parseInt($('checkInterval').value);

    // Check if already tracking
    const exists = trackedItems.findIndex(i => i.url === currentPageData.url);
    if (exists >= 0) {
        trackedItems[exists].targetPrice = target;
        trackedItems[exists].interval = interval;
    } else {
        trackedItems.push({
            url: currentPageData.url,
            title: currentPageData.title,
            targetPrice: target,
            initialPrice: currentPageData.price,
            currentPrice: currentPageData.price,
            interval,
            addedAt: new Date().toISOString(),
            lastChecked: new Date().toISOString()
        });
    }

    saveItems();
    renderItems();
    $('targetPrice').value = '';

    // Tell background to check prices
    chrome.runtime.sendMessage({ type: 'SETUP_ALARMS' });
};

$('checkAllBtn').onclick = () => {
    chrome.runtime.sendMessage({ type: 'CHECK_ALL' }, () => {
        loadItems().then(items => { trackedItems = items; renderItems(); });
    });
};

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
    trackedItems = await loadItems();
    renderItems();
    detectCurrentPage();
})();
