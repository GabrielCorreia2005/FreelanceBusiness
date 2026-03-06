# RapidAPI Publishing Guide

## Step-by-step for each API

1. Go to <https://rapidapi.com/provider>
2. Click **"Add New API"**
3. Fill in:
   - **API Name** (see below)
   - **Category** (see below)
   - **Base URL** (your Railway/Render URL)
4. Add endpoints (copy from below)
5. Set pricing (use tiers below)
6. Publish → Submit for review

---

## API #1 — Password Generator API

**Name:** Password Generator API  
**Category:** Security  
**Short Description:** Generate ultra-secure passwords, passphrases, and check password strength. No dependencies, instant results.  
**Base URL:** `https://password-generator-api-production.up.railway.app`  
**API Key Header:** `x-api-key`

### Endpoints to add in RapidAPI

| Method | Path | Description |
|--------|------|-------------|
| GET | `/generate` | Generate a random password |
| GET | `/passphrase` | Generate a memorable passphrase |
| POST | `/strength` | Check strength of a password |
| GET | `/bulk` | Generate multiple passwords at once |
| GET | `/health` | API health check |

### `/generate` Parameters

- `length` (number, default 16) — password length
- `uppercase` (boolean) — include uppercase
- `numbers` (boolean) — include numbers
- `symbols` (boolean) — include symbols
- `exclude` (string) — chars to exclude

### `/strength` Body

```json
{ "password": "MyP@ssw0rd!" }
```

### Pricing Tiers

| Tier | Price | Requests/month |
|------|-------|----------------|
| Free | $0 | 100 |
| Basic | $4.99 | 5,000 |
| Pro | $14.99 | 50,000 |

### Tags: password, security, generator, random, hash

---

## API #2 — URL Shortener API

**Name:** URL Shortener API  
**Category:** Data  
**Short Description:** Shorten URLs with custom codes, track clicks, set expiry dates. Analytics included.  
**Base URL:** `https://url-shortener-api-production-fb68.up.railway.app`  
**API Key Header:** `x-api-key`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/shorten` | Shorten a URL |
| GET | `/:code` | Redirect to original URL |
| GET | `/analytics/:code` | Get click analytics |
| POST | `/bulk` | Shorten multiple URLs |
| DELETE | `/:code` | Delete a short URL |

### `/shorten` Body

```json
{
  "url": "https://example.com/very/long/url",
  "customCode": "mylink",
  "expiresIn": 7
}
```

### Pricing Tiers

| Tier | Price | Requests/month |
|------|-------|----------------|
| Free | $0 | 100 |
| Basic | $4.99 | 10,000 |
| Pro | $19.99 | 100,000 |

### Tags: url shortener, link shortener, redirect, analytics, tracking

---

## API #3 — Text Summarizer API

**Name:** Text Summarizer API  
**Category:** Text Analysis  
**Short Description:** Summarize long text using AI-like extractive NLP. Get keywords, readability scores, and compression ratios. No external dependencies.  
**Base URL:** `https://text-summarizer-api-production.up.railway.app`  
**API Key Header:** `x-api-key`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/summarize` | Summarize text |
| POST | `/keywords` | Extract keywords |
| POST | `/readability` | Get readability score |
| GET | `/health` | Health check |

### `/summarize` Body

```json
{
  "text": "Your long text here...",
  "sentences": 3,
  "format": "bullets"
}
```

### Pricing Tiers

| Tier | Price | Requests/month |
|------|-------|----------------|
| Free | $0 | 50 |
| Basic | $7.99 | 5,000 |
| Pro | $24.99 | 50,000 |

### Tags: summarize, NLP, text analysis, keywords, readability

---

## API #4 — Sentiment Analysis API

**Name:** Sentiment Analysis API  
**Category:** Text Analysis  
**Short Description:** Detect sentiment (positive/negative/neutral), emotions, and run batch analysis on text. VADER-like algorithm, no external AI needed.  
**Base URL:** (Render URL after deploy)  
**API Key Header:** `x-api-key`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Analyze sentiment |
| POST | `/batch` | Analyze multiple texts |
| POST | `/emotions` | Detect emotions |
| GET | `/health` | Health check |

### `/analyze` Body

```json
{ "text": "I absolutely love this product!" }
```

### Pricing Tiers

| Tier | Price | Requests/month |
|------|-------|----------------|
| Free | $0 | 100 |
| Basic | $9.99 | 10,000 |
| Pro | $29.99 | 100,000 |

### Tags: sentiment, NLP, text analysis, emotion detection, VADER

---

## API #5 — Currency Converter API

**Name:** Currency Converter API  
**Category:** Finance  
**Short Description:** Convert between 40+ currencies with live exchange rates. Batch conversion, historical rates, offline fallback.  
**Base URL:** (Render URL after deploy)  
**API Key Header:** `x-api-key`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/convert` | Convert currency |
| GET | `/rates` | Get all current rates |
| POST | `/batch` | Batch convert multiple amounts |
| GET | `/currencies` | List all supported currencies |
| GET | `/health` | Health check |

### `/convert` Parameters

- `from` (string) — source currency code (e.g. `USD`)
- `to` (string) — target currency code (e.g. `EUR`)
- `amount` (number) — amount to convert

### Pricing Tiers

| Tier | Price | Requests/month |
|------|-------|----------------|
| Free | $0 | 500 |
| Basic | $4.99 | 20,000 |
| Pro | $14.99 | 200,000 |

### Tags: currency, exchange rate, forex, convert, finance

---

## API #6 — Web Scraper API

**Name:** Web Scraper API  
**Category:** Data  
**Short Description:** Scrape any website — extract text, links, images, metadata with zero setup. CSS selectors, batch scraping supported.  
**Base URL:** (Render URL after deploy)  
**API Key Header:** `x-api-key`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/scrape` | Scrape a URL |
| POST | `/batch` | Scrape multiple URLs |
| POST | `/extract` | Extract specific fields |
| GET | `/health` | Health check |

### `/scrape` Body

```json
{
  "url": "https://example.com",
  "fields": ["title", "text", "links", "images"]
}
```

### Pricing Tiers

| Tier | Price | Requests/month |
|------|-------|----------------|
| Free | $0 | 50 |
| Basic | $9.99 | 5,000 |
| Pro | $29.99 | 50,000 |

### Tags: scraper, web scraping, data extraction, HTML parser, crawler

---

## Publishing Order (Priority)

1. **Currency Converter** — high search volume on RapidAPI, lots of competition but reliable traffic
2. **Password Generator** — already live, submit first
3. **Sentiment Analysis** — businesses love this for reviews/feedback
4. **URL Shortener** — saturated market but still searched
5. **Text Summarizer** — growing demand with AI tools
6. **Web Scraper** — smaller audience but high willingness to pay

## Expected Timeline

- Submitted today → Approved in 24-48h
- First free users in week 1
- First paying subscriber: week 2-3
- Stable monthly: $50-200/month per API
