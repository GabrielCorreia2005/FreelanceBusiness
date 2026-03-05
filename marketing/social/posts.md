# Social Media Posts — Reddit & Twitter/X

## Reddit Strategy

### Best Subreddits to Post in

- r/SideProject — showcase your projects
- r/entrepreneur — business value angle
- r/webdev — technical audience
- r/programming — developer tools angle
- r/artificial — AI tools angle
- r/chrome_extensions — extension showcase
- r/smallbusiness — automation for business owners

---

### Reddit Post #1: SideProject/Entrepreneur — APIs

**Title:**
> I built 7 REST APIs and published them on RapidAPI — here's what I learned about monetizing developer tools

**Body:**

```
I've spent the last week building and deploying 7 REST APIs to RapidAPI. Some context on what I built and what I learned:

**The APIs (all live, free tier available):**
- Password Generator API — random passwords, passphrases, strength scoring
- URL Shortener API — custom codes, click tracking, expiry
- Text Summarizer API — extractive NLP, no external dependencies
- Sentiment Analysis API — VADER-like scoring, emotion detection
- Currency Converter API — 40+ currencies, live rates, offline fallback
- PDF Generator API — HTML to PDF, URL to PDF, invoice templates
- Web Scraper API — extract text, links, images from any URL

**What actually works for monetization on RapidAPI:**
1. Always have a free tier — it drives sign-ups and shows you the usage patterns
2. Price based on requests/month not features — simpler to understand
3. The best-converting APIs solve a specific problem (password generation, currency conversion) better than pure "utility" APIs

**What's harder than you think:**
- Getting your first paying subscriber takes 2-3 weeks of organic traffic
- Documentation quality is *the* make-or-break factor
- You need to be in multiple categories to get discovered

Happy to answer questions about the tech stack (Node.js + Express) or the RapidAPI submission process.

[GitHub link if you want to see the code]
```

**Post Strategy:**

- Post Tuesday-Thursday 9am-2pm EST for max visibility
- Respond to every comment in the first 2 hours

---

### Reddit Post #2: Chrome Extensions Showcase

**Title:**
> I published 3 free Chrome Extensions this week — Tab Dashboard, Price Tracker, and AI Page Summary

**Body:**

```
I've been building Chrome Extensions for the past few days. Here's what I shipped:

**1. Focus Tab Dashboard** (replaces new tab)
- Real-time clock + greeting
- Persistent task list
- Pomodoro timer with notifications
- Quick links with favicons
- Daily streak counter
No extension does all this without cloud accounts. Yours works offline.

**2. Price Tracker**
- Detects prices on Amazon and other sites automatically
- Set a target price and get notified when it drops
- Background checking (hourly)
- Works on any page with a visible price

**3. AI Page Summary**
- Summarizes any web page instantly
- Shows keywords, reading time, word count
- Runs locally — no API key, no data sent anywhere

All three are Manifest V3 (future-proof, won't get deprecated).

[Chrome Web Store links]

Built these partly as portfolio pieces, partly because I actually wanted to use them. Which one sounds most useful to you?
```

---

## Twitter/X Post Templates

### Tweet Thread #1: Building in Public

**Tweet 1 (hook):**

```
I built 7 REST APIs + 3 Chrome Extensions in one week while unemployed.

Here's exactly what I built and how much I plan to earn from them 🧵
```

**Tweet 2:**

```
The APIs (all live on RapidAPI):

🔐 Password Generator — rate: 500 req/day free, $4.99/mo pro
🔗 URL Shortener — with click analytics
📝 Text Summarizer — no OpenAI needed, works offline
😊 Sentiment Analysis — VADER scoring + emotions
💱 Currency Converter — 40+ currencies, live rates
```

**Tweet 3:**

```
The Chrome Extensions:

🧩 Focus Tab Dashboard — new tab replacement w/ tasks + Pomodoro
💰 Price Tracker — alerts when Amazon prices drop
📖 AI Page Summary — summarize any page, no API key

All Manifest V3 (future-proof)
```

**Tweet 4:**

```
Revenue plan for this month:

RapidAPI subscriptions: €150-300
Fiverr gigs (APIs + chatbots + extensions): €1,500-2,000
Upwork projects: €800-1,200
Chrome Extension donations/pro tier: €100-200

Total target: €5,000 🎯
```

**Tweet 5 (CTA):**

```
If you need a:
- Custom API built and deployed
- AI chatbot
- Chrome Extension

I'm delivering in 2-5 days.

Links in bio (Fiverr + Upwork) 👇
```

---

### Tweet Thread #2: Tutorial/Value Post (gets shares)

**Tweet 1:**

```
How I built a production-ready REST API in under 3 hours:

(Node.js + Express + Railway deployment)

A simple step-by-step 🧵
```

**Tweet 2:**

```
Step 1: Project setup

mkdir my-api && cd my-api
npm init -y
npm install express

Create index.js — done in 30 seconds.
```

**Tweet 3:**

```
Step 2: Add auth middleware (never skip this)

const auth = (req, res, next) => {
  const key = req.headers['x-api-key']
  if (key !== process.env.API_KEY)
    return res.status(401).json({ error: 'Unauthorized' })
  next()
}

This protects your API from being abused.
```

**Tweet 4:**

```
Step 3: Add your endpoints

app.get('/convert', auth, async (req, res) => {
  const { from, to, amount } = req.query
  // your logic here
  res.json({ result, rate })
})

Keep each endpoint focused on ONE thing.
```

**Tweet 5:**

```
Step 4: Deploy to Railway in 5 minutes

1. Push to GitHub
2. Connect to Railway
3. Set API_KEY env variable
4. Deploy → get live URL

That's it. Your API is live.
```

**Tweet 6:**

```
Step 5: Publish to RapidAPI for monetization

1. Create account (free)
2. Add your Railway URL as base URL
3. Define endpoints in their UI
4. Set free tier + paid tiers
5. Publish

Your API is now discoverable by 4M+ developers.
```

---

## Posting Schedule

| Day | Platform | Post |
|-----|----------|------|
| Mon | Twitter | Thread #2 (tutorial) |
| Tue | Reddit r/SideProject | Post #1 (API showcase) |
| Wed | Twitter | Thread #1 (building in public) |
| Thu | Reddit r/chrome_extensions | Post #2 (extensions) |
| Fri | Twitter | Single tweet (CTA) |
| Sat | Reddit r/entrepreneur | Repost #1 with different title |
| Sun | Rest | - |

**Key:** Consistency > viral moments. One post per day, engage with replies.
